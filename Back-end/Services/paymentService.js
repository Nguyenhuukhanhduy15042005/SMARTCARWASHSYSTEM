const { sql, poolPromise } = require('../db');
const crypto = require('crypto');
const moment = require('moment');
const querystring = require('qs');

const VNPAY_CONFIG = {
  tmnCode: process.env.VNPAY_TMN_CODE || 'I50786JJ',
  hashSecret: process.env.VNPAY_HASH_SECRET || 'Z3H1YFPAW2VN5NZ3ZXLGB2RXSGTWZ3SN',
  url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  returnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:5000/api/payments/vnpay-return',
};

/**
 * [1] sortObject
 * Sắp xếp key của object theo thứ tự ABC và encode giá trị URL.
 * VNPay yêu cầu params phải được sort trước khi tạo chữ ký HMAC-SHA512.
 */
function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

/**
 * [2] createVNPayUrl
 * Tạo URL thanh toán VNPay.
 * Input : mã giao dịch, số tiền, mô tả đơn hàng, địa chỉ IP khách hàng.
 * Output: URL redirect sang cổng thanh toán VNPay sandbox.
 * Chi tiết: tạo bộ tham số VNPay, ký HMAC-SHA512, ghép thành URL hoàn chỉnh.
 */
const createVNPayUrl = (paymentId, amount, orderInfo, ipAddr) => {
  const date = moment(new Date()).format('YYYYMMDDHHmmss');
  const expireDate = moment(new Date()).add(15, 'minutes').format('YYYYMMDDHHmmss');
  let cleanIp = ipAddr || '127.0.0.1';
  if (cleanIp === '::1' || cleanIp === '::ffff:127.0.0.1') cleanIp = '127.0.0.1';
  if (cleanIp.startsWith('::ffff:')) cleanIp = cleanIp.replace('::ffff:', '');

  const safeOrderInfo = (orderInfo || `Thanh toan ${paymentId}`)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .substring(0, 255);

  let vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: VNPAY_CONFIG.tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: String(paymentId),
    vnp_OrderInfo: safeOrderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: String(Math.round(amount) * 100),
    vnp_ReturnUrl: VNPAY_CONFIG.returnUrl,
    vnp_IpAddr: cleanIp,
    vnp_CreateDate: date,
    vnp_ExpireDate: expireDate,
  };

  vnp_Params = sortObject(vnp_Params);
  const signData = querystring.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.hashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  vnp_Params['vnp_SecureHash'] = signed;
  const paymentUrl = VNPAY_CONFIG.url + '?' + querystring.stringify(vnp_Params, { encode: false });

  console.log('SignData:', signData);
  console.log('PaymentURL:', paymentUrl);
  return paymentUrl;
};

/**
 * [3] verifyVNPayReturn
 * Xác minh tính hợp lệ của callback từ VNPay sau khi khách thanh toán.
 * Input : query params từ URL callback VNPay trả về.
 * Output: true nếu chữ ký hợp lệ VÀ vnp_ResponseCode === '00' (thành công).
 */
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

/**
 * [4] getUserTier
 * Lấy hạng thành viên (TierID) của user từ bảng MEMBER_PROFILE.
 * Output: TierID (1=Bronze, 2=Silver, 3=Gold, 4=Platinum).
 *         Mặc định trả về 1 (Bronze) nếu user chưa có profile.
 */
const getUserTier = async (userId) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .query(`SELECT TierID FROM MEMBER_PROFILE WHERE UserID = @userId`);
  return result.recordset[0]?.TierID || 1;
};

/**
 * [5] getCancelCount
 * Đếm số lần hủy booking trong 30 ngày gần nhất của khách hàng.
 * Nguồn dữ liệu: bảng BOOKING với Status=5 (Đã hủy) trong 30 ngày qua.
 * Dùng bởi: createPayment (tính forceDeposit) và refundPayment (tính refundPercent).
 * Lưu ý: Booking bị soft delete (IsHiddenByUser=1) vẫn được đếm vì Status=5 vẫn còn trong DB.
 */
const getCancelCount = async (pool, customerId) => {
  const result = await pool.request()
    .input('customerId', sql.Int, customerId)
    .query(`
      SELECT COUNT(*) AS CancelCount
      FROM BOOKING
      WHERE CustomerID = @customerId
        AND Status = 5
        AND BookingDate >= DATEADD(DAY, -30, GETDATE())
    `);
  return result.recordset[0].CancelCount || 0;
};

/**
 * [6] createPayment
 * Tạo giao dịch thanh toán mới cho một booking.
 * Logic theo method và tier:
 *   - method='vnpay'
 *       → Tạo paymentUrl VNPay để thanh toán toàn bộ
 *   - method='cash' + Bronze/Silver HOẶC Gold/Platinum đã hủy >=3 lần (forceDeposit=true)
 *       → Tính cọc 10% → Tạo paymentUrl VNPay để thu cọc online
 *   - method='cash' + Gold/Platinum chưa hủy đủ 3 lần
 *       → paymentAmount=0 → Lưu PAYMENT vào DB → Booking Status=2 ngay (miễn cọc, giữ chỗ)
 * Output: { payment, paymentUrl, tierID, depositOnly, forceDeposit, depositAmount, remainingAmount, fullAmount }
 */
const createPayment = async ({ bookingId, method, amount, userId, ipAddr }) => {
  const pool = await poolPromise;
  const bookingCheck = await pool.request()
    .input('bookingId', sql.Int, bookingId)
    .query(`SELECT BookingID, Status, FinalPrice, TotalPrice, CustomerID FROM BOOKING WHERE BookingID = @bookingId`);

  if (!bookingCheck.recordset.length) throw new Error('Không tìm thấy booking');
  const booking = bookingCheck.recordset[0];
  if (booking.Status === 5) throw new Error('Booking đã bị huỷ');

  if (booking.Status === 1) {
    await pool.request().input('bookingId', sql.Int, bookingId)
      .query(`DELETE FROM PAYMENT WHERE BookingID = @bookingId`);
  } else {
    const existingPayment = await pool.request().input('bookingId', sql.Int, bookingId)
      .query(`SELECT PaymentID FROM PAYMENT WHERE BookingID = @bookingId AND (IsHiddenByUser IS NULL OR IsHiddenByUser = 0)`);
    if (existingPayment.recordset.length) throw new Error('Booking này đã được thanh toán');
  }

  const finalAmount = amount || booking.FinalPrice || booking.TotalPrice;
  let paymentAmount = finalAmount;
  let tierID = 1;
  let depositOnly = false;
  let forceDeposit = false;

  if (method === 'cash') {
    tierID = await getUserTier(userId || booking.CustomerID);
    const cancelCount = await getCancelCount(pool, userId || booking.CustomerID);

    // Gold/Platinum hủy >= 3 lần → bắt đặt cọc như Bronze/Silver
    forceDeposit = (tierID === 3 || tierID === 4) && cancelCount >= 3;

    if (tierID === 1 || tierID === 2 || forceDeposit) {
      const calculatedDeposit = Math.round(finalAmount * 0.1);
      paymentAmount = Math.min(finalAmount, Math.max(10000, calculatedDeposit));
      depositOnly = true;
    } else {
      paymentAmount = 0; // Gold/Platinum miễn cọc
    }
  }

  let payment = null;
  let paymentUrl = null;

  if (method === 'cash' && !depositOnly) {
    // Gold/Platinum miễn cọc → lưu thẳng vào DB, chuyển Status=2 ngay
    const result = await pool.request()
      .input('bookingId', sql.Int, bookingId)
      .input('method', sql.NVarChar(50), method)
      .input('amount', sql.Decimal(18, 2), 0)
      .input('paidAt', sql.DateTime, new Date())
      .query(`INSERT INTO PAYMENT (BookingID, PaymentMethod, Amount, PaidAt) OUTPUT INSERTED.* VALUES (@bookingId, @method, @amount, @paidAt)`);
    payment = result.recordset[0];
    await pool.request().input('bookingId', sql.Int, bookingId).query(`
      UPDATE BOOKING SET Status = 2 WHERE BookingID = @bookingId;
      UPDATE MEMBER_PROMOTION SET IsUsed = 1 WHERE MemberPromoID = (SELECT MemberPromoID FROM BOOKING WHERE BookingID = @bookingId);
    `);
  } else {
    // Tạo URL VNPay để thu tiền (vnpay toàn bộ hoặc cash cọc 10%)
    const txnRef = `${bookingId}_${method}_${paymentAmount}_${Date.now()}`;
    const orderInfo = method === 'vnpay' ? `Thanh toan booking ${bookingId}` : `Dat coc booking ${bookingId}`;
    paymentUrl = createVNPayUrl(txnRef, paymentAmount, orderInfo, ipAddr);
    payment = { BookingID: bookingId, PaymentMethod: method, Amount: paymentAmount, PaidAt: new Date() };
  }

  return {
    payment, paymentUrl, tierID, depositOnly, forceDeposit,
    depositAmount: depositOnly ? paymentAmount : 0,
    remainingAmount: depositOnly ? finalAmount - paymentAmount : 0,
    fullAmount: finalAmount
  };
};

/**
 * [7] confirmVNPay
 * Xử lý callback VNPay sau khi khách hoàn tất thanh toán.
 * Logic:
 *   - isValid=true  → Lưu PAYMENT vào DB, Booking Status=2, gửi notification thành công
 *   - isValid=false → Booking Status=5, nhả voucher, giải phóng máy rửa xe, gửi notification hủy
 */
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
    const existing = await pool.request().input('bookingId', sql.Int, bookingId)
      .query(`SELECT PaymentID FROM PAYMENT WHERE BookingID = @bookingId AND (IsHiddenByUser IS NULL OR IsHiddenByUser = 0)`);
    if (existing.recordset.length === 0) {
      const insertResult = await pool.request()
        .input('bookingId', sql.Int, bookingId)
        .input('method', sql.NVarChar(50), method)
        .input('amount', sql.Decimal(18, 2), paymentAmount)
        .input('paidAt', sql.DateTime, new Date())
        .query(`INSERT INTO PAYMENT (BookingID, PaymentMethod, Amount, PaidAt) OUTPUT INSERTED.PaymentID VALUES (@bookingId, @method, @amount, @paidAt)`);
      paymentId = insertResult.recordset[0].PaymentID;
    } else {
      paymentId = existing.recordset[0].PaymentID;
    }
    await pool.request().input('bookingId', sql.Int, bookingId).query(`
      UPDATE BOOKING SET Status = 2 WHERE BookingID = @bookingId;
      UPDATE MEMBER_PROMOTION SET IsUsed = 1 WHERE MemberPromoID = (SELECT MemberPromoID FROM BOOKING WHERE BookingID = @bookingId);
    `);

    try {
      const userRes = await pool.request()
        .input('bookingId', sql.Int, bookingId)
        .query('SELECT b.CustomerID, u.Email FROM BOOKING b JOIN [USER] u ON b.CustomerID = u.UserID WHERE b.BookingID = @bookingId');
      const user = userRes.recordset[0];
      if (user) {
        const { createAndSendNotification } = require('./notificationService');
        await createAndSendNotification({
          userId: user.CustomerID,
          bookingId: bookingId,
          title: "Xác nhận đặt lịch rửa xe thành công",
          message: `Lịch đặt rửa xe của bạn (Mã đơn BK-${bookingId}) đã được xác nhận thanh toán thành công và chuyển sang trạng thái Đã nhận.`,
          type: "CONFIRMATION",
          userEmail: user.Email
        });
      }
    } catch (notiErr) {
      console.error(`[PaymentNotification] Lỗi khi gửi thông báo thành công cho BK-${bookingId}:`, notiErr.message);
    }

  } else {
    await pool.request().input('bookingId', sql.Int, bookingId).query(`
      UPDATE BOOKING SET Status = 5 WHERE BookingID = @bookingId;
      UPDATE MEMBER_PROMOTION SET IsUsed = 0 WHERE MemberPromoID = (SELECT MemberPromoID FROM BOOKING WHERE BookingID = @bookingId);
      UPDATE MACHINE SET Status = 1 WHERE MachineID = (SELECT MachineID FROM BOOKING_DETAIL WHERE BookingID = @bookingId);
    `);
    try {
      const userRes = await pool.request()
        .input('bookingId', sql.Int, bookingId)
        .query('SELECT b.CustomerID, u.Email FROM BOOKING b JOIN [USER] u ON b.CustomerID = u.UserID WHERE b.BookingID = @bookingId');
      const user = userRes.recordset[0];
      if (user) {
        const { createAndSendNotification } = require('./notificationService');
        await createAndSendNotification({
          userId: user.CustomerID,
          bookingId: bookingId,
          title: "Đơn đặt lịch bị hủy (Thanh toán không thành công)",
          message: `Đơn đặt lịch rửa xe BK-${bookingId} của bạn đã bị hủy tự động do giao dịch thanh toán qua VNPay không thành công hoặc đã bị hủy từ phía bạn.`,
          type: "CANCEL",
          userEmail: user.Email || null
        });
      }
    } catch (notiErr) {
      console.error(`[VNPayCancelNotification] Lỗi gửi thông báo hủy cho BK-${bookingId}:`, notiErr.message);
    }
  }
  return { isValid, paymentId };
};

/**
 * [8] getPaymentHistory
 * Lấy lịch sử thanh toán của user, có phân trang.
 * Lọc: chỉ lấy payment chưa bị ẩn (IsHiddenByUser = 0 hoặc NULL).
 * Output: { data, total, page, limit }
 */
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
        AND (p.IsHiddenByUser IS NULL OR p.IsHiddenByUser = 0)
      ORDER BY p.PaidAt DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
  const countResult = await pool.request().input('userId', sql.Int, userId)
    .query(`
      SELECT COUNT(*) AS total FROM PAYMENT p
      JOIN BOOKING b ON p.BookingID = b.BookingID
      WHERE b.CustomerID = @userId
        AND (p.IsHiddenByUser IS NULL OR p.IsHiddenByUser = 0)
    `);
  return { data: result.recordset, total: countResult.recordset[0].total, page: Number(page), limit: Number(limit) };
};

// ── BẢNG HOÀN TIỀN ───────────────────────────────────────────────────────────
// cancelCount = số lần ĐÃ hủy TRƯỚC ĐÓ trong 30 ngày (chưa tính lần này)
// cancelCount 0   → Lần 1:    Trước 24h=100%  2-24h=50%  Dưới 2h=0%
// cancelCount 1   → Lần 2:    Trước 24h=50%   2-24h=0%   Dưới 2h=0%
// cancelCount >=2 → Lần 3+:   0% bất kể thời gian
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [9] getRefundPercent
 * Tính % hoàn tiền dựa theo bảng chính sách hủy lịch.
 * Input : hoursLeft (giờ còn lại đến giờ rửa), cancelCount (số lần đã hủy trước đó).
 * Output: refundPercent (0 / 50 / 100).
 */
const getRefundPercent = (hoursLeft, cancelCount) => {
  if (hoursLeft < 2) return 0;
  if (cancelCount >= 2) return 0;       // Lần 3+ → 0%
  if (cancelCount === 1) return hoursLeft >= 24 ? 50 : 0;  // Lần 2
  return hoursLeft >= 24 ? 100 : 50;
};

/**
 * [10] getWarningMessage
 * Tạo chuỗi thông báo cảnh báo tiếng Việt hiển thị cho khách khi bấm hủy lịch.
 * Nội dung thay đổi tùy theo số lần hủy trong 30 ngày và thời gian còn lại đến giờ rửa.
 */
const getWarningMessage = (hoursLeft, cancelCount, refundPercent, refundAmount) => {
  const nextCount = cancelCount + 1;

  if (hoursLeft < 2)
    return `⚠️ Bạn đang hủy trong vòng 2 tiếng trước giờ rửa xe. Không được hoàn tiền.`;

  if (cancelCount >= 2)
    return `❌ Bạn đã hủy ${nextCount} lần trong 30 ngày. Không được hoàn tiền cho lần hủy này.`;

  if (cancelCount === 1) {
    if (hoursLeft >= 24)
      return `🚨 Lần hủy thứ ${nextCount} trong 30 ngày. Chỉ hoàn 50% = ${refundAmount.toLocaleString('vi-VN')}đ. Lần sau sẽ không được hoàn tiền.`;
    return `🚨 Hủy trong 2-24 tiếng (lần ${nextCount}). Không được hoàn tiền.`;
  }

  if (hoursLeft >= 24)
    return `✅ Được hoàn 100% = ${refundAmount.toLocaleString('vi-VN')}đ.`;
  return `⚠️ Hủy trong 2-24 tiếng. Chỉ hoàn 50% = ${refundAmount.toLocaleString('vi-VN')}đ.`;
};

/**
 * [11] calcRefundInfo
 * Helper nội bộ — tổng hợp thông tin hoàn tiền cho một booking cụ thể.
 * Tính: cancelCount từ DB, hoursLeft từ BookingDate, refundPercent theo bảng chính sách.
 * Dùng bởi: getRefundPreview và refundPayment.
 */
const calcRefundInfo = async (pool, bookingId, customerId) => {
  const cancelCount = await getCancelCount(pool, customerId);

  const bookingResult = await pool.request()
    .input('bookingId', sql.Int, bookingId)
    .query(`SELECT BookingDate FROM BOOKING WHERE BookingID = @bookingId`);
  const bookingDate = bookingResult.recordset[0]?.BookingDate;

  const now = new Date();
  const hoursLeft = bookingDate
    ? Math.max(0, (new Date(bookingDate) - now) / 1000 / 3600)
    : 0;

  const refundPercent = getRefundPercent(hoursLeft, cancelCount);
  return { cancelCount, hoursLeft, refundPercent };
};

/**
 * [12] getRefundPreview
 * Xem trước thông tin hoàn tiền trước khi thực sự hủy booking.
 * Đặc điểm: KHÔNG thay đổi gì trong DB, chỉ đọc và tính toán.
 * Output: { refundPercent, refundAmount, cancelCount, hoursLeft, warning, originalAmount }
 */
const getRefundPreview = async (paymentId) => {
  const pool = await poolPromise;
  const pc = await pool.request().input('paymentId', sql.Int, paymentId)
    .query(`
      SELECT p.PaymentID, p.BookingID, p.Amount, b.Status AS BookingStatus, b.CustomerID
      FROM PAYMENT p JOIN BOOKING b ON p.BookingID = b.BookingID
      WHERE p.PaymentID = @paymentId
    `);
  if (!pc.recordset.length) throw new Error('Không tìm thấy payment');
  const payment = pc.recordset[0];

  if (payment.BookingStatus === 3) throw new Error('Xe đang được rửa, không thể hủy!');
  if (payment.BookingStatus === 4) throw new Error('Đơn đã hoàn thành, không thể hủy!');
  if (payment.BookingStatus === 5) throw new Error('Booking đã bị hủy trước đó.');

  const { cancelCount, hoursLeft, refundPercent } = await calcRefundInfo(pool, payment.BookingID, payment.CustomerID);
  const refundAmount = Math.round(payment.Amount * refundPercent / 100);
  const warning = getWarningMessage(hoursLeft, cancelCount, refundPercent, refundAmount);

  return { refundPercent, refundAmount, cancelCount, hoursLeft, warning, originalAmount: payment.Amount };
};

/**
 * [13] refundPayment
 * Thực hiện hủy booking và hoàn tiền.
 * Các bước:
 *   1. Kiểm tra trạng thái booking (không hủy nếu đang rửa hoặc đã hoàn thành)
 *   2. Nếu tiền cọc (cash + Amount>0) → mất trắng, refundPercent=0%
 *      Nếu VNPay → tính refundPercent theo bảng (lần 1=100%, lần 2=50%, lần 3+=0%)
 *   3. Booking Status=5, nhả voucher, giải phóng máy rửa xe
 *   4. Soft delete payment (IsHiddenByUser=1) — giữ lại trong DB để đếm cancelCount chính xác
 *   5. Gửi notification hủy kèm số tiền hoàn
 *   6. Nếu Gold/Platinum hủy đủ 3 lần → trả về forceDepositWarning (cảnh báo lần sau bị bắt cọc 10%)
 * Output: { paymentId, refunded, originalAmount, refundPercent, refundAmount,
 *           cancelCount, warning, nextCancelInfo, forceDepositWarning }
 */
const refundPayment = async (paymentId) => {
  const pool = await poolPromise;

  const pc = await pool.request().input('paymentId', sql.Int, paymentId)
    .query(`
      SELECT p.*, b.Status AS BookingStatus, b.BookingDate, b.CustomerID
      FROM PAYMENT p JOIN BOOKING b ON p.BookingID = b.BookingID
      WHERE p.PaymentID = @paymentId
    `);
  if (!pc.recordset.length) throw new Error('Không tìm thấy payment');
  const payment = pc.recordset[0];

  if (payment.BookingStatus === 3) throw new Error('Xe đang được rửa, không thể hoàn tiền!');
  if (payment.BookingStatus === 4) throw new Error('Đơn đã hoàn thành, không thể hoàn tiền!');
  if (payment.BookingStatus === 5) throw new Error('Booking đã bị hủy trước đó!');

  const now = new Date();
  const bookingDate = new Date(payment.BookingDate);
  const hoursLeftSafe = Math.max(0, (bookingDate - now) / (1000 * 60 * 60));

  const cancelCount = await getCancelCount(pool, payment.CustomerID);
  const originalAmount = Number(payment.Amount || 0);

  // Tiền cọc cash (Bronze/Silver hoặc Gold/Platinum bị forceDeposit)
  // → Amount > 0 + PaymentMethod = 'cash' → MẤT TRẮNG, không hoàn
  const isDeposit = (payment.PaymentMethod || '').toLowerCase() === 'cash' && originalAmount > 0;

  let refundPercent = 0;
  let refundAmount = 0;
  let warning = '';

  if (isDeposit) {
    // Tiền cọc → mất trắng
    warning = `❌ Tiền cọc 10% không được hoàn lại khi hủy lịch.`;
  } else {
    // VNPay hoặc Gold/Platinum Amount=0 → tính theo bảng hoàn tiền
    refundPercent = getRefundPercent(hoursLeftSafe, cancelCount);
    refundAmount = Math.round(originalAmount * refundPercent / 100);
    warning = getWarningMessage(hoursLeftSafe, cancelCount, refundPercent, refundAmount);
  }

  console.log(`[REFUND] PaymentID:${paymentId} CustomerID:${payment.CustomerID} IsDeposit:${isDeposit} CancelCount:${cancelCount} HoursLeft:${hoursLeftSafe.toFixed(2)} RefundPercent:${refundPercent}%`);

  // Hủy booking + nhả voucher + giải phóng máy rửa xe
  await pool.request().input('bookingId', sql.Int, payment.BookingID).query(`
    UPDATE BOOKING SET Status = 5 WHERE BookingID = @bookingId;
    UPDATE MEMBER_PROMOTION SET IsUsed = 0
    WHERE MemberPromoID = (SELECT MemberPromoID FROM BOOKING WHERE BookingID = @bookingId);
    UPDATE MACHINE SET Status = 1 
    WHERE MachineID = (SELECT MachineID FROM BOOKING_DETAIL WHERE BookingID = @bookingId);
  `);

  // Soft delete payment — giữ lại record để cancelCount đếm đúng qua BOOKING.Status=5
  await pool.request().input('paymentId', sql.Int, paymentId)
    .query(`UPDATE PAYMENT SET IsHiddenByUser = 1 WHERE PaymentID = @paymentId`);

  // Gửi notification hủy + số tiền hoàn
  try {
    const userRes = await pool.request()
      .input("userId", sql.Int, payment.CustomerID)
      .query("SELECT Email FROM [USER] WHERE UserID = @userId");
    const userEmail = userRes.recordset[0]?.Email;
    const { createAndSendNotification } = require('./notificationService');
    await createAndSendNotification({
      userId: payment.CustomerID,
      bookingId: payment.BookingID,
      title: "Hủy lịch đặt xe thành công",
      message: isDeposit
        ? `Lịch đặt rửa xe của bạn (Mã đơn BK-${payment.BookingID}) đã được hủy thành công. Tiền cọc 10% không được hoàn lại.`
        : `Lịch đặt rửa xe của bạn (Mã đơn BK-${payment.BookingID}) đã được hủy thành công. Số tiền hoàn trả dự kiến: ${refundAmount.toLocaleString('vi-VN')}đ (${refundPercent}%).`,
      type: "CANCEL",
      userEmail: userEmail || null
    });
  } catch (notiErr) {
    console.error(`[RefundCancelNotification] Lỗi gửi thông báo cho BK-${payment.BookingID}:`, notiErr.message);
  }

  const newCancelCount = cancelCount + 1;
  let nextCancelInfo = null;
  if (!isDeposit) {
    if (newCancelCount >= 3) {
      nextCancelInfo = '❌ Lần hủy tiếp theo sẽ không được hoàn tiền';
    } else if (newCancelCount === 2) {
      nextCancelInfo = '⚠️ Còn 1 lần hủy được hoàn tiền trong 30 ngày';
    }
  }

  // Cảnh báo Gold/Platinum bị bắt cọc 10% từ lần đặt lịch tiếp theo
  const tierID = await getUserTier(payment.CustomerID);
  let forceDepositWarning = null;
  if ((tierID === 3 || tierID === 4) && newCancelCount >= 3) {
    forceDepositWarning = '🚨 Hạng Gold/Platinum của bạn đã hủy 3 lần. Lần đặt lịch tiếp theo sẽ phải đặt cọc 10% như Bronze/Silver!';
  }

  return {
    paymentId, refunded: true, originalAmount, refundPercent, refundAmount,
    cancelCount: newCancelCount, warning, nextCancelInfo, forceDepositWarning
  };
};

/**
 * [14] confirmCashDeposit
 * Nhân viên xác nhận đã thu tiền mặt tại quầy sau khi khách đến check-in.
 * Thao tác: cập nhật PaidAt = GETDATE() cho payment, đánh dấu đã thu tiền thực tế.
 */
const confirmCashDeposit = async (paymentId) => {
  const pool = await poolPromise;
  const pc = await pool.request().input('paymentId', sql.Int, paymentId)
    .query(`
      SELECT p.PaymentID, p.BookingID, p.Amount, p.PaymentMethod, b.Status AS BookingStatus
      FROM PAYMENT p JOIN BOOKING b ON p.BookingID = b.BookingID
      WHERE p.PaymentID = @paymentId
    `);
  if (!pc.recordset.length) throw new Error('Không tìm thấy payment với ID này');
  const payment = pc.recordset[0];

  const methodLower = (payment.PaymentMethod || '').toLowerCase();
  if (methodLower !== 'cash' && methodLower !== 'tiền mặt' && methodLower !== 'tien mat')
    throw new Error('Payment này không phải thanh toán tiền mặt!');

  await pool.request().input('paymentId', sql.Int, paymentId)
    .query(`UPDATE PAYMENT SET PaidAt = GETDATE() WHERE PaymentID = @paymentId AND PaidAt IS NULL`);

  return { paymentId, confirmed: true, amount: payment.Amount, message: 'Xác nhận thanh toán tiền mặt thành công' };
};

module.exports = { createPayment, confirmVNPay, getPaymentHistory, getRefundPreview, refundPayment, getUserTier, confirmCashDeposit };