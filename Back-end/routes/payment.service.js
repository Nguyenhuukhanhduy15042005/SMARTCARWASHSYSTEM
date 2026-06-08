const { getPool, sql } = require('../db');
const crypto = require('crypto');
const querystring = require('querystring');
 
// ─── CONFIG ───────────────────────────────────────────────────────────────────
const VNPAY_CONFIG = {
  tmnCode:    process.env.VNPAY_TMN_CODE,
  hashSecret: process.env.VNPAY_HASH_SECRET,
  url:        'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  returnUrl:  process.env.VNPAY_RETURN_URL,
};
 
const MOMO_CONFIG = {
  partnerCode: process.env.MOMO_PARTNER_CODE,
  accessKey:   process.env.MOMO_ACCESS_KEY,
  secretKey:   process.env.MOMO_SECRET_KEY,
  endpoint:    'https://test-payment.momo.vn/v2/gateway/api/create',
  returnUrl:   process.env.MOMO_RETURN_URL,
  notifyUrl:   process.env.MOMO_NOTIFY_URL,
};
 
// ─── CASH CONFIG ──────────────────────────────────────────────────────────────
// TierID 1 = Đồng, 2 = Bạc → phải đặt cọc 10%
// TierID 3 = Vàng, 4 = Bạch Kim → miễn cọc
const DEPOSIT_REQUIRED_TIERS = [1, 2];
const DEPOSIT_RATE = 0.10;
 
// ═════════════════════════════════════════════════════════════════════════════
// PHẦN 1: THANH TOÁN ONLINE (VNPay / MoMo)
// ═════════════════════════════════════════════════════════════════════════════
 
// ─── 1. KHỞI TẠO THANH TOÁN ONLINE ──────────────────────────────────────────
async function initiatePayment({ bookingId, userId, method }) {
  const pool = await getPool();
 
  const result = await pool.request()
    .input('bookingId', sql.Int, bookingId)
    .input('userId',    sql.Int, userId)
    .query(`
      SELECT b.BookingID, b.FinalPrice, b.Status, b.CustomerID
      FROM BOOKING b
      WHERE b.BookingID = @bookingId AND b.CustomerID = @userId
    `);
 
  if (!result.recordset.length) {
    throw new Error('Booking không tồn tại hoặc không thuộc về bạn');
  }
 
  const booking = result.recordset[0];
  if (booking.Status === 4) throw new Error('Booking này đã được thanh toán');
  if (booking.Status === 5) throw new Error('Booking đã bị hủy');
 
  const existPay = await pool.request()
    .input('bookingId', sql.Int, bookingId)
    .query(`SELECT PaymentID FROM PAYMENT WHERE BookingID = @bookingId`);
 
  if (existPay.recordset.length) {
    throw new Error('Booking này đã có giao dịch đang xử lý');
  }
 
  const amount = Math.round(booking.FinalPrice);
 
  if (method === 'VNPAY') return _buildVNPayUrl(bookingId, amount);
  if (method === 'MOMO')  return await _buildMoMoUrl(bookingId, amount);
  throw new Error('Phương thức không hợp lệ. Dùng: VNPAY hoặc MOMO');
}
 
// ─── 2. TẠO URL VNPAY ────────────────────────────────────────────────────────
function _buildVNPayUrl(bookingId, amount) {
  const date = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const createDate =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
 
  const params = {
    vnp_Version:    '2.1.0',
    vnp_Command:    'pay',
    vnp_TmnCode:    VNPAY_CONFIG.tmnCode,
    vnp_Locale:     'vn',
    vnp_CurrCode:   'VND',
    vnp_TxnRef:     `SCW_${bookingId}_${Date.now()}`,
    vnp_OrderInfo:  `Thanh toan booking #${bookingId}`,
    vnp_OrderType:  'other',
    vnp_Amount:     amount * 100,
    vnp_ReturnUrl:  VNPAY_CONFIG.returnUrl,
    vnp_IpAddr:     '127.0.0.1',
    vnp_CreateDate: createDate,
  };
 
  const sorted = Object.keys(params).sort().reduce((acc, k) => {
    acc[k] = params[k];
    return acc;
  }, {});
 
  const signData = querystring.stringify(sorted, { encode: false });
  const signed = crypto
    .createHmac('sha512', VNPAY_CONFIG.hashSecret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');
 
  sorted.vnp_SecureHash = signed;
  const paymentUrl = `${VNPAY_CONFIG.url}?${querystring.stringify(sorted, { encode: false })}`;
 
  return { paymentUrl, method: 'VNPAY', bookingId };
}
 
// ─── 3. TẠO URL MOMO ─────────────────────────────────────────────────────────
async function _buildMoMoUrl(bookingId, amount) {
  const orderId     = `SCW_${bookingId}_${Date.now()}`;
  const requestId   = `REQ_${Date.now()}`;
  const orderInfo   = `Thanh toan booking #${bookingId}`;
  const extraData   = '';
  const requestType = 'payWithATM';
 
  const rawSignature =
    `accessKey=${MOMO_CONFIG.accessKey}` +
    `&amount=${amount}` +
    `&extraData=${extraData}` +
    `&ipnUrl=${MOMO_CONFIG.notifyUrl}` +
    `&orderId=${orderId}` +
    `&orderInfo=${orderInfo}` +
    `&partnerCode=${MOMO_CONFIG.partnerCode}` +
    `&redirectUrl=${MOMO_CONFIG.returnUrl}` +
    `&requestId=${requestId}` +
    `&requestType=${requestType}`;
 
  const signature = crypto
    .createHmac('sha256', MOMO_CONFIG.secretKey)
    .update(rawSignature)
    .digest('hex');
 
  const body = {
    partnerCode: MOMO_CONFIG.partnerCode,
    partnerName: 'SmartCarWash',
    storeId:     'SmartCarWash_01',
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl: MOMO_CONFIG.returnUrl,
    ipnUrl:      MOMO_CONFIG.notifyUrl,
    lang:        'vi',
    extraData,
    requestType,
    signature,
  };
 
  const resp = await fetch(MOMO_CONFIG.endpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
 
  const data = await resp.json();
  if (data.resultCode !== 0) throw new Error(`MoMo lỗi: ${data.message}`);
 
  return { paymentUrl: data.payUrl, method: 'MOMO', bookingId };
}
 
// ─── 4. CALLBACK VNPAY ───────────────────────────────────────────────────────
async function handleVNPayCallback(query) {
  const { vnp_SecureHash, vnp_TxnRef, vnp_ResponseCode, vnp_Amount, ...rest } = query;
 
  const params = { ...rest, vnp_Amount, vnp_ResponseCode, vnp_TxnRef };
  const sorted = Object.keys(params).sort().reduce((acc, k) => {
    if (k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType') acc[k] = params[k];
    return acc;
  }, {});
 
  const signData = querystring.stringify(sorted, { encode: false });
  const computed = crypto
    .createHmac('sha512', VNPAY_CONFIG.hashSecret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');
 
  if (computed !== vnp_SecureHash) throw new Error('Chữ ký không hợp lệ');
 
  const bookingId = parseInt(vnp_TxnRef.split('_')[1]);
  const success   = vnp_ResponseCode === '00';
  const amount    = parseInt(vnp_Amount) / 100;
 
  if (success) {
    await _confirmOnlinePayment({ bookingId, amount, method: 'VNPAY', txnRef: vnp_TxnRef });
  }
 
  return { success, bookingId };
}
 
// ─── 5. CALLBACK MOMO ────────────────────────────────────────────────────────
async function handleMoMoCallback(body) {
  const { partnerCode, orderId, requestId, amount, resultCode, signature, ...rest } = body;
 
  const rawSignature =
    `accessKey=${MOMO_CONFIG.accessKey}` +
    `&amount=${amount}` +
    `&extraData=${rest.extraData ?? ''}` +
    `&message=${rest.message}` +
    `&orderId=${orderId}` +
    `&orderInfo=${rest.orderInfo}` +
    `&orderType=${rest.orderType}` +
    `&partnerCode=${partnerCode}` +
    `&payType=${rest.payType}` +
    `&requestId=${requestId}` +
    `&responseTime=${rest.responseTime}` +
    `&resultCode=${resultCode}` +
    `&transId=${rest.transId}`;
 
  const computed = crypto
    .createHmac('sha256', MOMO_CONFIG.secretKey)
    .update(rawSignature)
    .digest('hex');
 
  if (computed !== signature) throw new Error('Chữ ký MoMo không hợp lệ');
 
  const bookingId = parseInt(orderId.split('_')[1]);
  const success   = resultCode === 0;
 
  if (success) {
    await _confirmOnlinePayment({ bookingId, amount, method: 'MOMO', txnRef: orderId });
  }
 
  return { success, bookingId };
}
 
// ─── 6. LƯU PAYMENT ONLINE VÀO DB ───────────────────────────────────────────
async function _confirmOnlinePayment({ bookingId, amount, method, txnRef }) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
 
  try {
    await transaction.begin();
 
    const payReq = new sql.Request(transaction);
    await payReq
      .input('bookingId', sql.Int,          bookingId)
      .input('method',    sql.NVarChar(100), method)
      .input('amount',    sql.Decimal(12,2), amount)
      .query(`
        INSERT INTO PAYMENT (BookingID, PaymentMethod, Amount, PaidAt)
        VALUES (@bookingId, @method, @amount, GETDATE())
      `);
 
    const updReq = new sql.Request(transaction);
    await updReq
      .input('bookingId', sql.Int, bookingId)
      .query(`UPDATE BOOKING SET Status = 4 WHERE BookingID = @bookingId`);
 
    const userReq = new sql.Request(transaction);
    const userRes = await userReq
      .input('bookingId', sql.Int, bookingId)
      .query(`
        SELECT b.CustomerID, b.FinalPrice, u.RoleID
        FROM BOOKING b
        INNER JOIN [USER] u ON b.CustomerID = u.UserID
        WHERE b.BookingID = @bookingId
      `);
 
    const { CustomerID, FinalPrice, RoleID } = userRes.recordset[0];
    if (RoleID === 3) await _earnPoints(transaction, CustomerID, bookingId, FinalPrice);
 
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
 
// ─── 7. CỘNG ĐIỂM LOYALTY ────────────────────────────────────────────────────
async function _earnPoints(transaction, userId, bookingId, finalPrice) {
  const points = Math.floor(finalPrice / 10000);
  if (points <= 0) return;
 
  const req = new sql.Request(transaction);
  await req
    .input('userId',    sql.Int, userId)
    .input('bookingId', sql.Int, bookingId)
    .input('points',    sql.Int, points)
    .query(`
      UPDATE MEMBER_PROFILE
      SET CurrentPoints     = CurrentPoints + @points,
          AccumulatedPoints = AccumulatedPoints + @points
      WHERE UserID = @userId;
 
      INSERT INTO LOYALTY_TRANSACTION (UserID, BookingID, TransactionType, Points)
      VALUES (@userId, @bookingId, 'EARN', @points);
    `);
}
 
// ─── 8. LỊCH SỬ THANH TOÁN CỦA NGƯỜI DÙNG ───────────────────────────────────
async function getMyPaymentHistory(userId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT
        p.PaymentID,
        p.PaymentMethod,
        p.Amount,
        p.PaidAt,
        b.BookingID,
        b.VehicleType,
        b.LicensePlate,
        b.Status AS BookingStatus,
        b.TotalPrice,
        b.FinalPrice
      FROM PAYMENT p
      INNER JOIN BOOKING b ON p.BookingID = b.BookingID
      WHERE b.CustomerID = @userId AND p.Amount > 0
      ORDER BY p.PaidAt DESC
    `);
 
  return result.recordset;
}
 
// ═════════════════════════════════════════════════════════════════════════════
// PHẦN 2: THANH TOÁN TIỀN MẶT (Cash + Đặt cọc theo hạng thành viên)
// ═════════════════════════════════════════════════════════════════════════════
//
// Luồng:
//   Đồng / Bạc  → đặt cọc 10% online khi đặt lịch → đến nơi thu 90% tiền mặt
//                 nếu hủy → MẤT cọc (giữ lại làm phí hủy)
//   Vàng / Bạch Kim → không cần cọc → đến nơi thu 100% tiền mặt
//   Guest       → xử lý như Đồng (bắt cọc)
//
// PaymentMethod trong bảng PAYMENT:
//   DEPOSIT_PENDING   → cọc chờ thanh toán (PaidAt = NULL)
//   DEPOSIT_PAID      → cọc đã thanh toán thành công
//   DEPOSIT_FORFEITED → cọc bị giữ lại do khách hủy
//   CASH              → tiền mặt thu tại quầy
// ─────────────────────────────────────────────────────────────────────────────
 
// ─── 1. KHỞI TẠO THANH TOÁN TIỀN MẶT ────────────────────────────────────────
async function initiateCashPayment({ userId, serviceIds, vehicleType, licensePlate, memberPromoId }) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
 
  try {
    await transaction.begin();
 
    // 1. Lấy thông tin user + hạng thành viên
    const userReq = new sql.Request(transaction);
    const userRes = await userReq
      .input('userId', sql.Int, userId)
      .query(`
        SELECT
          u.UserID,
          u.RoleID,
          mp.TierID,
          lt.TierName
        FROM [USER] u
        LEFT JOIN MEMBER_PROFILE mp ON u.UserID  = mp.UserID
        LEFT JOIN LOYALTY_TIER   lt ON mp.TierID = lt.TierID
        WHERE u.UserID = @userId
      `);
 
    const user = userRes.recordset[0];
    if (!user) throw new Error('Không tìm thấy người dùng');
 
    // Guest không có tier → xử lý như hạng Đồng (bắt cọc)
    const tierID        = user.TierID ?? 1;
    const requireDeposit = DEPOSIT_REQUIRED_TIERS.includes(tierID);
 
    // 2. Tính tổng giá dịch vụ
    const safeReq = new sql.Request(transaction);
    serviceIds.forEach((id, i) => safeReq.input(`svc${i}`, sql.Int, id));
    const inClause = serviceIds.map((_, i) => `@svc${i}`).join(',');
 
    const priceRes = await safeReq.query(
      `SELECT ServiceID, BasePrice FROM SERVICE WHERE ServiceID IN (${inClause})`
    );
    if (!priceRes.recordset.length) throw new Error('Không tìm thấy dịch vụ');
 
    const totalPrice = priceRes.recordset.reduce((s, r) => s + parseFloat(r.BasePrice), 0);
 
    // 3. Áp voucher nếu có
    let finalPrice = totalPrice;
    if (memberPromoId) {
      const promoReq = new sql.Request(transaction);
      const promoRes = await promoReq
        .input('mPromoId', sql.Int, memberPromoId)
        .input('userId',   sql.Int, userId)
        .query(`
          SELECT p.DiscountPercent
          FROM MEMBER_PROMOTION mpr
          INNER JOIN PROMOTION p ON mpr.PromotionID = p.PromotionID
          WHERE mpr.MemberPromoID = @mPromoId
            AND mpr.UserID        = @userId
            AND mpr.IsUsed        = 0
        `);
 
      if (promoRes.recordset[0]) {
        finalPrice = totalPrice * (1 - promoRes.recordset[0].DiscountPercent / 100);
      }
    }
 
    // 4. Tính tiền cọc
    const depositAmount = requireDeposit ? Math.round(finalPrice * DEPOSIT_RATE) : 0;
 
    // 5. Tạo BOOKING (Status = 1: Created)
    const bookingReq = new sql.Request(transaction);
    const bookingRes = await bookingReq
      .input('customerId',    sql.Int,           userId)
      .input('memberPromoId', sql.Int,           memberPromoId || null)
      .input('vehicleType',   sql.NVarChar(100), vehicleType)
      .input('licensePlate',  sql.NVarChar(20),  licensePlate)
      .input('totalPrice',    sql.Decimal(12,2), totalPrice)
      .input('finalPrice',    sql.Decimal(12,2), finalPrice)
      .query(`
        INSERT INTO BOOKING
          (CustomerID, MemberPromoID, VehicleType, LicensePlate, TotalPrice, FinalPrice, Status)
        OUTPUT INSERTED.BookingID
        VALUES
          (@customerId, @memberPromoId, @vehicleType, @licensePlate, @totalPrice, @finalPrice, 1)
      `);
 
    const bookingId = bookingRes.recordset[0].BookingID;
 
    // 6. Tạo BOOKING_DETAIL cho từng dịch vụ
    for (const row of priceRes.recordset) {
      const detReq = new sql.Request(transaction);
      await detReq
        .input('bookingId',      sql.Int,           bookingId)
        .input('serviceId',      sql.Int,           row.ServiceID)
        .input('priceAtBooking', sql.Decimal(12,2), row.BasePrice)
        .query(`
          INSERT INTO BOOKING_DETAIL (BookingID, ServiceID, PriceAtBooking)
          VALUES (@bookingId, @serviceId, @priceAtBooking)
        `);
    }
 
    // 7. Tạo bản ghi DEPOSIT_PENDING nếu cần cọc
    if (requireDeposit && depositAmount > 0) {
      const depositReq = new sql.Request(transaction);
      await depositReq
        .input('bookingId',     sql.Int,           bookingId)
        .input('depositAmount', sql.Decimal(12,2), depositAmount)
        .query(`
          INSERT INTO PAYMENT (BookingID, PaymentMethod, Amount, PaidAt)
          VALUES (@bookingId, 'DEPOSIT_PENDING', @depositAmount, NULL)
        `);
      // PaidAt = NULL → chưa thanh toán, sẽ cập nhật sau khi VNPay/MoMo callback
    }
 
    // 8. Đánh dấu voucher đã dùng
    if (memberPromoId) {
      const usedReq = new sql.Request(transaction);
      await usedReq
        .input('mPromoId', sql.Int, memberPromoId)
        .query(`UPDATE MEMBER_PROMOTION SET IsUsed = 1 WHERE MemberPromoID = @mPromoId`);
    }
 
    await transaction.commit();
 
    return {
      bookingId,
      tierID,
      tierName:        user.TierName ?? 'Guest',
      requireDeposit,
      depositAmount,
      remainingAmount: finalPrice - depositAmount,
      totalPrice,
      finalPrice,
      message: requireDeposit
        ? `Hạng ${user.TierName ?? 'Guest'}: vui lòng đặt cọc ${depositAmount.toLocaleString('vi')}₫ (10%) để giữ chỗ. Tiền cọc sẽ bị giữ lại nếu hủy.`
        : `Hạng ${user.TierName}: miễn phí giữ chỗ, thanh toán toàn bộ khi đến nơi.`,
    };
 
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
 
// ─── 2. XÁC NHẬN ĐẶT CỌC THÀNH CÔNG ─────────────────────────────────────────
// Gọi sau khi VNPay/MoMo callback xác nhận cọc đã được thanh toán
async function confirmDeposit(bookingId, txnRef) {
  const pool = await getPool();
 
  const result = await pool.request()
    .input('bookingId', sql.Int,           bookingId)
    .input('txnRef',    sql.NVarChar(100), txnRef)
    .query(`
      UPDATE PAYMENT
      SET PaymentMethod = 'DEPOSIT_PAID',
          PaidAt        = GETDATE()
      OUTPUT INSERTED.*
      WHERE BookingID     = @bookingId
        AND PaymentMethod = 'DEPOSIT_PENDING'
        AND PaidAt IS NULL
    `);
 
  if (!result.recordset.length) {
    throw new Error('Không tìm thấy khoản đặt cọc đang chờ');
  }
 
  return result.recordset[0];
}
 
// ─── 3. STAFF THU TIỀN MẶT KHI KHÁCH ĐẾN ────────────────────────────────────
// Tính phần còn lại sau cọc và thu bằng tiền mặt, cập nhật booking → CheckedIn
async function collectCashOnArrival({ bookingId, staffId }) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
 
  try {
    await transaction.begin();
 
    const bookingReq = new sql.Request(transaction);
    const bookingRes = await bookingReq
      .input('bookingId', sql.Int, bookingId)
      .query(`
        SELECT
          b.BookingID,
          b.CustomerID,
          b.FinalPrice,
          b.Status,
          u.RoleID,
          ISNULL(
            SUM(CASE WHEN p.PaidAt IS NOT NULL AND p.Amount > 0 THEN p.Amount ELSE 0 END),
            0
          ) AS AlreadyPaid
        FROM BOOKING b
        INNER JOIN [USER] u ON b.CustomerID = u.UserID
        LEFT  JOIN PAYMENT p ON b.BookingID  = p.BookingID
        WHERE b.BookingID = @bookingId
        GROUP BY b.BookingID, b.CustomerID, b.FinalPrice, b.Status, u.RoleID
      `);
 
    const booking = bookingRes.recordset[0];
    if (!booking)               throw new Error('Không tìm thấy booking');
    if (booking.Status === 4)   throw new Error('Booking đã hoàn thành');
    if (booking.Status === 5)   throw new Error('Booking đã bị hủy');
 
    const remainingAmount = Math.max(
      0,
      parseFloat(booking.FinalPrice) - parseFloat(booking.AlreadyPaid)
    );
 
    // Ghi PAYMENT tiền mặt cho phần còn lại
    if (remainingAmount > 0) {
      const payReq = new sql.Request(transaction);
      await payReq
        .input('bookingId', sql.Int,           bookingId)
        .input('amount',    sql.Decimal(12,2), remainingAmount)
        .query(`
          INSERT INTO PAYMENT (BookingID, PaymentMethod, Amount, PaidAt)
          VALUES (@bookingId, 'CASH', @amount, GETDATE())
        `);
    }
 
    // Cập nhật booking → CheckedIn (Status = 2)
    const updReq = new sql.Request(transaction);
    await updReq
      .input('bookingId', sql.Int, bookingId)
      .query(`
        UPDATE BOOKING
        SET Status      = 2,
            CheckInTime = GETDATE()
        WHERE BookingID = @bookingId
      `);
 
    await transaction.commit();
 
    return {
      bookingId,
      alreadyPaid:     parseFloat(booking.AlreadyPaid),
      remainingAmount,
      finalPrice:      parseFloat(booking.FinalPrice),
      message: remainingAmount === 0
        ? 'Khách đã thanh toán đầy đủ qua đặt cọc'
        : `Thu tiền mặt ${remainingAmount.toLocaleString('vi')}₫ thành công`,
    };
 
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
 
// ─── 4. HỦY BOOKING → GIỮ LUÔN TIỀN CỌC ────────────────────────────────────
// Tiền cọc 10% là phí giữ chỗ — khách hủy thì MẤT CỌC, không hoàn lại
async function cancelBookingWithForfeit({ bookingId, cancelledBy }) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
 
  try {
    await transaction.begin();
 
    // Lấy thông tin booking + trạng thái cọc
    const checkReq = new sql.Request(transaction);
    const checkRes = await checkReq
      .input('bookingId', sql.Int, bookingId)
      .query(`
        SELECT
          b.BookingID,
          b.Status,
          b.CustomerID,
          p.PaymentID,
          p.Amount      AS DepositAmount,
          p.PaymentMethod
        FROM BOOKING b
        LEFT JOIN PAYMENT p
          ON  b.BookingID     = p.BookingID
          AND p.PaymentMethod = 'DEPOSIT_PAID'
          AND p.PaidAt IS NOT NULL
        WHERE b.BookingID = @bookingId
      `);
 
    const data = checkRes.recordset[0];
    if (!data)              throw new Error('Không tìm thấy booking');
    if (data.Status === 3)  throw new Error('Không thể hủy khi xe đang được rửa');
    if (data.Status === 5)  throw new Error('Booking đã hủy trước đó');
 
    // Hủy booking → Status = 5
    const cancelReq = new sql.Request(transaction);
    await cancelReq
      .input('bookingId', sql.Int, bookingId)
      .query(`UPDATE BOOKING SET Status = 5 WHERE BookingID = @bookingId`);
 
    // Nếu đã đặt cọc → đổi PaymentMethod thành DEPOSIT_FORFEITED (giữ lại, không hoàn)
    let forfeitedAmount = 0;
    if (data.PaymentID && data.DepositAmount > 0) {
      forfeitedAmount = parseFloat(data.DepositAmount);
 
      const forfeitReq = new sql.Request(transaction);
      await forfeitReq
        .input('bookingId', sql.Int, bookingId)
        .query(`
          UPDATE PAYMENT
          SET PaymentMethod = 'DEPOSIT_FORFEITED'
          WHERE BookingID     = @bookingId
            AND PaymentMethod = 'DEPOSIT_PAID'
        `);
      // Amount vẫn dương → tính là doanh thu của cửa hàng
      // Không tạo bản ghi âm, không hoàn tiền
    }
 
    await transaction.commit();
 
    return {
      bookingId,
      cancelled:      true,
      forfeitedAmount,
      refundAmount:   0,
      message: forfeitedAmount > 0
        ? `Đã hủy booking. Tiền cọc ${forfeitedAmount.toLocaleString('vi')}₫ bị giữ lại do khách hủy.`
        : 'Đã hủy booking. Không có khoản cọc nào cần xử lý.',
    };
 
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
 
// ═════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════════
module.exports = {
  // Online (VNPay / MoMo)
  initiatePayment,
  handleVNPayCallback,
  handleMoMoCallback,
  getMyPaymentHistory,
 
  // Cash + Deposit theo hạng thành viên
  initiateCashPayment,
  confirmDeposit,
  collectCashOnArrival,
  cancelBookingWithForfeit,
};