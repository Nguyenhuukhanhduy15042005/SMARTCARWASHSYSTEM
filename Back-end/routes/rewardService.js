const sql = require("mssql");
const { poolPromise } = require("../db");

const redeemRewardPoints = async (
  userId,
  bookingId,
  rewardCode,
  pointsToDeduct,
) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // 1. Kiểm tra điểm khả dụng
    const reqCheck = new sql.Request(transaction);
    reqCheck.input("userId", sql.Int, userId);
    const memberRes = await reqCheck.query(`
      SELECT CurrentPoints FROM MEMBER_PROFILE WITH (UPDLOCK) WHERE UserID = @userId
    `);

    if (memberRes.recordset.length === 0)
      throw new Error("Không tìm thấy hồ sơ thành viên.");
    const currentPoints = memberRes.recordset[0].CurrentPoints;

    if (currentPoints < pointsToDeduct) {
      await transaction.rollback();
      return { success: false, message: "Số điểm không đủ để đổi ưu đãi này." };
    }

    // 2. Trừ điểm
    const reqUpdate = new sql.Request(transaction);
    await reqUpdate
      .input("userId", sql.Int, userId)
      .input("points", sql.Int, pointsToDeduct).query(`
      UPDATE MEMBER_PROFILE SET CurrentPoints = CurrentPoints - @points WHERE UserID = @userId
    `);

    // 3. Ghi log lịch sử đổi điểm
    const reqLog = new sql.Request(transaction);
    await reqLog
      .input("userId", sql.Int, userId)
      .input("bookingId", sql.Int, bookingId || null)
      .input("points", sql.Int, pointsToDeduct).query(`
        INSERT INTO LOYALTY_TRANSACTION (UserID, BookingID, TransactionType, Points, CreatedDate)
        VALUES (@userId, @bookingId, 'Redeem', @points, GETDATE())
      `);

    await transaction.commit();
    return {
      success: true,
      message: `Đổi mã ${rewardCode} thành công!`,
      remainingPoints: currentPoints - pointsToDeduct,
    };
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {}
    console.error("[rewardService] Lỗi:", error);
    throw error;
  }
};

module.exports = { redeemRewardPoints };
