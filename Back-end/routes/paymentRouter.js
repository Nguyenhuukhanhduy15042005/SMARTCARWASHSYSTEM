const router = require('express').Router();
<<<<<<< HEAD
const verifyToken = require('../middleware/verifyToken'); // ✅ đúng tên middleware
const ctrl = require('./paymentController');

// VNPay return — KHÔNG cần auth (VNPay redirect về)
router.get('/vnpay-return', ctrl.vnpayReturn);

// Các routes còn lại cần auth
router.use(verifyToken);

router.get('/tier',        ctrl.getUserTier);
router.get('/history',     ctrl.getPaymentHistory);
router.post('/',           ctrl.createPayment);
router.post('/:id/refund', ctrl.refundPayment);

module.exports = router;
=======
const { verifyToken, adminOrStaff } = require('../middleware/auth');
const ctrl = require('./payment.controller');

// ═════════════════════════════════════════════════════════════════════════════
// VNPAY
// ═════════════════════════════════════════════════════════════════════════════

// Tạo link thanh toán VNPay
router.post(
  '/initiate',
  verifyToken,
  ctrl.initiateOnlinePayment
);

// Callback VNPay
router.get(
  '/vnpay/callback',
  ctrl.vnpayCallback
);

// Lịch sử thanh toán
router.get(
  '/history',
  verifyToken,
  ctrl.getMyHistory
);

// ═════════════════════════════════════════════════════════════════════════════
// CASH + DEPOSIT
// ═════════════════════════════════════════════════════════════════════════════

// Tạo booking thanh toán tiền mặt
router.post(
  '/cash/initiate',
  verifyToken,
  ctrl.initiateCash
);

// Xác nhận cọc
router.post(
  '/cash/confirm-deposit',
  verifyToken,
  adminOrStaff,
  ctrl.confirmCashDeposit
);

// Thu phần tiền còn lại
router.post(
  '/cash/collect/:bookingId',
  verifyToken,
  adminOrStaff,
  ctrl.collectCash
);

// Hủy booking (mất cọc)
router.post(
  '/cash/cancel/:bookingId',
  verifyToken,
  ctrl.cancelWithForfeit
);

module.exports = router;
>>>>>>> origin/main
