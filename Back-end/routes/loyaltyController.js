const sql = require("mssql");
const { poolPromise } = require("../db");

// API 1: Phục vụ axios.get('/users/profile?userId=...')
const getLoyaltyProfile = async (req, res) => {
  try {
    const userId = req.query.userId;
    const pool = await poolPromise;

    // Truy vấn bốc dữ liệu từ bảng MEMBER_PROFILE mà Thắng vừa Update
    const result = await pool.request().input("userId", sql.Int, userId).query(`
        SELECT 
          UserID, FullName, PhoneNumber, Email, 
          CurrentPoints, 
          TotalAccumulatedPoints AS AccumulatedPoints, 
          Tier AS TierName
        FROM MEMBER_PROFILE
        WHERE UserID = @userId
      `);

    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset[0]);
    } else {
      res.status(404).json({ message: "Không tìm thấy hồ sơ thành viên" });
    }
  } catch (error) {
    console.error("Lỗi lấy profile:", error);
    res.status(500).json({ message: "Lỗi Server Backend" });
  }
};

// API 2: Phục vụ axios.get('/bookings?customerId=...')
// Nâng cấp: Lấy trực tiếp từ bảng LOYALTY_TRANSACTION kết hợp BOOKING để chuẩn xác hơn
const getLoyaltyTransactions = async (req, res) => {
  try {
    const customerId = req.query.customerId;
    const pool = await poolPromise;

    // Lấy lịch sử giao dịch điểm bám sát vào bảng của Thắng
    const result = await pool.request().input("userId", sql.Int, customerId)
      .query(`
        SELECT 
          L.TransactionID as id,
          B.LicensePlate as licensePlate,
          L.CreatedAt as date,
          B.TotalPrice as price,
          L.Points as points,
          B.Status as status
        FROM LOYALTY_TRANSACTION L
        LEFT JOIN BOOKING B ON L.BookingID = B.BookingID
        WHERE L.UserID = @userId
        ORDER BY L.CreatedAt DESC
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Lỗi lấy lịch sử giao dịch:", error);
    res.status(500).json({ message: "Lỗi Server Backend" });
  }
};

module.exports = {
  getLoyaltyProfile,
  getLoyaltyTransactions,
};
