const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const ctrl = require('./paymentController');

// VNPay return — KHÔNG cần auth (VNPay redirect về)
router.get('/vnpay-return', ctrl.vnpayReturn);

// Các routes còn lại cần auth
router.use(verifyToken);

router.get('/tier',               ctrl.getUserTier);
router.get('/history',            ctrl.getPaymentHistory);
router.get('/refundable',         ctrl.getRefundablePayments);
router.get('/:id/refund-preview', ctrl.getRefundPreview);
router.post('/',                  ctrl.createPayment);
router.post('/:id/refund',        ctrl.refundPayment);
router.post('/:id/confirm-cash',  ctrl.confirmCashDeposit); 

module.exports = router;
