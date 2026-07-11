const service = require('./paymentService');
const { sql, poolPromise } = require('../db');

/**
 * [1] getUserTier
 * Lấy hạng thành viên và trạng thái đặt cọc của user hiện tại.
 * - Đếm số lần hủy trong 30 ngày từ bảng BOOKING (Status=5)
 * - Gold/Platinum hủy >= 3 lần → forceDeposit = true → bắt cọc 10%
 * Output: { tierID, tierName, needDeposit, forceDeposit, cancelCount, forceDepositWarning }
 */
const getUserTier = async (req, res) => {
  try {
    const userId = req.user.userId;
    const tierID = await service.getUserTier(userId);
    const tierName = { 1: 'Bronze', 2: 'Silver', 3: 'Gold', 4: 'Platinum' }[tierID] || 'Bronze';

    // Đếm số lần hủy trong 30 ngày
    const pool = await poolPromise;
    const cancelResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT COUNT(*) AS CancelCount
        FROM BOOKING
        WHERE CustomerID = @userId
          AND Status = 5
          AND BookingDate >= DATEADD(DAY, -30, GETDATE())
      `);
    const cancelCount = cancelResult.recordset[0].CancelCount || 0;

    // Gold/Platinum hủy >= 3 lần → bắt cọc
    const forceDeposit = (tierID === 3 || tierID === 4) && cancelCount >= 3;
    const needDeposit = tierID === 1 || tierID === 2 || forceDeposit;

    res.json({
      tierID, tierName, needDeposit, forceDeposit, cancelCount,
      // Cảnh báo cho frontend hiển thị
      forceDepositWarning: forceDeposit
        ? `🚨 Do bạn đã hủy ${cancelCount} lần trong 30 ngày, hạng ${tierName} của bạn phải đặt cọc 10% cho lần đặt lịch này.`
        : null
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/**
 * [2] createPayment
 * Tạo giao dịch thanh toán mới.
 * - Nhận bookingId, method (vnpay/cash), amount từ request body
 * - Gọi service.createPayment để xử lý logic tạo payment và URL VNPay
 * Output: { payment, paymentUrl, tierID, depositOnly, forceDeposit, depositAmount, remainingAmount, fullAmount }
 */
const createPayment = async (req, res) => {
  try {
    const { bookingId, method, amount } = req.body;
    if (!bookingId || !method) return res.status(400).json({ message: 'Thiếu bookingId hoặc method' });
    const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const result = await service.createPayment({
      bookingId, method, amount,
      userId: req.user.userId,
      ipAddr
    });
    console.log('PaymentURL:', result.paymentUrl);
    res.status(201).json(result);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

/**
 * [3] vnpayReturn
 * Xử lý callback từ VNPay sau khi khách hoàn tất thanh toán.
 * - Không cần auth (VNPay redirect về, không có token)
 * - Thêm header bypass cảnh báo ngrok
 * - Redirect về frontend với status=success hoặc status=failed
 */
const vnpayReturn = async (req, res) => {
  try {
    const { isValid, paymentId } = await service.confirmVNPay(req.query);
    const redirectUrl = isValid
      ? `http://localhost:5173/payments/result?status=success&paymentId=${paymentId}`
      : `http://localhost:5173/payments/result?status=failed&paymentId=${paymentId}`;
    res.setHeader('ngrok-skip-browser-warning', 'true');
    res.redirect(redirectUrl);
  } catch (err) {
    res.redirect('http://localhost:5173/payments/result?status=failed');
  }
};

/**
 * [4] getPaymentHistory
 * Lấy lịch sử thanh toán của user hiện tại, có phân trang.
 * Query params: page, limit
 * Output: { data, total, page, limit }
 */
const getPaymentHistory = async (req, res) => {
  try {
    const result = await service.getPaymentHistory(req.user.userId, req.query);
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/**
 * [5] getRefundPreview
 * Xem trước thông tin hoàn tiền trước khi thực sự hủy booking.
 * Không thay đổi gì trong DB — chỉ tính toán và trả về thông tin.
 * Output: { refundPercent, refundAmount, cancelCount, hoursLeft, warning, originalAmount }
 */
const getRefundPreview = async (req, res) => {
  try {
    const result = await service.getRefundPreview(Number(req.params.id));
    res.json(result);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

/**
 * [6] refundPayment
 * Thực hiện hủy booking và hoàn tiền.
 * Gọi service.refundPayment để xử lý toàn bộ logic:
 * hủy booking, soft delete payment, gửi notification, tính forceDepositWarning.
 * Output: { paymentId, refunded, originalAmount, refundPercent, refundAmount,
 *           cancelCount, warning, nextCancelInfo, forceDepositWarning }
 */
const refundPayment = async (req, res) => {
  try {
    const result = await service.refundPayment(Number(req.params.id));
    res.json(result);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

/**
 * [7] confirmCashDeposit
 * Nhân viên xác nhận đã thu tiền mặt tại quầy sau khi khách check-in.
 * Cập nhật PaidAt = GETDATE() cho payment tương ứng.
 */
const confirmCashDeposit = async (req, res) => {
  try {
    const result = await service.confirmCashDeposit(Number(req.params.id));
    res.json(result);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

module.exports = { createPayment, vnpayReturn, getPaymentHistory, getRefundPreview, refundPayment, getUserTier, confirmCashDeposit };