const sql = require("mssql");
// Require file cấu hình pool kết nối db của nhóm bạn
const { poolPromise } = require("../db");

// Bảng cấu hình mốc nâng hạng
const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 1000,
  GOLD: 5000,
  PLATINUM: 10000,
};

// Hàm xác định hạng mới dựa trên tổng điểm
const determineTier = (totalAccumulatedPoints) => {
  if (totalAccumulatedPoints >= TIER_THRESHOLDS.PLATINUM) return "Platinum";
  if (totalAccumulatedPoints >= TIER_THRESHOLDS.GOLD) return "Gold";
  if (totalAccumulatedPoints >= TIER_THRESHOLDS.SILVER) return "Silver";
  return "Bronze";
};

/**
 * Hàm tự động cộng điểm và xét hạng (Thắng)
 * @param {number} userId - Mã người dùng
 * @param {number} bookingId - Mã đơn hàng vừa hoàn tất
 * @param {number} paymentAmount - Tổng tiền thanh toán (VNĐ)
 */
const processLoyaltyPoints = async (userId, bookingId, paymentAmount) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    // 1. Tính toán số điểm nhận được (1000đ = 1 điểm)
    const earnedPoints = Math.floor(paymentAmount / 1000);
    if (earnedPoints <= 0)
      return { success: true, message: "Không có điểm cộng thêm" };

    // 2. Bắt đầu Transaction để bảo vệ dữ liệu
    await transaction.begin();
    const request = new sql.Request(transaction);

    // 3. Lấy thông tin điểm hiện tại của Member
    request.input("userId", sql.Int, userId);
    const memberResult = await request.query(`
            SELECT CurrentPoints, TotalAccumulatedPoints, Tier 
            FROM MEMBER_PROFILE WITH (UPDLOCK) -- Khóa row để tránh xung đột dữ liệu (Race condition)
            WHERE UserID = @userId
        `);

    if (memberResult.recordset.length === 0) {
      throw new Error("Không tìm thấy thông tin thành viên");
    }

    const member = memberResult.recordset[0];
    const newCurrentPoints = member.CurrentPoints + earnedPoints;
    const newTotalAccumulatedPoints =
      member.TotalAccumulatedPoints + earnedPoints;

    // 4. Xét hạng tự động (Task 4)
    const newTier = determineTier(newTotalAccumulatedPoints);
    const isUpgraded = newTier !== member.Tier;

    // 5. Cập nhật bảng MEMBER_PROFILE
    request.input("newCurrentPoints", sql.Int, newCurrentPoints);
    request.input("newTotalPoints", sql.Int, newTotalAccumulatedPoints);
    request.input("newTier", sql.NVarChar, newTier);

    await request.query(`
            UPDATE MEMBER_PROFILE 
            SET CurrentPoints = @newCurrentPoints, 
                TotalAccumulatedPoints = @newTotalPoints, 
                Tier = @newTier,
                UpdatedAt = GETDATE()
            WHERE UserID = @userId
        `);

    // 6. Ghi lại lịch sử giao dịch vào LOYALTY_TRANSACTION (Task 3)
    request.input("bookingId", sql.Int, bookingId);
    request.input("points", sql.Int, earnedPoints);
    request.input(
      "desc",
      sql.NVarChar,
      `Tích điểm từ hóa đơn đặt lịch #${bookingId}`,
    );

    await request.query(`
            INSERT INTO LOYALTY_TRANSACTION (UserID, BookingID, Points, TransactionType, Description, CreatedAt)
            VALUES (@userId, @bookingId, @points, 'EARN', @desc, GETDATE())
        `);

    // 7. Hoàn tất Transaction
    await transaction.commit();

    return {
      success: true,
      earnedPoints,
      newTier,
      isUpgraded,
      message: isUpgraded
        ? `Chúc mừng! Khách hàng đã được thăng hạng lên ${newTier}.`
        : "Cộng điểm thành công.",
    };
  } catch (error) {
    // Nếu có bất kỳ lỗi nào (Code hoặc Database), Rollback toàn bộ
    if (transaction) await transaction.rollback();
    console.error("Lỗi trong quá trình tính điểm Loyalty:", error);
    throw error;
  }
};

module.exports = {
  processLoyaltyPoints,
};
