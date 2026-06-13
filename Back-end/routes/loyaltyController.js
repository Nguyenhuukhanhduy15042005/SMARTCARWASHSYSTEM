// Back-end/routes/loyaltyController.js
const sql = require("mssql");
const { poolPromise } = require("../db");

// ─────────────────────────────────────────────────────────────────────────────
// API 1: GET /api/loyalty/profile?userId=...
// Lấy thông tin hạng thành viên + điểm (đúng theo schema thực tế)
// ─────────────────────────────────────────────────────────────────────────────
const getLoyaltyProfile = async (req, res) => {
  try {
    const userId = req.query.userId || 12;
    const pool   = await poolPromise;

    const result = await pool.request()
      .input("userId", sql.Int, userId)
      .query(`
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
      return res.status(404).json({ message: "Không tìm thấy hồ sơ thành viên" });
    }

    res.status(200).json(result.recordset[0]);
  } catch (error) {
    console.error("[getLoyaltyProfile]", error);
    res.status(500).json({ message: "Lỗi Server Backend: " + error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// API 2: GET /api/loyalty/transactions?customerId=...
// Lấy lịch sử giao dịch điểm từ bảng LOYALTY_TRANSACTION (đúng schema)
// Bao gồm: EARN (cộng điểm rửa xe) + REDEEM (trừ điểm đổi voucher)
// Sắp xếp mới nhất lên đầu
// ─────────────────────────────────────────────────────────────────────────────
const getLoyaltyTransactions = async (req, res) => {
  try {
    const userId = req.query.customerId || req.query.userId || 12;
    const pool   = await poolPromise;

    const result = await pool.request()
      .input("userId", sql.Int, userId)
      .query(`
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

    // Format đúng theo cách frontend normalizedList đang đọc
    const transactions = result.recordset.map(row => ({
      // Field chữ thường (frontend normalizedList dùng)
      id:           row.BookingID    || row.TransactionID,
      licensePlate: row.LicensePlate || 'N/A',
      date:         row.CreatedDate  || row.BookingDate || null,
      price:        row.price        || row.TotalPrice  || 0,
      points:       row.Points,
      status:       row.Status       || null,

      // Field chữ hoa (để normalizedList fallback được)
      TransactionID:   row.TransactionID,
      TransactionType: row.TransactionType, // 'Accumulate' hoặc 'REDEEM'
      Points:          row.Points,
      CreatedDate:     row.CreatedDate,
      BookingID:       row.BookingID    || null,
      LicensePlate:    row.LicensePlate || 'N/A',
      VehicleType:     row.VehicleType  || 'N/A',
      FinalPrice:      row.price        || 0,
      TotalPrice:      row.TotalPrice   || 0,
      Status:          row.Status       || null,
      BookingDate:     row.BookingDate  || null,
      ServiceName:     row.ServiceName  || 'Dịch vụ rửa xe',
    }));

    res.status(200).json(transactions);
  } catch (error) {
    console.error("[getLoyaltyTransactions]", error);
    res.status(500).json({ message: "Lỗi Server Backend: " + error.message });
  }
};

module.exports = {
  getLoyaltyProfile,
  getLoyaltyTransactions,
};