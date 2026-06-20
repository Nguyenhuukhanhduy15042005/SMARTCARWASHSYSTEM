const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../db");

const VALID_GROUP_BY = new Set(["day", "month"]);
const VALID_RANGES = new Set(["7d", "30d", "90d", "month", "year", "all"]);

function normalizeRange(value) {
  const range = String(value || "30d").toLowerCase();
  return VALID_RANGES.has(range) ? range : "30d";
}

function normalizeGroupBy(value) {
  const groupBy = String(value || "day").toLowerCase();
  return VALID_GROUP_BY.has(groupBy) ? groupBy : "day";
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

function periodSelect(alias, column, groupBy) {
  const target = `${alias}.${column}`;

  if (groupBy === "month") {
    return `CONVERT(varchar(7), ${target}, 120)`;
  }

  return `CONVERT(varchar(10), ${target}, 120)`;
}

function toNumber(value) {
  return Number(value || 0);
}

const BOOKING_STATUS = {
  1: "Chờ duyệt",
  2: "Đã xác nhận",
  3: "Đang làm dịch vụ",
  4: "Hoàn thành",
  5: "Đã hủy",
};

function mapBookingStatus(status) {
  const statusNumber = Number(status);
  return BOOKING_STATUS[statusNumber] || "Không xác định";
}

async function querySummary(pool, range) {
  const bookingFilter = buildDateFilter("b", "BookingDate", range);
  const paymentFilter = buildDateFilter("p", "PaidAt", range);
  const feedbackFilter = buildDateFilter("f", "CreatedDate", range);
  const loyaltyFilter = buildDateFilter("lt", "CreatedDate", range);

  const request = pool.request();
  const result = await request.query(`
    SELECT
      (SELECT COUNT(*) FROM BOOKING b WHERE 1 = 1 ${bookingFilter}) AS TotalBookings,
      (SELECT COUNT(*) FROM BOOKING b WHERE 1 = 1 ${bookingFilter} AND b.Status = 4) AS CompletedBookings,
      (SELECT COUNT(*) FROM BOOKING b WHERE 1 = 1 ${bookingFilter} AND b.Status = 5) AS CancelledBookings,
      (SELECT COUNT(*) FROM BOOKING b WHERE 1 = 1 ${bookingFilter} AND b.Status NOT IN (4, 5)) AS OtherBookings,
      (SELECT COUNT(*) FROM PAYMENT p WHERE 1 = 1 ${paymentFilter}) AS TotalPayments,
      (SELECT ISNULL(SUM(p.Amount), 0) FROM PAYMENT p WHERE 1 = 1 ${paymentFilter}) AS TotalRevenue,
      (SELECT ISNULL(AVG(CAST(f.Rating AS FLOAT)), 0) FROM FEEDBACK f WHERE 1 = 1 ${feedbackFilter}) AS AverageRating,
      (SELECT COUNT(*) FROM FEEDBACK f WHERE 1 = 1 ${feedbackFilter}) AS TotalFeedbacks,
      (SELECT ISNULL(SUM(CASE WHEN lt.TransactionType = 'Accumulate' THEN lt.Points ELSE 0 END), 0) FROM LOYALTY_TRANSACTION lt WHERE 1 = 1 ${loyaltyFilter}) AS PointsEarned,
      (SELECT ISNULL(SUM(CASE WHEN lt.TransactionType = 'Redeem' THEN lt.Points ELSE 0 END), 0) FROM LOYALTY_TRANSACTION lt WHERE 1 = 1 ${loyaltyFilter}) AS PointsRedeemed
  `);

  const row = result.recordset[0] || {};

  return {
    totalBookings: toNumber(row.TotalBookings),
    completedBookings: toNumber(row.CompletedBookings),
    cancelledBookings: toNumber(row.CancelledBookings),
    otherBookings: toNumber(row.OtherBookings),
    totalPayments: toNumber(row.TotalPayments),
    totalRevenue: toNumber(row.TotalRevenue),
    averageRating: Number(Number(row.AverageRating || 0).toFixed(2)),
    totalFeedbacks: toNumber(row.TotalFeedbacks),
    pointsEarned: toNumber(row.PointsEarned),
    pointsRedeemed: toNumber(row.PointsRedeemed),
  };
}

async function queryRevenueTrend(pool, range, groupBy) {
  const paymentFilter = buildDateFilter("p", "PaidAt", range);
  const period = periodSelect("p", "PaidAt", groupBy);

  const result = await pool.request().query(`
    SELECT
      ${period} AS Period,
      COUNT(p.PaymentID) AS PaymentCount,
      ISNULL(SUM(p.Amount), 0) AS Revenue
    FROM PAYMENT p
    WHERE p.PaidAt IS NOT NULL ${paymentFilter}
    GROUP BY ${period}
    ORDER BY Period ASC
  `);

  return result.recordset.map((row) => ({
    period: row.Period,
    paymentCount: toNumber(row.PaymentCount),
    revenue: toNumber(row.Revenue),
  }));
}

async function queryBookingTrend(pool, range, groupBy) {
  const bookingFilter = buildDateFilter("b", "BookingDate", range);
  const period = periodSelect("b", "BookingDate", groupBy);

  const result = await pool.request().query(`
    SELECT
      ${period} AS Period,
      COUNT(b.BookingID) AS BookingCount,
      ISNULL(SUM(b.TotalPrice), 0) AS GrossAmount,
      ISNULL(SUM(b.FinalPrice), 0) AS FinalAmount
    FROM BOOKING b
    WHERE b.BookingDate IS NOT NULL ${bookingFilter}
    GROUP BY ${period}
    ORDER BY Period ASC
  `);

  return result.recordset.map((row) => ({
    period: row.Period,
    bookingCount: toNumber(row.BookingCount),
    grossAmount: toNumber(row.GrossAmount),
    finalAmount: toNumber(row.FinalAmount),
  }));
}

async function queryBookingStatus(pool, range) {
  const bookingFilter = buildDateFilter("b", "BookingDate", range);

  const result = await pool.request().query(`
    SELECT
      b.Status AS StatusCode,
      COUNT(*) AS Total
    FROM BOOKING b
    WHERE 1 = 1 ${bookingFilter}
    GROUP BY b.Status
    ORDER BY b.Status ASC
  `);

  return result.recordset.map((row) => ({
    statusCode: toNumber(row.StatusCode),
    status: mapBookingStatus(row.StatusCode),
    total: toNumber(row.Total),
  }));
}

async function queryServiceUsage(pool, range) {
  const bookingFilter = buildDateFilter("b", "BookingDate", range);

  const result = await pool.request().query(`
    SELECT TOP 10
      s.ServiceID,
      s.ServiceName,
      COUNT(bd.DetailID) AS UsageCount,
      ISNULL(SUM(bd.PriceAtBooking), 0) AS Revenue
    FROM BOOKING_DETAIL bd
    INNER JOIN BOOKING b ON b.BookingID = bd.BookingID
    INNER JOIN SERVICE s ON s.ServiceID = bd.ServiceID
    WHERE 1 = 1 ${bookingFilter}
    GROUP BY s.ServiceID, s.ServiceName
    ORDER BY UsageCount DESC, Revenue DESC
  `);

  return result.recordset.map((row) => ({
    serviceId: row.ServiceID,
    serviceName: row.ServiceName,
    usageCount: toNumber(row.UsageCount),
    revenue: toNumber(row.Revenue),
  }));
}

async function queryVehicleTypeUsage(pool, range) {
  const bookingFilter = buildDateFilter("b", "BookingDate", range);

  const result = await pool.request().query(`
    SELECT
      ISNULL(NULLIF(LTRIM(RTRIM(b.VehicleType)), ''), 'Unknown') AS VehicleType,
      COUNT(*) AS Total
    FROM BOOKING b
    WHERE 1 = 1 ${bookingFilter}
    GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(b.VehicleType)), ''), 'Unknown')
    ORDER BY Total DESC
  `);

  return result.recordset.map((row) => ({
    vehicleType: row.VehicleType,
    total: toNumber(row.Total),
  }));
}

async function queryLoyaltyUsage(pool, range, groupBy) {
  const loyaltyFilter = buildDateFilter("lt", "CreatedDate", range);
  const period = periodSelect("lt", "CreatedDate", groupBy);

  const result = await pool.request().query(`
    SELECT
      ${period} AS Period,
      ISNULL(SUM(CASE WHEN lt.TransactionType = 'Accumulate' THEN lt.Points ELSE 0 END), 0) AS PointsEarned,
      ISNULL(SUM(CASE WHEN lt.TransactionType = 'Redeem' THEN lt.Points ELSE 0 END), 0) AS PointsRedeemed,
      COUNT(CASE WHEN lt.TransactionType = 'Accumulate' THEN 1 END) AS AccumulateCount,
      COUNT(CASE WHEN lt.TransactionType = 'Redeem' THEN 1 END) AS RedeemCount
    FROM LOYALTY_TRANSACTION lt
    WHERE lt.CreatedDate IS NOT NULL ${loyaltyFilter}
    GROUP BY ${period}
    ORDER BY Period ASC
  `);

  return result.recordset.map((row) => ({
    period: row.Period,
    pointsEarned: toNumber(row.PointsEarned),
    pointsRedeemed: toNumber(row.PointsRedeemed),
    accumulateCount: toNumber(row.AccumulateCount),
    redeemCount: toNumber(row.RedeemCount),
  }));
}

async function queryPromotionUsage(pool, range) {
  const acquiredFilter = buildDateFilter("mp", "AcquiredDate", range);

  const result = await pool.request().query(`
    SELECT TOP 10
      p.PromotionID,
      p.PromoName,
      p.DiscountPercent,
      COUNT(mp.MemberPromoID) AS WalletCount,
      SUM(CASE WHEN mp.IsUsed = 1 THEN 1 ELSE 0 END) AS UsedCount,
      SUM(CASE WHEN mp.IsUsed = 0 THEN 1 ELSE 0 END) AS UnusedCount
    FROM MEMBER_PROMOTION mp
    INNER JOIN PROMOTION p ON p.PromotionID = mp.PromotionID
    WHERE 1 = 1 ${acquiredFilter}
    GROUP BY p.PromotionID, p.PromoName, p.DiscountPercent
    ORDER BY WalletCount DESC, UsedCount DESC
  `);

  return result.recordset.map((row) => ({
    promotionId: row.PromotionID,
    promoName: row.PromoName,
    discountPercent: toNumber(row.DiscountPercent),
    walletCount: toNumber(row.WalletCount),
    usedCount: toNumber(row.UsedCount),
    unusedCount: toNumber(row.UnusedCount),
  }));
}

async function queryFeedbackStats(pool, range) {
  const feedbackFilter = buildDateFilter("f", "CreatedDate", range);

  const ratingDistributionResult = await pool.request().query(`
    SELECT
      f.Rating,
      COUNT(*) AS Total
    FROM FEEDBACK f
    WHERE f.Rating IS NOT NULL ${feedbackFilter}
    GROUP BY f.Rating
    ORDER BY f.Rating ASC
  `);

  const latestFeedbackResult = await pool.request().query(`
    SELECT TOP 5
      f.FeedbackID,
      f.Rating,
      f.Comment,
      f.CreatedDate,
      b.BookingID,
      u.FullName
    FROM FEEDBACK f
    LEFT JOIN BOOKING b ON b.BookingID = f.BookingID
    LEFT JOIN [USER] u ON u.UserID = b.CustomerID
    WHERE 1 = 1 ${feedbackFilter}
    ORDER BY f.CreatedDate DESC, f.FeedbackID DESC
  `);

  return {
    ratingDistribution: ratingDistributionResult.recordset.map((row) => ({
      rating: toNumber(row.Rating),
      total: toNumber(row.Total),
    })),
    latest: latestFeedbackResult.recordset.map((row) => ({
      feedbackId: row.FeedbackID,
      bookingId: row.BookingID,
      fullName: row.FullName || "Khách hàng",
      rating: toNumber(row.Rating),
      comment: row.Comment || "",
      createdDate: row.CreatedDate,
    })),
  };
}

// GET /api/analytics/dashboard?range=30d&groupBy=day
router.get("/dashboard", async (req, res) => {
  try {
    const range = normalizeRange(req.query.range);
    const groupBy = normalizeGroupBy(req.query.groupBy);
    const pool = await poolPromise;

    const [
      summary,
      revenueTrend,
      bookingTrend,
      bookingStatus,
      serviceUsage,
      vehicleTypeUsage,
      loyaltyUsage,
      promotionUsage,
      feedback,
    ] = await Promise.all([
      querySummary(pool, range),
      queryRevenueTrend(pool, range, groupBy),
      queryBookingTrend(pool, range, groupBy),
      queryBookingStatus(pool, range),
      queryServiceUsage(pool, range),
      queryVehicleTypeUsage(pool, range),
      queryLoyaltyUsage(pool, range, groupBy),
      queryPromotionUsage(pool, range),
      queryFeedbackStats(pool, range),
    ]);

    return res.json({
      meta: {
        range,
        groupBy,
        generatedAt: new Date().toISOString(),
      },
      summary,
      revenueTrend,
      bookingTrend,
      bookingStatus,
      serviceUsage,
      vehicleTypeUsage,
      loyaltyUsage,
      promotionUsage,
      feedback,
    });
  } catch (err) {
    console.error("GET /api/analytics/dashboard error:", err);
    return res.status(500).json({
      message: "Lỗi khi tải dữ liệu analytics dashboard",
      error: err.message,
    });
  }
});

// Endpoint nhỏ để FE test nhanh tổng quan nếu cần.
// GET /api/analytics/summary?range=30d
router.get("/summary", async (req, res) => {
  try {
    const range = normalizeRange(req.query.range);
    const pool = await poolPromise;
    const summary = await querySummary(pool, range);

    return res.json({
      meta: {
        range,
        generatedAt: new Date().toISOString(),
      },
      summary,
    });
  } catch (err) {
    console.error("GET /api/analytics/summary error:", err);
    return res.status(500).json({
      message: "Lỗi khi tải tổng quan analytics",
      error: err.message,
    });
  }
});

module.exports = router;
