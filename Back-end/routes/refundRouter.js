const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const ctrl = require('./refundRequest');

// Tất cả routes cần đăng nhập
router.use(verifyToken);

// Staff + Admin
router.post('/',                   ctrl.createRefundRequest);   // Tạo yêu cầu
router.get('/',                    ctrl.getRefundRequests);      // Danh sách
router.get('/history',             ctrl.getRefundHistory);       // Lịch sử (Admin)
router.get('/:id',                 ctrl.getRefundRequestById);   // Chi tiết
router.patch('/:id/review-start',  ctrl.startReview);           // Staff chuyển UnderReview
router.patch('/:id/review',        ctrl.reviewRefundRequest);    // Admin duyệt/từ chối

module.exports = router;