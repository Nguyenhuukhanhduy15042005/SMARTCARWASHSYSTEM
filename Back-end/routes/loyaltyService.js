// Back-end/routes/loyaltyService.js
// NOTE: Logic cộng điểm chính đã nằm trong booking.js (processBookingStatusChange)
// File này chỉ export hàm helper nếu cần dùng ở nơi khác

const sql = require("mssql");
const { poolPromise } = require("../db");

/**
 * Tính điểm và cập nhật MEMBER_PROFILE + LOYALTY_TRANSACTION
 * Được gọi từ booking.js khi status chuyển sang 4 (Hoàn thành)
 *
 * Schema thực tế (smartcarwash_final_merged.sql):
 *   MEMBER_PROFILE: UserID, TierID, CurrentPoints, AccumulatedPoints, JoinDate
 *   LOYALTY_TIER:   TierID, TierName, RequiredPoints, DiscountRate, BookingWindow
 *   LOYALTY_TRANSACTION: TransactionID, UserID, BookingID, TransactionType, Points, CreatedDate
 *
 * @param {number} userId         - UserID của khách hàng
 * @param {number} bookingId      - BookingID vừa hoàn thành
 * @param {number} paymentAmount  - FinalPrice của booking (VNĐ)
 */
const processLoyaltyPoints = async (userId, bookingId, paymentAmount) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    // 1. Tính điểm: 10,000đ = 1 điểm
    const earnedPoints = Math.floor(paymentAmount / 10000);
    if (earnedPoints <= 0) {
      return {
        success: true,
        earnedPoints: 0,
        message: "Không đủ điều kiện cộng điểm",
      };
    }

    await transaction.begin();
    const req = new sql.Request(transaction);

    // 2. Kiểm tra đã ghi điểm cho booking này chưa (tránh double-insert)
    req.input("bookingId", sql.Int, bookingId);
    const dupCheck = await req.query(`
      SELECT TransactionID FROM LOYALTY_TRANSACTION
      WHERE BookingID = @bookingId AND TransactionType = 'Accumulate'
    `);

    if (dupCheck.recordset.length > 0) {
      await transaction.rollback();
      return {
        success: true,
        earnedPoints: 0,
        message: "Điểm đã được ghi trước đó",
      };
    }

    // 3. Lấy thông tin điểm hiện tại
    const req2 = new sql.Request(transaction);
    req2.input("userId", sql.Int, userId);
    const memberRes = await req2.query(`
      SELECT UserID, TierID, CurrentPoints, AccumulatedPoints
      FROM MEMBER_PROFILE WITH (UPDLOCK)
      WHERE UserID = @userId
    `);

    let newAccumulatedPoints = earnedPoints;

    if (memberRes.recordset.length === 0) {
      // Chưa có profile → tạo mới với tier Bronze (TierID = 1)
      const req3 = new sql.Request(transaction);
      await req3
        .input("userId", sql.Int, userId)
        .input("points", sql.Int, earnedPoints).query(`
          INSERT INTO MEMBER_PROFILE (UserID, TierID, CurrentPoints, AccumulatedPoints, JoinDate)
          VALUES (@userId, 1, @points, @points, GETDATE())
        `);
    } else {
      newAccumulatedPoints =
        Number(memberRes.recordset[0].AccumulatedPoints || 0) + earnedPoints;

      // Cập nhật điểm
      const req4 = new sql.Request(transaction);
      await req4
        .input("userId", sql.Int, userId)
        .input("points", sql.Int, earnedPoints).query(`
          UPDATE MEMBER_PROFILE
          SET CurrentPoints     = ISNULL(CurrentPoints, 0)     + @points,
              AccumulatedPoints = ISNULL(AccumulatedPoints, 0) + @points
          WHERE UserID = @userId
        `);
    }

    // 4. Xét hạng tự động theo LOYALTY_TIER trong DB (không hardcode)
    const req5 = new sql.Request(transaction);
    const tierRes = await req5.query(`
      SELECT TierID, RequiredPoints
      FROM LOYALTY_TIER
      ORDER BY RequiredPoints ASC
    `);

    let newTierId = 1; // Bronze mặc định
    for (const tier of tierRes.recordset) {
      if (newAccumulatedPoints >= tier.RequiredPoints) {
        newTierId = tier.TierID;
      }
    }

    // Cập nhật hạng mới
    const req6 = new sql.Request(transaction);
    await req6
      .input("userId", sql.Int, userId)
      .input("tierId", sql.Int, newTierId)
      .query(
        `UPDATE MEMBER_PROFILE SET TierID = @tierId WHERE UserID = @userId`,
      );

    // 5. Ghi vào LOYALTY_TRANSACTION
    const req7 = new sql.Request(transaction);
    await req7
      .input("userId", sql.Int, userId)
      .input("bookingId", sql.Int, bookingId)
      .input("points", sql.Int, earnedPoints).query(`
        INSERT INTO LOYALTY_TRANSACTION (UserID, BookingID, TransactionType, Points, CreatedDate)
        VALUES (@userId, @bookingId, 'Accumulate', @points, GETDATE())
      `);

    await transaction.commit();

    return {
      success: true,
      earnedPoints,
      newTierId,
      message: `Cộng ${earnedPoints} điểm thành công`,
    };
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {}
    console.error("[processLoyaltyPoints]", error);
    throw error;
  }
};

module.exports = { processLoyaltyPoints };
