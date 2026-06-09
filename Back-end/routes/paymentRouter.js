const router = require('express').Router();
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