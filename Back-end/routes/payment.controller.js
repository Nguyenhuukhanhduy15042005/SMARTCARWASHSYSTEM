const {
  // Online
  initiatePayment,
  handleVNPayCallback,
  handleMoMoCallback,
  getMyPaymentHistory,
  // Cash
  initiateCashPayment,
  confirmDeposit,
  collectCashOnArrival,
  cancelBookingWithForfeit,
} = require('./payment.service');
 
// ═════════════════════════════════════════════════════════════════════════════
// PHẦN 1: THANH TOÁN ONLINE (VNPay / MoMo)
// ═════════════════════════════════════════════════════════════════════════════
 
// POST /api/payments/initiate
// Người dùng chọn VNPay hoặc MoMo → nhận paymentUrl → redirect sang cổng
const initiateOnlinePayment = async (req, res) => {
  try {
    const { bookingId, method } = req.body;
 
    if (!bookingId || !method) {
      return res.status(400).json({ message: 'Thiếu bookingId hoặc method' });
    }
 
    const validMethods = ['VNPAY', 'MOMO'];
    if (!validMethods.includes(method.toUpperCase())) {
      return res.status(400).json({
        message: `Phương thức không hợp lệ. Dùng: ${validMethods.join(', ')}`,
      });
    }
 
    const result = await initiatePayment({
      bookingId: Number(bookingId),
      userId:    req.user.userId,
      method:    method.toUpperCase(),
    });
 
    // { paymentUrl, method, bookingId }
    // Frontend dùng: window.location.href = result.paymentUrl
    res.json(result);
 
  } catch (err) {
    const code = err.message.includes('không tồn tại') ? 404
               : err.message.includes('đã được thanh toán') ? 409
               : 400;
    res.status(code).json({ message: err.message });
  }
};
 
// GET /api/payments/vnpay/callback
// VNPay redirect về đây sau khi người dùng thanh toán xong
const vnpayCallback = async (req, res) => {
  try {
    const { success, bookingId } = await handleVNPayCallback(req.query);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
 
    return res.redirect(
      `${frontendUrl}/payment/result?status=${success ? 'success' : 'failed'}&bookingId=${bookingId}`
    );
  } catch (err) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(
      `${frontendUrl}/payment/result?status=error&message=${encodeURIComponent(err.message)}`
    );
  }
};
 
// POST /api/payments/momo/callback
// MoMo IPN — server gọi về, người dùng không thấy
const momoCallback = async (req, res) => {
  try {
    await handleMoMoCallback(req.body);
    res.json({ message: 0 }); // MoMo yêu cầu trả về { message: 0 } nếu nhận thành công
  } catch (err) {
    console.error('[MoMo Callback Error]', err.message);
    res.status(400).json({ message: -1 });
  }
};
 
// GET /api/payments/momo/return
// MoMo redirect người dùng về đây sau khi thanh toán xong
const momoReturn = async (req, res) => {
  const { resultCode, orderId } = req.query;
  const bookingId   = orderId?.split('_')[1];
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const success     = resultCode === '0';
 
  res.redirect(
    `${frontendUrl}/payment/result?status=${success ? 'success' : 'failed'}&bookingId=${bookingId}`
  );
};
 
// GET /api/payments/history
// Người dùng xem lịch sử thanh toán của mình
const getMyHistory = async (req, res) => {
  try {
    const data = await getMyPaymentHistory(req.user.userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
 
// ═════════════════════════════════════════════════════════════════════════════
// PHẦN 2: THANH TOÁN TIỀN MẶT (Cash + Đặt cọc theo hạng thành viên)
// ═════════════════════════════════════════════════════════════════════════════
 
// POST /api/payments/cash/initiate
// Người dùng chọn thanh toán tiền mặt → server kiểm tra hạng → trả về thông tin cọc
// Nếu requireDeposit = true → frontend redirect sang VNPay/MoMo để đặt cọc 10%
const initiateCash = async (req, res) => {
  try {
    const { serviceIds, vehicleType, licensePlate, memberPromoId } = req.body;
 
    if (!serviceIds?.length || !vehicleType || !licensePlate) {
      return res.status(400).json({ message: 'Thiếu thông tin: serviceIds, vehicleType, licensePlate' });
    }
 
    const result = await initiateCashPayment({
      userId:        req.user.userId,
      serviceIds:    serviceIds.map(Number),
      vehicleType,
      licensePlate,
      memberPromoId: memberPromoId ? Number(memberPromoId) : null,
    });
 
    /*
      Response trả về:
      {
        bookingId,
        tierID,
        tierName,
        requireDeposit,   ← true: Đồng/Bạc/Guest | false: Vàng/Bạch Kim
        depositAmount,    ← số tiền cọc (0 nếu miễn)
        remainingAmount,  ← số tiền còn lại thu khi đến
        totalPrice,
        finalPrice,
        message
      }
 
      Frontend xử lý:
        if (requireDeposit) {
          → gọi POST /api/payments/initiate với bookingId + method (VNPAY/MOMO)
          → redirect sang cổng thanh toán để đóng cọc
        } else {
          → hiển thị "Đặt lịch thành công, thanh toán khi đến nơi"
        }
    */
    res.status(201).json(result);
 
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
 
// POST /api/payments/cash/confirm-deposit
// Gọi sau khi VNPay/MoMo callback xác nhận cọc thành công
// (Thường gọi nội bộ từ trong vnpayCallback / momoCallback nếu là luồng cash+deposit)
const confirmCashDeposit = async (req, res) => {
  try {
    const { bookingId, txnRef } = req.body;
 
    if (!bookingId) {
      return res.status(400).json({ message: 'Thiếu bookingId' });
    }
 
    const result = await confirmDeposit(Number(bookingId), txnRef || '');
    res.json({ message: 'Xác nhận đặt cọc thành công', data: result });
 
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
 
// POST /api/payments/cash/collect/:bookingId
// Staff thu tiền mặt khi khách đến (phần còn lại sau cọc, hoặc toàn bộ nếu miễn cọc)
const collectCash = async (req, res) => {
  try {
    const result = await collectCashOnArrival({
      bookingId: Number(req.params.bookingId),
      staffId:   req.user.userId,
    });
    res.json(result);
 
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
 
// POST /api/payments/cash/cancel/:bookingId
// Hủy booking → tiền cọc (nếu có) bị GIỮ LẠI làm phí hủy, không hoàn
const cancelWithForfeit = async (req, res) => {
  try {
    const result = await cancelBookingWithForfeit({
      bookingId:   Number(req.params.bookingId),
      cancelledBy: req.user.userId,
    });
 
    res.json({
      ...result,
      // Thông báo rõ cho frontend hiển thị
      notice: result.forfeitedAmount > 0
        ? `Lưu ý: ${result.forfeitedAmount.toLocaleString('vi')}₫ tiền cọc bị giữ lại do hủy đặt lịch.`
        : null,
    });
 
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
 
// ═════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════════
module.exports = {
  // Online
  initiateOnlinePayment,
  vnpayCallback,
  momoCallback,
  momoReturn,
  getMyHistory,
 
  // Cash
  initiateCash,
  confirmCashDeposit,
  collectCash,
  cancelWithForfeit,
};