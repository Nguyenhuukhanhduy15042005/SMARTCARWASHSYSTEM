const sql = require("mssql");
const { poolPromise } = require("../db");

// Trọng thêm: Định nghĩa các API Controller cho module Loyalty (Hồ sơ tích điểm, Lịch sử giao dịch, Đổi quà)
// Đường dẫn cùng thư mục routes
const { redeemRewardPoints, getMemberVouchers } = require("./rewardService");

// ─────────────────────────────────────────────────────────────────────────────
// API 1: GET /api/loyalty/profile?userId=...
// ─────────────────────────────────────────────────────────────────────────────
const getLoyaltyProfile = async (req, res) => {
  try {
    const userId = req.query.userId || 12;
    const pool = await poolPromise;

    const result = await pool.request().input("userId", sql.Int, userId).query(`
        SELECT
          u.UserID,
          u.FullName,
          u.PhoneNumber,
          u.Email,
          COALESCE(mp.CurrentPoints,     0)          AS CurrentPoints,
          COALESCE(mp.AccumulatedPoints, 0)          AS AccumulatedPoints,
          COALESCE(lt.TierName, N'Bronze')           AS TierName,
          COALESCE(lt.DiscountRate,      0)          AS DiscountRate,
          COALESCE(lt.RequiredPoints,    0)          AS RequiredPoints,
          COALESCE(lt.BookingWindow,     1)          AS BookingWindow
        FROM [USER] u
        LEFT JOIN MEMBER_PROFILE mp ON u.UserID  = mp.UserID
        LEFT JOIN LOYALTY_TIER   lt ON mp.TierID = lt.TierID
        WHERE u.UserID = @userId
      `);

    if (!result.recordset.length) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy hồ sơ thành viên" });
    }

    res.status(200).json(result.recordset[0]);
  } catch (error) {
    console.error("[getLoyaltyProfile]", error);
    res.status(500).json({ message: "Lỗi Server Backend: " + error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// API 2: GET /api/loyalty/transactions?customerId=...
// ─────────────────────────────────────────────────────────────────────────────
const getLoyaltyTransactions = async (req, res) => {
  try {
    const userId = req.query.customerId || req.query.userId || 12;
    const pool = await poolPromise;

    const result = await pool.request().input("userId", sql.Int, userId).query(`
        SELECT
          lt.TransactionID,
          lt.TransactionType,
          lt.Points,
          lt.CreatedDate,
          b.BookingID,
          b.LicensePlate,
          b.VehicleType,
          b.FinalPrice   AS price,
          b.TotalPrice,
          b.Status,
          b.BookingDate,
          (
            SELECT TOP 1 s.ServiceName
            FROM BOOKING_DETAIL bd
            INNER JOIN SERVICE s ON bd.ServiceID = s.ServiceID
            WHERE bd.BookingID = b.BookingID
          ) AS ServiceName
        FROM LOYALTY_TRANSACTION lt
        LEFT JOIN BOOKING b ON lt.BookingID = b.BookingID
        WHERE lt.UserID = @userId
        ORDER BY lt.CreatedDate DESC
      `);

    const transactions = result.recordset.map((row) => ({
      id: row.BookingID || row.TransactionID,
      licensePlate: row.LicensePlate || "N/A",
      date: row.CreatedDate || row.BookingDate || null,
      price: row.price || row.TotalPrice || 0,
      points: row.Points,
      status: row.Status || null,

      TransactionID: row.TransactionID,
      TransactionType: row.TransactionType,
      Points: row.Points,
      CreatedDate: row.CreatedDate,
      BookingID: row.BookingID || null,
      LicensePlate: row.LicensePlate || "N/A",
      VehicleType: row.VehicleType || "N/A",
      FinalPrice: row.price || 0,
      TotalPrice: row.TotalPrice || 0,
      Status: row.Status || null,
      BookingDate: row.BookingDate || null,
      ServiceName: row.ServiceName || "Dịch vụ rửa xe",
    }));

    res.status(200).json(transactions);
  } catch (error) {
    console.error("[getLoyaltyTransactions]", error);
    res.status(500).json({ message: "Lỗi Server Backend: " + error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// API 3: POST /api/loyalty/redeem (HÀM ĐÃ ĐƯỢC KHÔI PHỤC VÀ SỬA LỖI)
// ─────────────────────────────────────────────────────────────────────────────
const handleRedeem = async (req, res) => {
  try {
    // 1. ĐÃ BỔ SUNG promotionId Ở ĐÂY
    const { userId, bookingId, RewardCode, RewardPointsUsed, promotionId } =
      req.body;

    if (!userId || !RewardCode || !RewardPointsUsed) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin đổi quà bắt buộc." });
    }

    // 2. ĐÃ TRUYỀN THÊM promotionId VÀO HÀM Ở ĐÂY
    const result = await redeemRewardPoints(
      userId,
      bookingId,
      RewardCode,
      RewardPointsUsed,
      promotionId,
    );

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error("[handleRedeem]", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi nội bộ hệ thống: " + error.message,
    });
  }
};

// API mới: Lấy danh sách voucher khách đã đổi từ MEMBER_PROMOTION
const getMyVouchers = async (req, res) => {
  try {
    const userId = Number(req.query.userId || 12);

    if (!userId) {
      return res.status(400).json({
        message: "Thiếu userId hoặc userId không hợp lệ.",
      });
    }

    const vouchers = await getMemberVouchers(userId);
    return res.status(200).json(vouchers);
  } catch (error) {
    console.error("[getMyVouchers]", error);
    return res.status(500).json({
      message: "Không tải được ví voucher: " + error.message,
    });
  }
};

module.exports = {
  getLoyaltyProfile,
  getLoyaltyTransactions,
  handleRedeem,
  getMyVouchers, // Export hàm mới
};
