const service = require('./paymentService');
const { sql, poolPromise } = require('../db');

// ✅ Thêm cancelCount + forceDeposit vào response
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
      forceDepositWarning: forceDeposit
        ? `🚨 Do bạn đã hủy ${cancelCount} lần trong 30 ngày, hạng ${tierName} của bạn phải đặt cọc 10% cho lần đặt lịch này.`
        : null
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

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

// GET /api/payments/vnpay-return
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

const getPaymentHistory = async (req, res) => {
  try {
    const result = await service.getPaymentHistory(req.user.userId, req.query);
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getRefundPreview = async (req, res) => {
  try {
    const result = await service.getRefundPreview(Number(req.params.id));
    res.json(result);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

const refundPayment = async (req, res) => {
  try {
    const result = await service.refundPayment(Number(req.params.id));
    res.json(result);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

const confirmCashDeposit = async (req, res) => {
  try {
    const result = await service.confirmCashDeposit(Number(req.params.id));
    res.json(result);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

/**
 * Lấy danh sách payment đủ điều kiện tạo yêu cầu hoàn tiền (Staff/Admin)
 * GET /api/payments/refundable
 * Điều kiện:
 *   - Booking chưa hủy (Status != 5), không đang rửa (Status != 3), chưa hoàn thành (Status != 4)
 *   - Chưa có REFUND_REQUEST đang Pending hoặc UnderReview
 *   - Amount > 0 (có tiền để hoàn)
 */
const getRefundablePayments = async (req, res) => {
  try {
    const pool = await poolPromise;

const result = await pool.request().query(`
  SELECT
    p.PaymentID, p.BookingID, p.Amount, p.PaymentMethod, p.PaidAt,
    b.Status      AS BookingStatus,
    b.BookingDate, b.LicensePlate, b.VehicleType,
    b.CustomerID,
    u.FullName    AS CustomerName,
    u.Email       AS CustomerEmail
  FROM PAYMENT p
  JOIN BOOKING b ON p.BookingID = b.BookingID
  JOIN [USER] u  ON b.CustomerID = u.UserID
  LEFT JOIN REFUND_REQUEST rr
    ON rr.PaymentID = p.PaymentID
    AND rr.Status IN ('Pending', 'UnderReview')
  WHERE
    (p.IsHiddenByUser IS NULL OR p.IsHiddenByUser = 0)
    AND b.Status != 5
    AND p.Amount > 0
    AND rr.RefundID IS NULL
  ORDER BY p.PaidAt DESC
`);

    res.json({
      total: result.recordset.length,
      data:  result.recordset
    });

  } catch (err) {
    console.error('[getRefundablePayments]', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createPayment,
  vnpayReturn,
  getPaymentHistory,
  getRefundPreview,
  refundPayment,
  getUserTier,
  confirmCashDeposit,
  getRefundablePayments,  // ← MỚI
};