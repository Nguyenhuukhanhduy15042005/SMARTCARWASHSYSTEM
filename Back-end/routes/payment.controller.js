const {
  initiateVNPayPayment,
  handleVNPayCallback,
  getMyPaymentHistory,

  initiateCashPayment,
  confirmDeposit,
  collectCashOnArrival,
  cancelBookingWithForfeit,
} = require('./payment.service');

// ═════════════════════════════════════════════════════════════════════════════
// ONLINE PAYMENT - VNPAY
// ═════════════════════════════════════════════════════════════════════════════

const initiateOnlinePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        message: 'Thiếu bookingId',
      });
    }

    const result = await initiateVNPayPayment({
      bookingId: Number(bookingId),
      userId: req.user.userId,
      clientIp:
        req.headers['x-forwarded-for'] ||
        req.socket.remoteAddress ||
        '127.0.0.1',
    });

    return res.json(result);
  } catch (err) {
    return res.status(400).json({
      message: err.message,
    });
  }
};

// VNPay redirect callback
const vnpayCallback = async (req, res) => {
  try {
    const { success, bookingId } =
      await handleVNPayCallback(req.query);

    const frontendUrl =
      process.env.FRONTEND_URL ||
      'http://localhost:3000';

    return res.redirect(
      `${frontendUrl}/payment/result?status=${
        success ? 'success' : 'failed'
      }&bookingId=${bookingId}`
    );
  } catch (err) {
    const frontendUrl =
      process.env.FRONTEND_URL ||
      'http://localhost:3000';

    return res.redirect(
      `${frontendUrl}/payment/result?status=error&message=${encodeURIComponent(
        err.message
      )}`
    );
  }
};

// Payment history
const getMyHistory = async (req, res) => {
  try {
    const data = await getMyPaymentHistory(
      req.user.userId
    );

    return res.json(data);
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// CASH PAYMENT
// ═════════════════════════════════════════════════════════════════════════════

const initiateCash = async (req, res) => {
  try {
    const {
      serviceIds,
      vehicleType,
      licensePlate,
      memberPromoId,
    } = req.body;

    if (
      !serviceIds ||
      !serviceIds.length ||
      !vehicleType ||
      !licensePlate
    ) {
      return res.status(400).json({
        message:
          'Thiếu serviceIds, vehicleType hoặc licensePlate',
      });
    }

    const result =
      await initiateCashPayment({
        userId: req.user.userId,
        serviceIds: serviceIds.map(Number),
        vehicleType,
        licensePlate,
        memberPromoId:
          memberPromoId
            ? Number(memberPromoId)
            : null,
      });

    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({
      message: err.message,
    });
  }
};

// xác nhận cọc
const confirmCashDeposit = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        message: 'Thiếu bookingId',
      });
    }

    const result =
      await confirmDeposit(
        Number(bookingId)
      );

    return res.json({
      message:
        'Xác nhận cọc thành công',
      data: result,
    });
  } catch (err) {
    return res.status(400).json({
      message: err.message,
    });
  }
};

// staff thu tiền
const collectCash = async (req, res) => {
  try {
    const result =
      await collectCashOnArrival({
        bookingId: Number(
          req.params.bookingId
        ),
      });

    return res.json(result);
  } catch (err) {
    return res.status(400).json({
      message: err.message,
    });
  }
};

// hủy booking
const cancelWithForfeit = async (
  req,
  res
) => {
  try {
    const result =
      await cancelBookingWithForfeit({
        bookingId: Number(
          req.params.bookingId
        ),
      });

    return res.json(result);
  } catch (err) {
    return res.status(400).json({
      message: err.message,
    });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  initiateOnlinePayment,
  vnpayCallback,
  getMyHistory,

  initiateCash,
  confirmCashDeposit,
  collectCash,
  cancelWithForfeit,
};