const router = require('express').Router();
const verify = require('../middleware/verifyToken');
const ctrl   = require('./refundRequest');

router.use(verify);

// Thứ tự quan trọng: /refundable và /history phải trước /:id
router.get('/refundable',         ctrl.getRefundablePayments);   // Staff/Admin
router.get('/history',            ctrl.getRefundHistory);         // Admin
router.get('/',                   ctrl.getRefundRequests);        // Staff/Admin
router.get('/:id',                ctrl.getRefundRequestById);     // Staff/Admin

router.post('/',                  ctrl.createRefundFromStaff);    // Staff/Admin tạo do sự cố
router.post('/appeal',            ctrl.createRefundFromCustomer); // Customer khiếu nại sau 0%
router.patch('/:id/review-start', ctrl.startReview);             // Staff → UnderReview
router.patch('/:id/review',       ctrl.reviewRefundRequest);      // Admin duyệt/từ chối

module.exports = router;