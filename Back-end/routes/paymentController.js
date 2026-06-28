const service = require('./paymentService');

const getUserTier = async (req, res) => {
  try {
    const tierID = await service.getUserTier(req.user.userId); // userId thay vì id
    const needDeposit = tierID === 1 || tierID === 2;
    const tierName = { 1: 'Bronze', 2: 'Silver', 3: 'Gold', 4: 'Platinum' }[tierID] || 'Bronze';
    res.json({ tierID, tierName, needDeposit });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createPayment = async (req, res) => {
  try {
    const { bookingId, method, amount } = req.body;
    if (!bookingId || !method) return res.status(400).json({ message: 'Thiếu bookingId hoặc method' });
    const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const result = await service.createPayment({
      bookingId, method, amount,
      userId: req.user.userId, //  userId thay vì id
      ipAddr
    });
    console.log('PaymentURL:', result.paymentUrl);
    res.status(201).json(result);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

// GET /api/payments/vnpay-return — VNPay redirect về
const vnpayReturn = async (req, res) => {
  try {
    const { isValid, paymentId } = await service.confirmVNPay(req.query);
    const redirectUrl = isValid
      ? `http://localhost:5173/payments/result?status=success&paymentId=${paymentId}`
      : `http://localhost:5173/payments/result?status=failed&paymentId=${paymentId}`;

    // ✅ Bypass ngrok browser warning page
    res.setHeader('ngrok-skip-browser-warning', 'true');
    res.redirect(redirectUrl);
  } catch (err) {
    res.redirect('http://localhost:5173/payments/result?status=failed');
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const result = await service.getPaymentHistory(req.user.userId, req.query); //  userId
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/payments/:id/refund-preview
const getRefundPreview = async (req, res) => {
  try {
    const result = await service.getRefundPreview(Number(req.params.id));
    res.json(result);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

const refundPayment = async (req, res) => {
  try {
    const result = await service.refundPayment(Number(req.params.id), req.body.forceCancel === true);
    res.json(result);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

const confirmCashDeposit = async (req, res) => {
  try {
    const result = await service.confirmCashDeposit(Number(req.params.id));
    res.json(result);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

module.exports = { createPayment, vnpayReturn, getPaymentHistory, getRefundPreview, refundPayment, getUserTier, confirmCashDeposit };