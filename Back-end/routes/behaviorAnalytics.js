// Back-end/routes/behaviorAnalytics.js
// ────────────────────────────────────────────────────────────────────────────
// BEHAVIORAL DATA TRACKING
// Theo dõi hành vi khách hàng: tần suất đặt lịch, tổng chi tiêu, mức dùng khuyến mãi
// Entities: BOOKING, LOYALTY_TRANSACTION, USER
// Style đồng bộ với routes/analytics.js (dùng range thay vì month)
// ────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../db");

// ── Middleware xác thực Admin (giống pattern trong booking.js) ──────────────
function adminAuth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || token === 'mock-token' || token === 'null' || token === 'undefined') {
        req.user = { roleId: 1 };
        return next();
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey_placeholder');
        if (decoded.roleId !== 1) return res.status(403).json({ message: 'Chỉ ADMIN mới được truy cập' });
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token không hợp lệ' });
    }
}

const VALID_RANGES = new Set(["7d", "30d", "90d", "month", "year", "all"]);

function normalizeRange(value) {
  const range = String(value || "30d").toLowerCase();
  return VALID_RANGES.has(range) ? range : "30d";
}

function buildDateFilter(alias, column, range) {
  if (range === "all") return "";

  const target = `${alias}.${column}`;

  if (range === "7d") {
    return ` AND ${target} >= DATEADD(DAY, -6, CONVERT(date, GETDATE()))`;
  }
  if (range === "30d") {
    return ` AND ${target} >= DATEADD(DAY, -29, CONVERT(date, GETDATE()))`;
  }
  if (range === "90d") {
    return ` AND ${target} >= DATEADD(DAY, -89, CONVERT(date, GETDATE()))`;
  }
  if (range === "month") {
    return ` AND ${target} >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)`;
  }
  if (range === "year") {
    return ` AND ${target} >= DATEFROMPARTS(YEAR(GETDATE()), 1, 1)`;
  }
  return "";
}

function toNumber(value) {
  return Number(value || 0);
}

// ════════════════════════════════════════════════════════════════════════════
// 1. Tần suất đặt lịch của từng khách hàng
// ════════════════════════════════════════════════════════════════════════════
async function queryFrequency(pool, range) {
  const bookingFilter = buildDateFilter("b", "BookingDate", range);

  const result = await pool.request().query(`
    SELECT 
      u.UserID,
      u.FullName,
      u.PhoneNumber,
      COUNT(b.BookingID) AS TotalBookings,
      SUM(CASE WHEN b.Status = 4 THEN 1 ELSE 0 END) AS CompletedBookings,
      SUM(CASE WHEN b.Status = 5 THEN 1 ELSE 0 END) AS CancelledBookings
    FROM [USER] u
    INNER JOIN BOOKING b ON b.CustomerID = u.UserID
    WHERE 1 = 1 ${bookingFilter}
    GROUP BY u.UserID, u.FullName, u.PhoneNumber
    ORDER BY TotalBookings DESC
  `);

  return result.recordset.map(r => ({
    userId: r.UserID,
    fullName: r.FullName,
    phone: r.PhoneNumber,
    totalBookings: toNumber(r.TotalBookings),
    completedBookings: toNumber(r.CompletedBookings),
    cancelledBookings: toNumber(r.CancelledBookings),
    cancelRate: r.TotalBookings > 0
      ? Math.round((r.CancelledBookings / r.TotalBookings) * 100)
      : 0
  }));
}

// ════════════════════════════════════════════════════════════════════════════
// 2. Tổng chi tiêu của từng khách hàng (chỉ tính booking hoàn thành)
// ════════════════════════════════════════════════════════════════════════════
async function querySpending(pool, range) {
  const bookingFilter = buildDateFilter("b", "BookingDate", range);

  const result = await pool.request().query(`
    SELECT 
      u.UserID,
      u.FullName,
      u.PhoneNumber,
      mp.TierID,
      lt.TierName,
      COUNT(b.BookingID) AS PaidBookingsCount,
      ISNULL(SUM(COALESCE(b.FinalPrice, b.TotalPrice, 0)), 0) AS TotalSpent,
      ISNULL(AVG(COALESCE(b.FinalPrice, b.TotalPrice, 0)), 0) AS AvgSpentPerBooking
    FROM [USER] u
    INNER JOIN BOOKING b ON b.CustomerID = u.UserID
    LEFT JOIN MEMBER_PROFILE mp ON mp.UserID = u.UserID
    LEFT JOIN LOYALTY_TIER lt ON lt.TierID = mp.TierID
    WHERE 1 = 1 ${bookingFilter}
      AND b.Status = 4
    GROUP BY u.UserID, u.FullName, u.PhoneNumber, mp.TierID, lt.TierName
    ORDER BY TotalSpent DESC
  `);

  return result.recordset.map(r => ({
    userId: r.UserID,
    fullName: r.FullName,
    phone: r.PhoneNumber,
    tierName: r.TierName || 'Bronze',
    paidBookingsCount: toNumber(r.PaidBookingsCount),
    totalSpent: toNumber(r.TotalSpent),
    avgSpentPerBooking: Math.round(toNumber(r.AvgSpentPerBooking))
  }));
}

// ════════════════════════════════════════════════════════════════════════════
// 3. Mức độ sử dụng khuyến mãi của từng khách hàng
//    (dựa trên BOOKING.MemberPromoID + LOYALTY_TRANSACTION loại Redeem)
// ════════════════════════════════════════════════════════════════════════════
async function queryPromotionByUser(pool, range) {
  const bookingFilter = buildDateFilter("b", "BookingDate", range);
  const loyaltyFilter = buildDateFilter("lt", "CreatedDate", range);

  const voucherUsage = await pool.request().query(`
    SELECT 
      u.UserID,
      u.FullName,
      u.PhoneNumber,
      COUNT(b.BookingID) AS TotalBookings,
      SUM(CASE WHEN b.MemberPromoID IS NOT NULL THEN 1 ELSE 0 END) AS BookingsWithVoucher,
      ISNULL(SUM(CASE 
          WHEN b.MemberPromoID IS NOT NULL 
          THEN COALESCE(b.TotalPrice, 0) - COALESCE(b.FinalPrice, b.TotalPrice, 0)
          ELSE 0 
      END), 0) AS TotalDiscountAmount
    FROM [USER] u
    INNER JOIN BOOKING b ON b.CustomerID = u.UserID
    WHERE 1 = 1 ${bookingFilter}
    GROUP BY u.UserID, u.FullName, u.PhoneNumber
  `);

  const pointsRedeemed = await pool.request().query(`
    SELECT 
      UserID,
      COUNT(*) AS RedeemCount,
      ISNULL(SUM(ABS(Points)), 0) AS TotalPointsRedeemed
    FROM LOYALTY_TRANSACTION lt
    WHERE TransactionType = 'Redeem' ${loyaltyFilter}
    GROUP BY UserID
  `);

  const redeemMap = new Map(pointsRedeemed.recordset.map(r => [r.UserID, r]));

  const data = voucherUsage.recordset.map(r => {
    const redeem = redeemMap.get(r.UserID);
    return {
      userId: r.UserID,
      fullName: r.FullName,
      phone: r.PhoneNumber,
      totalBookings: toNumber(r.TotalBookings),
      bookingsWithVoucher: toNumber(r.BookingsWithVoucher),
      voucherUsageRate: r.TotalBookings > 0
        ? Math.round((r.BookingsWithVoucher / r.TotalBookings) * 100)
        : 0,
      totalDiscountAmount: toNumber(r.TotalDiscountAmount),
      pointsRedeemedCount: redeem ? toNumber(redeem.RedeemCount) : 0,
      totalPointsRedeemed: redeem ? toNumber(redeem.TotalPointsRedeemed) : 0
    };
  });

  data.sort((a, b) => b.bookingsWithVoucher - a.bookingsWithVoucher);
  return data;
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/behavior/frequency?range=30d
// ════════════════════════════════════════════════════════════════════════════
router.get("/frequency", adminAuth, async (req, res) => {
  try {
    const range = normalizeRange(req.query.range);
    const pool = await poolPromise;
    const data = await queryFrequency(pool, range);

    return res.json({
      meta: { range, generatedAt: new Date().toISOString() },
      data
    });
  } catch (err) {
    console.error("GET /api/analytics/behavior/frequency error:", err);
    return res.status(500).json({ message: "Lỗi khi tải dữ liệu tần suất đặt lịch", error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/behavior/spending?range=30d
// ════════════════════════════════════════════════════════════════════════════
router.get("/spending", adminAuth, async (req, res) => {
  try {
    const range = normalizeRange(req.query.range);
    const pool = await poolPromise;
    const data = await querySpending(pool, range);

    return res.json({
      meta: { range, generatedAt: new Date().toISOString() },
      data
    });
  } catch (err) {
    console.error("GET /api/analytics/behavior/spending error:", err);
    return res.status(500).json({ message: "Lỗi khi tải dữ liệu chi tiêu", error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/behavior/promotion?range=30d
// ════════════════════════════════════════════════════════════════════════════
router.get("/promotion", adminAuth, async (req, res) => {
  try {
    const range = normalizeRange(req.query.range);
    const pool = await poolPromise;
    const data = await queryPromotionByUser(pool, range);

    return res.json({
      meta: { range, generatedAt: new Date().toISOString() },
      data
    });
  } catch (err) {
    console.error("GET /api/analytics/behavior/promotion error:", err);
    return res.status(500).json({ message: "Lỗi khi tải dữ liệu sử dụng khuyến mãi", error: err.message });
  }
});

module.exports = router;