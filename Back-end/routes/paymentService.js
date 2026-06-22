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

  // Dùng encode: false vì sortObject đã tự encode các giá trị tham số
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
  // Dùng encode: false vì sortObject đã tự encode các giá trị tham số
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

  // Nếu Booking đang ở trạng thái 1 (Chờ cọc/thanh toán), bất kỳ bản ghi PAYMENT nào tồn tại đều là thanh toán lỗi/chưa hoàn tất.
  // Chúng ta xoá đi để cho phép khách hàng thực hiện thanh toán lại.
  if (booking.Status === 1) {
    await pool.request()
      .input('bookingId', sql.Int, bookingId)
      .query(`DELETE FROM PAYMENT WHERE BookingID = @bookingId`);
  } else {
    // Nếu trạng thái khác 1 (ví dụ đã xác nhận = 2, hoặc đang rửa = 3), và có PAYMENT thì chặn.
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
    // Gold/Platinum: Miễn phí đặt cọc, thanh toán sau tại quầy. 
    // Chúng ta lưu bản ghi thanh toán 0đ trực tiếp và cập nhật trạng thái đơn thành 2 (Đã xác nhận).
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
    // Bronze/Silver hoặc thanh toán online VNPay toàn bộ:
    // KHÔNG chèn bản ghi thanh toán nháp (draft) vào PAYMENT để tránh hiển thị ảo.
    // Chúng ta tạo mã giao dịch vnp_TxnRef chứa đầy đủ thông tin: bookingId_method_amount_timestamp
    const txnRef = `${bookingId}_${method}_${paymentAmount}_${Date.now()}`;
    const orderInfo = method === 'vnpay' ? `Thanh toan booking ${bookingId}` : `Dat coc booking ${bookingId}`;
    
    paymentUrl = createVNPayUrl(txnRef, paymentAmount, orderInfo, ipAddr);
    
    // Tạo đối tượng payment giả lập để trả về cho Client
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
  
  if (!txnRef) {
    return { isValid: false, paymentId: null };
  }

  const parts = txnRef.split('_');
  const bookingId = Number(parts[0]);
  const method = parts[1];
  const paymentAmount = Number(parts[2]);

  if (!bookingId) {
    return { isValid: false, paymentId: null };
  }

  const pool = await poolPromise;
  let paymentId = null;

  if (isValid) {
    // Thanh toán thành công: lưu bản ghi thanh toán chính thức vào CSDL
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

    // Cập nhật trạng thái BOOKING thành 2 (Đã xác nhận) và sử dụng voucher
    await pool.request().input('bookingId', sql.Int, bookingId)
      .query(`
        UPDATE BOOKING SET Status = 2 WHERE BookingID = @bookingId;
        UPDATE MEMBER_PROMOTION 
        SET IsUsed = 1 
        WHERE MemberPromoID = (SELECT MemberPromoID FROM BOOKING WHERE BookingID = @bookingId);
      `);
  } else {
    // Thanh toán thất bại hoặc bị hủy: chuyển sang 5 (Đã hủy) và nhả voucher
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
    .input('userId', sql.Int, userId).input('limit', sql.Int, limit).input('offset', sql.Int, offset)
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
  const countResult = await pool.request().input('userId', sql.Int, userId)
    .query(`SELECT COUNT(*) AS total FROM PAYMENT p JOIN BOOKING b ON p.BookingID = b.BookingID WHERE b.CustomerID = @userId`);
  return { data: result.recordset, total: countResult.recordset[0].total, page: Number(page), limit: Number(limit) };
};

const refundPayment = async (paymentId) => {
  const pool = await poolPromise;
  const pc = await pool.request().input('paymentId', sql.Int, paymentId)
    .query(`
      SELECT p.*, b.Status AS BookingStatus
      FROM PAYMENT p
      JOIN BOOKING b ON p.BookingID = b.BookingID
      WHERE p.PaymentID = @paymentId
    `);
  if (!pc.recordset.length) throw new Error('Không tìm thấy payment');
  const payment = pc.recordset[0];

  // Không cho hoàn tiền nếu xe đã bắt đầu rửa hoặc đã hoàn thành
  if (payment.BookingStatus === 3) {
    throw new Error('Xe đang được rửa, không thể hoàn tiền!');
  }
  if (payment.BookingStatus === 4) {
    throw new Error('Đơn đã hoàn thành, không thể hoàn tiền!');
  }

  await pool.request().input('bookingId', sql.Int, payment.BookingID)
    .query(`
      UPDATE BOOKING SET Status = 5 WHERE BookingID = @bookingId;
      UPDATE MEMBER_PROMOTION 
      SET IsUsed = 0 
      WHERE MemberPromoID = (SELECT MemberPromoID FROM BOOKING WHERE BookingID = @bookingId);
    `);
  await pool.request().input('paymentId', sql.Int, paymentId)
    .query(`DELETE FROM PAYMENT WHERE PaymentID = @paymentId`);
  return { paymentId, refunded: true, amount: payment.Amount };
};

// Nhân viên xác nhận đã nhận tiền mặt từ khách hàng
const confirmCashDeposit = async (paymentId) => {
  const pool = await poolPromise;
  const pc = await pool.request().input('paymentId', sql.Int, paymentId)
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

  // Cập nhật trạng thái payment thành đã xác nhận (nếu có cột PaidAt chưa có giá trị)
  await pool.request().input('paymentId', sql.Int, paymentId)
    .query(`UPDATE PAYMENT SET PaidAt = GETDATE() WHERE PaymentID = @paymentId AND PaidAt IS NULL`);

  return { paymentId, confirmed: true, amount: payment.Amount, message: 'Xác nhận thanh toán tiền mặt thành công' };
};

module.exports = { createPayment, confirmVNPay, getPaymentHistory, refundPayment, getUserTier, confirmCashDeposit };
