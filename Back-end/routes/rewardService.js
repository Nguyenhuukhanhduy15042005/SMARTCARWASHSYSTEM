const sql = require("mssql");
const { poolPromise } = require("../db");

// Trọng thêm: Viết logic đổi điểm lấy Voucher (MEMBER_PROMOTION) và lấy danh sách Voucher
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
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    // 1. Khóa promotion và lấy cấu hình thật từ DB.
    // Không tin số điểm do FE gửi lên.
    const reqPromotion = new sql.Request(transaction);
    const promoRes = await reqPromotion
      .input("promotionId", sql.Int, promotionId)
      .query(`
        SELECT
          PromotionID,
          PromoName,
          DiscountPercent,
          RequiredPoints,
          MaxRedemptions,
          EndDate
        FROM PROMOTION WITH (UPDLOCK, HOLDLOCK)
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

    const promotion = promoRes.recordset[0];
    const requiredPoints = Number(promotion.RequiredPoints || 0);
    const maxRedemptions = Number(promotion.MaxRedemptions || 1);

    if (
      !Number.isInteger(requiredPoints) ||
      requiredPoints < 0 ||
      !Number.isInteger(maxRedemptions) ||
      maxRedemptions < 1
    ) {
      await transaction.rollback();
      return {
        success: false,
        message: "Cấu hình voucher không hợp lệ.",
      };
    }

    // 2. Đếm tổng số lần member đã đổi voucher này.
    // Tính cả voucher đã dùng và chưa dùng.
    const reqRedemptionCount = new sql.Request(transaction);
    const redemptionCountRes = await reqRedemptionCount
      .input("userId", sql.Int, userId)
      .input("promotionId", sql.Int, promotionId)
      .query(`
        SELECT COUNT(*) AS RedeemedCount
        FROM MEMBER_PROMOTION WITH (UPDLOCK, HOLDLOCK)
        WHERE UserID = @userId
          AND PromotionID = @promotionId
      `);

    const redeemedCount = Number(
      redemptionCountRes.recordset[0]?.RedeemedCount || 0
    );

    if (redeemedCount >= maxRedemptions) {
      await transaction.rollback();
      return {
        success: false,
        message: `Bạn đã đổi voucher này đủ ${maxRedemptions} lần.`,
        redeemedCount,
        maxRedemptions,
      };
    }

    // 3. Khóa hồ sơ member và kiểm tra điểm.
    const reqCheck = new sql.Request(transaction);
    const memberRes = await reqCheck
      .input("userId", sql.Int, userId)
      .query(`
        SELECT CurrentPoints
        FROM MEMBER_PROFILE WITH (UPDLOCK, HOLDLOCK)
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

    if (currentPoints < requiredPoints) {
      await transaction.rollback();
      return {
        success: false,
        message: "Số điểm không đủ để đổi ưu đãi này.",
      };
    }

    // 4. Trừ đúng số điểm cấu hình trong PROMOTION.
    const reqUpdate = new sql.Request(transaction);
    await reqUpdate
      .input("userId", sql.Int, userId)
      .input("points", sql.Int, requiredPoints)
      .query(`
        UPDATE MEMBER_PROFILE
        SET CurrentPoints = CurrentPoints - @points
        WHERE UserID = @userId
      `);

    // 5. Lưu voucher vào ví member.
    const reqWallet = new sql.Request(transaction);
    await reqWallet
      .input("userId", sql.Int, userId)
      .input("promotionId", sql.Int, promotionId)
      .query(`
        INSERT INTO MEMBER_PROMOTION (UserID, PromotionID, IsUsed)
        VALUES (@userId, @promotionId, 0)
      `);

    // 6. Ghi log đổi điểm.
    const reqLog = new sql.Request(transaction);
    await reqLog
      .input("userId", sql.Int, userId)
      .input("bookingId", sql.Int, bookingId || null)
      .input("points", sql.Int, requiredPoints)
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
      redeemedCount: redeemedCount + 1,
      maxRedemptions,
      remainingPoints: currentPoints - requiredPoints,
    };
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {}

    console.error("[rewardService] Lỗi:", error);
    throw error;
  }
};

const getMemberVouchers = async (userId) => {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .query(`
      SELECT
        mp.MemberPromoID,
        mp.UserID,
        mp.PromotionID,
        mp.IsUsed,
        mp.AcquiredDate,
        p.PromoName,
        p.DiscountPercent,
        p.EndDate
      FROM MEMBER_PROMOTION mp
      INNER JOIN PROMOTION p ON p.PromotionID = mp.PromotionID
      WHERE mp.UserID = @userId
      ORDER BY mp.AcquiredDate DESC, mp.MemberPromoID DESC
    `);

  return result.recordset;
};

module.exports = { redeemRewardPoints, getMemberVouchers };