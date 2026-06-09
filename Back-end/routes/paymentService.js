const { sql, poolPromise } = require('../db');
const crypto = require('crypto');
const moment = require('moment');
const qs = require('qs');

const VNPAY_CONFIG = {
  tmnCode:    process.env.VNPAY_TMN_CODE    || 'I50786JJ',
  hashSecret: process.env.VNPAY_HASH_SECRET || 'LC55OKXLNHR7WLGY5MML4XEYEVOFVO0O',
  url:        process.env.VNPAY_URL         || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  returnUrl:  process.env.VNPAY_RETURN_URL  || 'http://localhost:5000/api/payments/vnpay-return',
};

function sortObject(obj) {
  const sorted = {};
  Object.keys(obj).sort().forEach(key => { sorted[key] = obj[key]; });
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

  const vnpParams = sortObject({
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
  });

  // ✅ Ký trên giá trị có + thay space — khớp với URL gửi đi
  const signData = Object.keys(vnpParams)
    .map(k => `${k}=${String(vnpParams[k]).split(' ').join('+')}`)
    .join('&');

  console.log('=== VNPAY SIGN DATA ===');
  console.log(signData);

  const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.hashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  console.log('=== VNPAY HASH ===');
  console.log(signed);

  // ✅ Build URL — encode space thành + trong value, không encode ký tự khác
  const urlQuery = Object.keys(vnpParams)
    .map(k => `${k}=${String(vnpParams[k]).split(' ').join('+')}`)
    .concat(`vnp_SecureHash=${signed}`)
    .join('&');

  const finalUrl = `${VNPAY_CONFIG.url}?${urlQuery}`;

  return finalUrl;
};

const verifyVNPayReturn = (query) => {
  const secureHash = query['vnp_SecureHash'];
  const params = { ...query };
  delete params['vnp_SecureHash'];
  delete params['vnp_SecureHashType'];

  const sortedParams = sortObject(params);

  // ✅ Verify trên raw values (Express đã decode)
  const signData = Object.keys(sortedParams)
    .map(k => `${k}=${sortedParams[k]}`)
    .join('&');

  const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.hashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  console.log('=== VNPAY VERIFY ===');
  console.log('Expected:', signed);
  console.log('Received:', secureHash);
  console.log('Match:', signed === secureHash);

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

  const existingPayment = await pool.request()
    .input('bookingId', sql.Int, bookingId)
    .query(`SELECT PaymentID FROM PAYMENT WHERE BookingID = @bookingId`);
  if (existingPayment.recordset.length) throw new Error('Booking này đã được thanh toán');

  const finalAmount = amount || booking.FinalPrice || booking.TotalPrice;
  let paymentAmount = finalAmount;
  let tierID = 1;
  let depositOnly = false;

  if (method === 'cash') {
    tierID = await getUserTier(userId || booking.CustomerID);
    if (tierID === 1 || tierID === 2) {
      paymentAmount = Math.round(finalAmount * 0.1);
      depositOnly = true;
    } else {
      paymentAmount = 0;
    }
  }

  const result = await pool.request()
    .input('bookingId', sql.Int,          bookingId)
    .input('method',    sql.NVarChar(50),  method)
    .input('amount',    sql.Decimal(18,2), paymentAmount)
    .input('paidAt',    sql.DateTime,      new Date())
    .query(`
      INSERT INTO PAYMENT (BookingID, PaymentMethod, Amount, PaidAt)
      OUTPUT INSERTED.*
      VALUES (@bookingId, @method, @amount, @paidAt)
    `);

  const payment = result.recordset[0];

  await pool.request()
    .input('bookingId', sql.Int, bookingId)
    .query(`UPDATE BOOKING SET Status = 2 WHERE BookingID = @bookingId`);

  let paymentUrl = null;
  if (method === 'vnpay' && paymentAmount > 0) {
    paymentUrl = createVNPayUrl(
      payment.PaymentID,
      paymentAmount,
      `Thanh toan booking ${bookingId}`,
      ipAddr
    );
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
  const paymentId = Number(query['vnp_TxnRef']);
  if (isValid) {
    const pool = await poolPromise;
    const pc = await pool.request()
      .input('paymentId', sql.Int, paymentId)
      .query(`SELECT BookingID FROM PAYMENT WHERE PaymentID = @paymentId`);
    if (pc.recordset.length) {
      await pool.request()
        .input('bookingId', sql.Int, pc.recordset[0].BookingID)
        .query(`UPDATE BOOKING SET Status = 3 WHERE BookingID = @bookingId`);
    }
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

const refundPayment = async (paymentId) => {
  const pool = await poolPromise;
  const pc = await pool.request()
    .input('paymentId', sql.Int, paymentId)
    .query(`SELECT * FROM PAYMENT WHERE PaymentID = @paymentId`);
  if (!pc.recordset.length) throw new Error('Không tìm thấy payment');
  const payment = pc.recordset[0];
  await pool.request()
    .input('bookingId', sql.Int, payment.BookingID)
    .query(`UPDATE BOOKING SET Status = 5 WHERE BookingID = @bookingId`);
  await pool.request()
    .input('paymentId', sql.Int, paymentId)
    .query(`DELETE FROM PAYMENT WHERE PaymentID = @paymentId`);
  return { paymentId, refunded: true, amount: payment.Amount };
};

module.exports = { createPayment, confirmVNPay, getPaymentHistory, refundPayment, getUserTier };
