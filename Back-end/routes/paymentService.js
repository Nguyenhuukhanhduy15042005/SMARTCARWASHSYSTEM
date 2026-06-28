const { sql, poolPromise } = require('../db');
const crypto = require('crypto');
const moment = require('moment');
const querystring = require('qs');

const VNPAY_CONFIG = {
  tmnCode:    process.env.VNPAY_TMN_CODE    || 'I50786JJ',
  hashSecret: process.env.VNPAY_HASH_SECRET || 'Z3H1YFPAW2VN5NZ3ZXLGB2RXSGTWZ3SN',
  url:        process.env.VNPAY_URL         || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  returnUrl:  process.env.VNPAY_RETURN_URL  || 'http://localhost:5000/api/payments/vnpay-return',
};

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      sorted[key] = encodeURIComponent(String(obj[key])).replace(/%20/g, "+");
    }
  }
  return sorted;
}

const createVNPayUrl = (paymentId, amount, orderInfo, ipAddr) => {
  const date = moment(new Date()).format('YYYYMMDDHHmmss');

  let cleanIp = ipAddr || '127.0.0.1';
  if (cleanIp === '::1' || cleanIp === '::ffff:127.0.0.1') cleanIp = '127.0.0.1';
  if (cleanIp.startsWith('::ffff:')) cleanIp = cleanIp.replace('::ffff:', '');

  const safeOrderInfo = (orderInfo || `Thanh toan ${paymentId}`)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .substring(0, 255);

  let vnp_Params = {
    vnp_Version:    '2.1.0',
    vnp_Command:    'pay',
    vnp_TmnCode:    VNPAY_CONFIG.tmnCode,
    vnp_Locale:     'vn',
    vnp_CurrCode:   'VND',
    vnp_TxnRef:     String(paymentId),
    vnp_OrderInfo:  safeOrderInfo,
    vnp_OrderType:  'other',
    vnp_Amount:     String(Math.round(amount) * 100),
    vnp_ReturnUrl:  VNPAY_CONFIG.returnUrl,
    vnp_IpAddr:     cleanIp,
    vnp_CreateDate: date,
  };

  vnp_Params = sortObject(vnp_Params);
  const signData = querystring.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.hashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  vnp_Params['vnp_SecureHash'] = signed;
  const paymentUrl = VNPAY_CONFIG.url + '?' + querystring.stringify(vnp_Params, { encode: false });

  console.log('SignData:', signData.substring(0, 100) + '...');
  console.log('PaymentURL:', paymentUrl.substring(0, 120) + '...');

  return paymentUrl;
};

const verifyVNPayReturn = (query) => {
  const secureHash = query['vnp_SecureHash'];
  const params = { ...query };
  delete params['vnp_SecureHash'];
  delete params['vnp_SecureHashType'];

  const sortedParams = sortObject(params);
  const signData = querystring.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.hashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  return signed === secureHash && query['vnp_ResponseCode'] === '00';
};

const getUserTier = async (userId) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .query(`SELECT TierID FROM MEMBER_PROFILE WHERE UserID = @userId`);
  return result.recordset[0]?.TierID || 1;
};

const createPayment = async ({ bookingId, method, amount, userId, ipAddr }) => {
  const pool = await poolPromise;

  const bookingCheck = await pool.request()
    .input('bookingId', sql.Int, bookingId)
    .query(`SELECT BookingID, Status, FinalPrice, TotalPrice, CustomerID FROM BOOKING WHERE BookingID = @bookingId`);

  if (!bookingCheck.recordset.length) throw new Error('Không tìm thấy booking');
  const booking = bookingCheck.recordset[0];
  if (booking.Status === 5) throw new Error('Booking đã bị huỷ');

  if (booking.Status === 1) {
    await pool.request()
      .input('bookingId', sql.Int, bookingId)
      .query(`DELETE FROM PAYMENT WHERE BookingID = @bookingId`);
  } else {
    const existingPayment = await pool.request()
      .input('bookingId', sql.Int, bookingId)
      .query(`SELECT PaymentID FROM PAYMENT WHERE BookingID = @bookingId`);
    if (existingPayment.recordset.length) throw new Error('Booking này đã được thanh toán');
  }

  const finalAmount = amount || booking.FinalPrice || booking.TotalPrice;
  let paymentAmount = finalAmount;
  let tierID = 1;
  let depositOnly = false;

  if (method === 'cash') {
    tierID = await getUserTier(userId || booking.CustomerID);
    if (tierID === 1 || tierID === 2) {
      const calculatedDeposit = Math.round(finalAmount * 0.1);
      paymentAmount = Math.min(finalAmount, Math.max(10000, calculatedDeposit));
      depositOnly = true;
    } else {
      paymentAmount = 0;
    }
  }

  let payment = null;
  let paymentUrl = null;

  if (method === 'cash' && !depositOnly) {
    const result = await pool.request()
      .input('bookingId', sql.Int,          bookingId)
      .input('method',    sql.NVarChar(50),  method)
      .input('amount',    sql.Decimal(18,2), 0)
      .input('paidAt',    sql.DateTime,      new Date())
      .query(`
        INSERT INTO PAYMENT (BookingID, PaymentMethod, Amount, PaidAt)
        OUTPUT INSERTED.*
        VALUES (@bookingId, @method, @amount, @paidAt)
      `);
    payment = result.recordset[0];

    await pool.request()
      .input('bookingId', sql.Int, bookingId)
      .query(`
        UPDATE BOOKING SET Status = 2 WHERE BookingID = @bookingId;
        UPDATE MEMBER_PROMOTION 
        SET IsUsed = 1 
        WHERE MemberPromoID = (SELECT MemberPromoID FROM BOOKING WHERE BookingID = @bookingId);
      `);
  } else {
    const txnRef = `${bookingId}_${method}_${paymentAmount}_${Date.now()}`;
    const orderInfo = method === 'vnpay' ? `Thanh toan booking ${bookingId}` : `Dat coc booking ${bookingId}`;
    paymentUrl = createVNPayUrl(txnRef, paymentAmount, orderInfo, ipAddr);
    payment = {
      BookingID: bookingId,
      PaymentMethod: method,
      Amount: paymentAmount,
      PaidAt: new Date()
    };
  }

  return {
    payment, paymentUrl, tierID, depositOnly,
    depositAmount: depositOnly ? paymentAmount : 0,
    remainingAmount: depositOnly ? finalAmount - paymentAmount : 0,
    fullAmount: finalAmount
  };
};

const confirmVNPay = async (query) => {
  const isValid = verifyVNPayReturn(query);
  const txnRef = query['vnp_TxnRef'];
  
  if (!txnRef) return { isValid: false, paymentId: null };

  const parts = txnRef.split('_');
  const bookingId = Number(parts[0]);
  const method = parts[1];
  const paymentAmount = Number(parts[2]);

  if (!bookingId) return { isValid: false, paymentId: null };

  const pool = await poolPromise;
  let paymentId = null;

  if (isValid) {
    const existing = await pool.request()
      .input('bookingId', sql.Int, bookingId)
      .query(`SELECT PaymentID FROM PAYMENT WHERE BookingID = @bookingId`);

    if (existing.recordset.length === 0) {
      const insertResult = await pool.request()
        .input('bookingId', sql.Int, bookingId)
        .input('method', sql.NVarChar(50), method)
        .input('amount', sql.Decimal(18,2), paymentAmount)
        .input('paidAt', sql.DateTime, new Date())
        .query(`
          INSERT INTO PAYMENT (BookingID, PaymentMethod, Amount, PaidAt)
          OUTPUT INSERTED.PaymentID
          VALUES (@bookingId, @method, @amount, @paidAt)
        `);
      paymentId = insertResult.recordset[0].PaymentID;
    } else {
      paymentId = existing.recordset[0].PaymentID;
    }

    await pool.request().input('bookingId', sql.Int, bookingId)
      .query(`
        UPDATE BOOKING SET Status = 2 WHERE BookingID = @bookingId;
        UPDATE MEMBER_PROMOTION 
        SET IsUsed = 1 
        WHERE MemberPromoID = (SELECT MemberPromoID FROM BOOKING WHERE BookingID = @bookingId);
      `);
  } else {
    await pool.request().input('bookingId', sql.Int, bookingId)
      .query(`
        UPDATE BOOKING SET Status = 5 WHERE BookingID = @bookingId;
        UPDATE MEMBER_PROMOTION 
        SET IsUsed = 0 
        WHERE MemberPromoID = (SELECT MemberPromoID FROM BOOKING WHERE BookingID = @bookingId);
      `);
  }
  
  return { isValid, paymentId };
};

const getPaymentHistory = async (userId, { page = 1, limit = 10 } = {}) => {
  const pool = await poolPromise;
  const offset = (page - 1) * limit;
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .input('limit', sql.Int, limit)
    .input('offset', sql.Int, offset)
    .query(`
      SELECT p.PaymentID, p.BookingID, p.PaymentMethod AS Method, p.Amount, p.PaidAt,
        b.Status AS BookingStatus, b.VehicleType, b.LicensePlate, b.FinalPrice, s.ServiceName
      FROM PAYMENT p
      JOIN BOOKING b ON p.BookingID = b.BookingID
      LEFT JOIN BOOKING_DETAIL bd ON b.BookingID = bd.BookingID
      LEFT JOIN SERVICE s ON bd.ServiceID = s.ServiceID
      WHERE b.CustomerID = @userId
      ORDER BY p.PaidAt DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
  const countResult = await pool.request()
    .input('userId', sql.Int, userId)
    .query(`SELECT COUNT(*) AS total FROM PAYMENT p JOIN BOOKING b ON p.BookingID = b.BookingID WHERE b.CustomerID = @userId`);
  return {
    data: result.recordset,
    total: countResult.recordset[0].total,
    page: Number(page),
    limit: Number(limit)
  };
};

// ── HOÀN TIỀN THEO QUY TẮC MỚI ───────────────────────────────────────────────
// Bảng hoàn tiền:
//                    Trước 24h   2-24h    Dưới 2h
// Lần 1, 2          → 100%    → 50%   → 0%
// Lần 3             → 50%     → 0%    → 0%
// Lần 4 trở đi      → 0%      → 0%    → 0%
//
// Đếm số lần hủy trong 30 ngày gần nhất từ bảng BOOKING (Status=5)
// Tính thời gian còn lại từ BOOKING.BookingDate
// ─────────────────────────────────────────────────────────────────────────────

// Tính % hoàn tiền dựa vào số giờ còn lại và số lần đã hủy
const getRefundPercent = (hoursLeft, cancelCount) => {
  // Dưới 2 tiếng → hoàn 0% bất kể lần mấy
  if (hoursLeft < 2) return 0;

  // Lần 4 trở đi → hoàn 0%
  if (cancelCount >= 4) return 0;

  // Lần 3
  if (cancelCount === 3) {
    if (hoursLeft >= 24) return 50;
    return 0; // 2-24h lần 3 → 0%
  }

  // Lần 1, 2
  if (hoursLeft >= 24) return 100;
  return 50; // 2-24h lần 1,2 → 50%
};

// Tạo message cảnh báo cho khách
const getWarningMessage = (hoursLeft, cancelCount, refundPercent, refundAmount) => {
  const nextCancelCount = cancelCount + 1;

  // Cảnh báo dưới 2 tiếng
  if (hoursLeft < 2) {
    return `⚠️ Bạn đang hủy trong vòng 2 tiếng trước giờ rửa xe. Bạn sẽ không được hoàn tiền.`;
  }

  // Cảnh báo lần 4+
  if (cancelCount >= 4) {
    return `❌ Bạn đã hủy quá nhiều lần trong 30 ngày qua. Không được hoàn tiền cho lần hủy này.`;
  }

  // Cảnh báo lần 3
  if (cancelCount === 3) {
    if (hoursLeft >= 24) {
      return `🚨 Đây là lần hủy thứ ${nextCancelCount} trong 30 ngày. Bạn chỉ được hoàn 50% = ${refundAmount.toLocaleString('vi-VN')}đ. Lần hủy tiếp theo sẽ không được hoàn tiền.`;
    }
    return `🚨 Bạn đang hủy trong khoảng 2-24 tiếng và đây là lần thứ ${nextCancelCount}. Bạn sẽ không được hoàn tiền.`;
  }

  // Cảnh báo lần 2
  if (cancelCount === 2) {
    if (hoursLeft >= 24) {
      return `⚠️ Đây là lần hủy thứ ${nextCancelCount} trong 30 ngày. Bạn được hoàn 100% = ${refundAmount.toLocaleString('vi-VN')}đ. Lần hủy tiếp theo chỉ được hoàn 50%.`;
    }
    return `⚠️ Bạn đang hủy trong khoảng 2-24 tiếng (lần ${nextCancelCount}). Bạn chỉ được hoàn 50% = ${refundAmount.toLocaleString('vi-VN')}đ.`;
  }

  // Lần 1 - thông báo bình thường
  if (hoursLeft >= 24) {
    return `✅ Bạn được hoàn 100% = ${refundAmount.toLocaleString('vi-VN')}đ.`;
  }
  return `⚠️ Bạn đang hủy trong khoảng 2-24 tiếng. Bạn chỉ được hoàn 50% = ${refundAmount.toLocaleString('vi-VN')}đ.`;
};

const refundPayment = async (paymentId) => {
  const pool = await poolPromise;

  // 1. Lấy thông tin payment + booking
  const pc = await pool.request()
    .input('paymentId', sql.Int, paymentId)
    .query(`
      SELECT p.*, b.Status AS BookingStatus, b.BookingDate, b.CustomerID
      FROM PAYMENT p
      JOIN BOOKING b ON p.BookingID = b.BookingID
      WHERE p.PaymentID = @paymentId
    `);

  if (!pc.recordset.length) throw new Error('Không tìm thấy payment');
  const payment = pc.recordset[0];

  // 2. Kiểm tra trạng thái booking
  if (payment.BookingStatus === 3) throw new Error('Xe đang được rửa, không thể hoàn tiền!');
  if (payment.BookingStatus === 4) throw new Error('Đơn đã hoàn thành, không thể hoàn tiền!');
  if (payment.BookingStatus === 5) throw new Error('Booking đã bị hủy trước đó!');

  // 3. Tính giờ còn lại đến BookingDate
  const now = new Date();
  const bookingDate = new Date(payment.BookingDate);
  const hoursLeft = (bookingDate - now) / (1000 * 60 * 60);

  // Nếu đã qua giờ rửa xe mà chưa rửa → vẫn cho hủy nhưng hoàn 0%
  const hoursLeftSafe = Math.max(0, hoursLeft);

  // 4. Đếm số lần hủy trong 30 ngày gần nhất
  const cancelResult = await pool.request()
    .input('customerId', sql.Int, payment.CustomerID)
    .query(`
      SELECT COUNT(*) AS CancelCount
      FROM BOOKING
      WHERE CustomerID = @customerId
        AND Status = 5
        AND BookingDate >= DATEADD(DAY, -30, GETDATE())
    `);
  const cancelCount = cancelResult.recordset[0].CancelCount;

  // 5. Tính % và số tiền hoàn
  const refundPercent = getRefundPercent(hoursLeftSafe, cancelCount);
  const originalAmount = Number(payment.Amount || 0);
  const refundAmount = Math.round(originalAmount * refundPercent / 100);

  // 6. Tạo cảnh báo
  const warning = getWarningMessage(hoursLeftSafe, cancelCount, refundPercent, refundAmount);

  // 7. Thực hiện hủy booking + nhả voucher
  await pool.request()
    .input('bookingId', sql.Int, payment.BookingID)
    .query(`
      UPDATE BOOKING SET Status = 5 WHERE BookingID = @bookingId;
      UPDATE MEMBER_PROMOTION 
      SET IsUsed = 0 
      WHERE MemberPromoID = (SELECT MemberPromoID FROM BOOKING WHERE BookingID = @bookingId);
    `);

  // 8. Xóa bản ghi payment
  await pool.request()
    .input('paymentId', sql.Int, paymentId)
    .query(`DELETE FROM PAYMENT WHERE PaymentID = @paymentId`);

  return {
    paymentId,
    refunded: true,
    originalAmount,
    refundPercent,
    refundAmount,
    cancelCount: cancelCount + 1, // cộng thêm lần này
    warning,
    // Thông tin cho frontend hiển thị
    nextCancelInfo: cancelCount + 1 >= 4
      ? '❌ Lần hủy tiếp theo sẽ không được hoàn tiền'
      : cancelCount + 1 === 3
        ? '⚠️ Còn 1 lần hủy được hoàn tiền trong 30 ngày'
        : null
  };
};

const confirmCashDeposit = async (paymentId) => {
  const pool = await poolPromise;
  const pc = await pool.request()
    .input('paymentId', sql.Int, paymentId)
    .query(`
      SELECT p.PaymentID, p.BookingID, p.Amount, p.PaymentMethod, b.Status AS BookingStatus
      FROM PAYMENT p
      JOIN BOOKING b ON p.BookingID = b.BookingID
      WHERE p.PaymentID = @paymentId
    `);
  if (!pc.recordset.length) throw new Error('Không tìm thấy payment với ID này');
  const payment = pc.recordset[0];

  const methodLower = (payment.PaymentMethod || '').toLowerCase();
  if (methodLower !== 'cash' && methodLower !== 'tiền mặt' && methodLower !== 'tien mat') {
    throw new Error('Payment này không phải thanh toán tiền mặt!');
  }

  await pool.request()
    .input('paymentId', sql.Int, paymentId)
    .query(`UPDATE PAYMENT SET PaidAt = GETDATE() WHERE PaymentID = @paymentId AND PaidAt IS NULL`);

  return { paymentId, confirmed: true, amount: payment.Amount, message: 'Xác nhận thanh toán tiền mặt thành công' };
};

module.exports = { createPayment, confirmVNPay, getPaymentHistory, refundPayment, getUserTier, confirmCashDeposit };