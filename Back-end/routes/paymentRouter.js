const router = require('express').Router();
const { verifyToken, onlyAdmin, adminOrStaff } = require('../middleware/auth');
const ctrl = require('./payment.controller');
 
// ═════════════════════════════════════════════════════════════════════════════
// PHẦN 1: THANH TOÁN ONLINE (VNPay / MoMo)
// ═════════════════════════════════════════════════════════════════════════════
 
// Người dùng đăng nhập khởi tạo thanh toán online
// Body: { bookingId, method: 'VNPAY' | 'MOMO' }
router.post('/initiate', verifyToken, ctrl.initiateOnlinePayment);
 
// VNPay redirect về sau khi thanh toán (GET, không cần auth — VNPay gọi tự động)
router.get('/vnpay/callback', ctrl.vnpayCallback);
 
// MoMo IPN server-to-server (POST, không cần auth — MoMo server gọi tự động)
router.post('/momo/callback', ctrl.momoCallback);
 
// MoMo redirect người dùng về sau thanh toán (GET, không cần auth)
router.get('/momo/return', ctrl.momoReturn);
 
// Người dùng xem lịch sử thanh toán của mình
router.get('/history', verifyToken, ctrl.getMyHistory);
 
// ═════════════════════════════════════════════════════════════════════════════
// PHẦN 2: THANH TOÁN TIỀN MẶT (Cash + Đặt cọc theo hạng thành viên)
// ═════════════════════════════════════════════════════════════════════════════
 
// Người dùng chọn thanh toán tiền mặt
// → Trả về thông tin cọc (requireDeposit, depositAmount, remainingAmount...)
// Body: { serviceIds, vehicleType, licensePlate, memberPromoId? }
router.post('/cash/initiate', verifyToken, ctrl.initiateCash);
 
// Xác nhận cọc đã được thanh toán online (Admin/Staff gọi sau khi callback thành công)
// Body: { bookingId, txnRef }
router.post('/cash/confirm-deposit', verifyToken, adminOrStaff, ctrl.confirmCashDeposit);
 
// Staff thu tiền mặt khi khách đến (phần còn lại sau cọc, hoặc 100% nếu miễn cọc)
// Param: bookingId
router.post('/cash/collect/:bookingId', verifyToken, adminOrStaff, ctrl.collectCash);
 
// Hủy booking → tiền cọc BỊ GIỮ LẠI làm phí hủy (không hoàn)
// Param: bookingId
router.post('/cash/cancel/:bookingId', verifyToken, ctrl.cancelWithForfeit);
 
module.exports = router;