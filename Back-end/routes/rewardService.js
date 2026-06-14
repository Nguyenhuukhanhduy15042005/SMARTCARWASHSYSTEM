const sql = require("mssql");
const { poolPromise } = require("../db");

const redeemRewardPoints = async (
  userId,
  bookingId,
  rewardCode,
  pointsToDeduct,
  promotionId
) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // 1. Validate promotion
    const reqPromotion = new sql.Request(transaction);
    const promoRes = await reqPromotion
      .input("promotionId", sql.Int, promotionId)
      .query(`
        SELECT PromotionID, PromoName, DiscountPercent, EndDate
        FROM PROMOTION
        WHERE PromotionID = @promotionId
          AND (EndDate IS NULL OR EndDate >= GETDATE())
      `);

    if (promoRes.recordset.length === 0) {
      await transaction.rollback();
      return {
        success: false,
        message: "Voucher không tồn tại hoặc đã hết hạn.",
      };
    }

    // 2. Check điểm member
    const reqCheck = new sql.Request(transaction);
    const memberRes = await reqCheck
      .input("userId", sql.Int, userId)
      .query(`
        SELECT CurrentPoints
        FROM MEMBER_PROFILE WITH (UPDLOCK)
        WHERE UserID = @userId
      `);

    if (memberRes.recordset.length === 0) {
      await transaction.rollback();
      return {
        success: false,
        message: "Không tìm thấy hồ sơ thành viên.",
      };
    }

    const currentPoints = Number(memberRes.recordset[0].CurrentPoints || 0);
    const points = Number(pointsToDeduct || 0);

    if (points <= 0) {
      await transaction.rollback();
      return {
        success: false,
        message: "Số điểm đổi voucher không hợp lệ.",
      };
    }

    if (currentPoints < points) {
      await transaction.rollback();
      return {
        success: false,
        message: "Số điểm không đủ để đổi ưu đãi này.",
      };
    }

    // 3. Trừ điểm
    const reqUpdate = new sql.Request(transaction);
    await reqUpdate
      .input("userId", sql.Int, userId)
      .input("points", sql.Int, points)
      .query(`
        UPDATE MEMBER_PROFILE
        SET CurrentPoints = CurrentPoints - @points
        WHERE UserID = @userId
      `);
    // 4. Lưu voucher vào ví member
    const reqWallet = new sql.Request(transaction);
    await reqWallet
      .input("userId", sql.Int, userId)
      .input("promotionId", sql.Int, promotionId)
      .query(`
        INSERT INTO MEMBER_PROMOTION (UserID, PromotionID, IsUsed)
        VALUES (@userId, @promotionId, 0)
      `);
    // 5. Ghi log đổi điểm
    const reqLog = new sql.Request(transaction);
    await reqLog
      .input("userId", sql.Int, userId)
      .input("bookingId", sql.Int, bookingId || null)
      .input("points", sql.Int, points)
      .query(`
        INSERT INTO LOYALTY_TRANSACTION
          (UserID, BookingID, TransactionType, Points, CreatedDate)
        VALUES
          (@userId, @bookingId, 'Redeem', @points, GETDATE())
      `);

    await transaction.commit();

    return {
      success: true,
      message: `Đổi mã ${rewardCode} thành công!`,
      promotionId,
      remainingPoints: currentPoints - points,
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