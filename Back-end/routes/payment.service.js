const { getPool, sql } = require('../db');
const crypto = require('crypto');
const querystring = require('querystring');

// ═════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═════════════════════════════════════════════════════════════════════════════

const VNPAY_CONFIG = {
  tmnCode: process.env.VNPAY_TMN_CODE,
  hashSecret: process.env.VNPAY_HASH_SECRET,
  url: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  returnUrl: process.env.VNPAY_RETURN_URL,
};

// Đồng + Bạc phải đặt cọc
const DEPOSIT_REQUIRED_TIERS = [1, 2];
const DEPOSIT_RATE = 0.10;

// ═════════════════════════════════════════════════════════════════════════════
// VNPAY
// ═════════════════════════════════════════════════════════════════════════════

async function initiateVNPayPayment({
  bookingId,
  userId,
  clientIp,
}) {
  const pool = await getPool();

  const result = await pool.request()
    .input('bookingId', sql.Int, bookingId)
    .input('userId', sql.Int, userId)
    .query(`
      SELECT
        BookingID,
        CustomerID,
        FinalPrice,
        Status
      FROM BOOKING
      WHERE BookingID = @bookingId
        AND CustomerID = @userId
    `);

  if (!result.recordset.length) {
    throw new Error('Booking không tồn tại hoặc không thuộc về bạn');
  }

  const booking = result.recordset[0];

  if (booking.Status === 4) {
    throw new Error('Booking đã được thanh toán');
  }

  if (booking.Status === 5) {
    throw new Error('Booking đã bị hủy');
  }

  // Kiểm tra có phải luồng đặt cọc hay không
  const depositCheck = await pool.request()
    .input('bookingId', sql.Int, bookingId)
    .query(`
      SELECT TOP 1 *
      FROM PAYMENT
      WHERE BookingID = @bookingId
        AND PaymentMethod = 'DEPOSIT_PENDING'
    `);

  const isDepositPayment = depositCheck.recordset.length > 0;

  const amount = isDepositPayment
    ? Number(depositCheck.recordset[0].Amount)
    : Number(booking.FinalPrice);

  const paymentUrl = _buildVNPayUrl({
    bookingId,
    amount,
    clientIp: clientIp || '127.0.0.1',
    paymentType: isDepositPayment ? 'DEPOSIT' : 'FULL',
  });

  return {
    bookingId,
    paymentType: isDepositPayment ? 'DEPOSIT' : 'FULL',
    amount,
    paymentUrl,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// BUILD VNPAY URL
// ═════════════════════════════════════════════════════════════════════════════

function _buildVNPayUrl({
  bookingId,
  amount,
  clientIp,
  paymentType,
}) {
  const date = new Date();

  const pad = (n) => String(n).padStart(2, '0');

  const createDate =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

  const txnRef = `SCW_${bookingId}_${Date.now()}`;

  const orderInfo =
    paymentType === 'DEPOSIT'
      ? `DEPOSIT_${bookingId}`
      : `FULL_${bookingId}`;

  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: VNPAY_CONFIG.tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: Math.round(amount) * 100,
    vnp_ReturnUrl: VNPAY_CONFIG.returnUrl,
    vnp_IpAddr: clientIp,
    vnp_CreateDate: createDate,
  };

  const sorted = {};

  Object.keys(params)
    .sort()
    .forEach((k) => {
      sorted[k] = params[k];
    });

  const signData = querystring.stringify(sorted);

  const secureHash = crypto
    .createHmac('sha512', VNPAY_CONFIG.hashSecret)
    .update(Buffer.from(signData, 'utf8'))
    .digest('hex');

  sorted.vnp_SecureHash = secureHash;

  return `${VNPAY_CONFIG.url}?${querystring.stringify(sorted)}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// CALLBACK VNPAY
// ═════════════════════════════════════════════════════════════════════════════

async function handleVNPayCallback(query) {
  const secureHash = query.vnp_SecureHash;

  const verifyParams = { ...query };

  delete verifyParams.vnp_SecureHash;
  delete verifyParams.vnp_SecureHashType;

  const sorted = {};

  Object.keys(verifyParams)
    .sort()
    .forEach((k) => {
      sorted[k] = verifyParams[k];
    });

  const signData = querystring.stringify(sorted);

  const computedHash = crypto
    .createHmac('sha512', VNPAY_CONFIG.hashSecret)
    .update(Buffer.from(signData, 'utf8'))
    .digest('hex');

  if (computedHash !== secureHash) {
    throw new Error('Chữ ký VNPay không hợp lệ');
  }

  const bookingId = parseInt(
    query.vnp_TxnRef.split('_')[1]
  );

  const amount =
    parseInt(query.vnp_Amount) / 100;

  const success =
    query.vnp_ResponseCode === '00';

  if (!success) {
    return {
      success: false,
      bookingId,
    };
  }

  const orderInfo =
    query.vnp_OrderInfo || '';

  // FULL PAYMENT
  if (orderInfo.startsWith('FULL_')) {
    await _savePaymentAndComplete({
      bookingId,
      amount,
      method: 'VNPAY',
    });
  }

  // DEPOSIT PAYMENT
  if (orderInfo.startsWith('DEPOSIT_')) {
    await confirmDeposit(bookingId);
  }

  return {
    success: true,
    bookingId,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// FULL PAYMENT
// ═════════════════════════════════════════════════════════════════════════════

async function _savePaymentAndComplete({
  bookingId,
  amount,
  method,
}) {
  const pool = await getPool();

  const transaction =
    new sql.Transaction(pool);

  try {
    await transaction.begin();

    const paymentReq =
      new sql.Request(transaction);

    await paymentReq
      .input(
        'bookingId',
        sql.Int,
        bookingId
      )
      .input(
        'method',
        sql.NVarChar(100),
        method
      )
      .input(
        'amount',
        sql.Decimal(12, 2),
        amount
      )
      .query(`
        INSERT INTO PAYMENT
        (
          BookingID,
          PaymentMethod,
          Amount,
          PaidAt
        )
        VALUES
        (
          @bookingId,
          @method,
          @amount,
          GETDATE()
        )
      `);

    const bookingReq =
      new sql.Request(transaction);

    await bookingReq
      .input(
        'bookingId',
        sql.Int,
        bookingId
      )
      .query(`
        UPDATE BOOKING
        SET Status = 4
        WHERE BookingID = @bookingId
      `);

    const userReq =
      new sql.Request(transaction);

    const userRes = await userReq
      .input(
        'bookingId',
        sql.Int,
        bookingId
      )
      .query(`
        SELECT
          b.CustomerID,
          b.FinalPrice,
          u.RoleID
        FROM BOOKING b
        INNER JOIN [USER] u
          ON b.CustomerID = u.UserID
        WHERE b.BookingID = @bookingId
      `);

    if (userRes.recordset.length) {
      const {
        CustomerID,
        FinalPrice,
        RoleID,
      } = userRes.recordset[0];

      if (RoleID === 3) {
        await _earnPoints(
          transaction,
          CustomerID,
          bookingId,
          FinalPrice
        );
      }
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// LOYALTY POINT
// ═════════════════════════════════════════════════════════════════════════════

async function _earnPoints(
  transaction,
  userId,
  bookingId,
  finalPrice
) {
  const points =
    Math.floor(
      Number(finalPrice) / 10000
    );

  if (points <= 0) {
    return;
  }

  const req =
    new sql.Request(transaction);

  await req
    .input(
      'userId',
      sql.Int,
      userId
    )
    .input(
      'bookingId',
      sql.Int,
      bookingId
    )
    .input(
      'points',
      sql.Int,
      points
    )
    .query(`
      UPDATE MEMBER_PROFILE
      SET
        CurrentPoints =
          CurrentPoints + @points,

        AccumulatedPoints =
          AccumulatedPoints + @points

      WHERE UserID = @userId;

      INSERT INTO LOYALTY_TRANSACTION
      (
        UserID,
        BookingID,
        TransactionType,
        Points
      )
      VALUES
      (
        @userId,
        @bookingId,
        'EARN',
        @points
      );
    `);
}

// ═════════════════════════════════════════════════════════════════════════════
// PAYMENT HISTORY
// ═════════════════════════════════════════════════════════════════════════════

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
      INNER JOIN BOOKING b
        ON p.BookingID = b.BookingID

      WHERE b.CustomerID = @userId

      ORDER BY p.PaidAt DESC
    `);

  return result.recordset;
}

// ═════════════════════════════════════════════════════════════════════════════
// CASH PAYMENT
// ═════════════════════════════════════════════════════════════════════════════

async function initiateCashPayment({
  userId,
  serviceIds,
  vehicleType,
  licensePlate,
  memberPromoId,
}) {
  const pool = await getPool();

  const transaction =
    new sql.Transaction(pool);

  try {
    await transaction.begin();

    const userRes = await new sql.Request(transaction)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT
          mp.TierID,
          lt.TierName

        FROM [USER] u

        LEFT JOIN MEMBER_PROFILE mp
          ON u.UserID = mp.UserID

        LEFT JOIN LOYALTY_TIER lt
          ON mp.TierID = lt.TierID

        WHERE u.UserID = @userId
      `);

    const user = userRes.recordset[0];

    const tierID =
      user?.TierID || 1;

    const requireDeposit =
      DEPOSIT_REQUIRED_TIERS.includes(
        tierID
      );

    const svcReq =
      new sql.Request(transaction);

    serviceIds.forEach((id, index) => {
      svcReq.input(
        `svc${index}`,
        sql.Int,
        id
      );
    });

  const inClause =
      serviceIds
        .map((_, i) => `@svc${i}`)
        .join(',');

    const serviceRes =
      await svcReq.query(`
        SELECT
          ServiceID,
          BasePrice
        FROM SERVICE
        WHERE ServiceID IN (${inClause})
      `);

    const totalPrice =
      serviceRes.recordset.reduce(
        (sum, item) =>
          sum + Number(item.BasePrice),
        0
      );

    let finalPrice = totalPrice;

    const bookingRes =
      await new sql.Request(transaction)
        .input(
          'customerId',
          sql.Int,
          userId
        )
        .input(
          'memberPromoId',
          sql.Int,
          memberPromoId || null
        )
        .input(
          'vehicleType',
          sql.NVarChar(100),
          vehicleType
        )
        .input(
          'licensePlate',
          sql.NVarChar(30),
          licensePlate
        )
        .input(
          'totalPrice',
          sql.Decimal(12,2),
          totalPrice
        )
        .input(
          'finalPrice',
          sql.Decimal(12,2),
          finalPrice
        )
        .query(`
          INSERT INTO BOOKING
          (
            CustomerID,
            MemberPromoID,
            VehicleType,
            LicensePlate,
            TotalPrice,
            FinalPrice,
            Status
          )

          OUTPUT INSERTED.BookingID

          VALUES
          (
            @customerId,
            @memberPromoId,
            @vehicleType,
            @licensePlate,
            @totalPrice,
            @finalPrice,
            1
          )
        `);

    const bookingId =
      bookingRes.recordset[0].BookingID;

    for (const item of serviceRes.recordset) {
      await new sql.Request(transaction)
        .input(
          'bookingId',
          sql.Int,
          bookingId
        )
        .input(
          'serviceId',
          sql.Int,
          item.ServiceID
        )
        .input(
          'price',
          sql.Decimal(12,2),
          item.BasePrice
        )
        .query(`
          INSERT INTO BOOKING_DETAIL
          (
            BookingID,
            ServiceID,
            PriceAtBooking
          )
          VALUES
          (
            @bookingId,
            @serviceId,
            @price
          )
        `);
    }

    const depositAmount =
      requireDeposit
        ? Math.round(
            finalPrice *
            DEPOSIT_RATE
          )
        : 0;

    if (
      requireDeposit &&
      depositAmount > 0
    ) {
      await new sql.Request(transaction)
        .input(
          'bookingId',
          sql.Int,
          bookingId
        )
        .input(
          'deposit',
          sql.Decimal(12,2),
          depositAmount
        )
        .query(`
          INSERT INTO PAYMENT
          (
            BookingID,
            PaymentMethod,
            Amount,
            PaidAt
          )
          VALUES
          (
            @bookingId,
            'DEPOSIT_PENDING',
            @deposit,
            NULL
          )
        `);
    }

    await transaction.commit();

    return {
      bookingId,
      tierID,
      tierName:
        user?.TierName ||
        'Guest',

      requireDeposit,
      depositAmount,

      remainingAmount:
        finalPrice -
        depositAmount,

      totalPrice,
      finalPrice,
    };

  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// CONFIRM DEPOSIT
// ═════════════════════════════════════════════════════════════════════════════

async function confirmDeposit(
  bookingId
) {
  const pool = await getPool();

  const result =
    await pool.request()
      .input(
        'bookingId',
        sql.Int,
        bookingId
      )
      .query(`
        UPDATE PAYMENT

        SET
          PaymentMethod =
            'DEPOSIT_PAID',

          PaidAt =
            GETDATE()

        OUTPUT INSERTED.*

        WHERE BookingID = @bookingId
        AND PaymentMethod =
          'DEPOSIT_PENDING'
      `);

  if (
    !result.recordset.length
  ) {
    throw new Error(
      'Không tìm thấy khoản cọc'
    );
  }

  return result.recordset[0];
}

// ═════════════════════════════════════════════════════════════════════════════
// COLLECT CASH
// ═════════════════════════════════════════════════════════════════════════════

async function collectCashOnArrival({
  bookingId,
}) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const bookingRes = await new sql.Request(transaction)
      .input('bookingId', sql.Int, bookingId)
      .query(`
        SELECT
          b.FinalPrice,
          ISNULL(
            SUM(
              CASE
                WHEN p.PaidAt IS NOT NULL
                THEN p.Amount
                ELSE 0
              END
            ),
            0
          ) AS PaidAmount
        FROM BOOKING b
        LEFT JOIN PAYMENT p
          ON p.BookingID = b.BookingID
        WHERE b.BookingID = @bookingId
        GROUP BY b.FinalPrice
      `);

    if (!bookingRes.recordset.length) {
      throw new Error('Không tìm thấy thông tin đặt lịch');
    }

    const booking = bookingRes.recordset[0];
    const remain = Number(booking.FinalPrice) - Number(booking.PaidAmount);

    // Thu nốt số tiền còn lại bằng Tiền mặt
    if (remain > 0) {
      await new sql.Request(transaction)
        .input('bookingId', sql.Int, bookingId)
        .input('amount', sql.Decimal(12,2), remain)
        .query(`
          INSERT INTO PAYMENT (BookingID, PaymentMethod, Amount, PaidAt)
          VALUES (@bookingId, 'CASH', @amount, GETDATE())
        `);
    }

    // Nếu có khoản cọc nào đang ở trạng thái PENDING thì hủy bỏ (vì khách trả thẳng tiền mặt tại quầy)
    await new sql.Request(transaction)
      .input('bookingId', sql.Int, bookingId)
      .query(`
        UPDATE PAYMENT
        SET PaymentMethod = 'DEPOSIT_CANCELLED'
        WHERE BookingID = @bookingId AND PaymentMethod = 'DEPOSIT_PENDING'
      `);

    // Cập nhật trạng thái Booking sang Đã thanh toán (Status = 4)
    await new sql.Request(transaction)
      .input('bookingId', sql.Int, bookingId)
      .query(`
        UPDATE BOOKING
        SET Status = 4
        WHERE BookingID = @bookingId
      `);

    // Xử lý cộng điểm tích lũy thành viên
    const userRes = await new sql.Request(transaction)
      .input('bookingId', sql.Int, bookingId)
      .query(`
        SELECT b.CustomerID, b.FinalPrice, u.RoleID
        FROM BOOKING b
        INNER JOIN [USER] u ON b.CustomerID = u.UserID
        WHERE b.BookingID = @bookingId
      `);

    if (userRes.recordset.length) {
      const { CustomerID, FinalPrice, RoleID } = userRes.recordset[0];
      if (RoleID === 3) {
        await _earnPoints(transaction, CustomerID, bookingId, FinalPrice);
      }
    }

    await transaction.commit();

    return {
      bookingId,
      amountCollected: remain,
    };

  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// CANCEL BOOKING
// ═════════════════════════════════════════════════════════════════════════════

async function cancelBookingWithForfeit({
  bookingId,
}) {
  const pool = await getPool();

  // Đổi trạng thái Booking sang Hủy (Status = 5)
  await pool.request()
    .input('bookingId', sql.Int, bookingId)
    .query(`
      UPDATE BOOKING
      SET Status = 5
      WHERE BookingID = @bookingId
    `);

  // Phạt tiền cọc nếu đã đóng cọc
  await pool.request()
    .input('bookingId', sql.Int, bookingId)
    .query(`
      UPDATE PAYMENT
      SET PaymentMethod = 'DEPOSIT_FORFEITED'
      WHERE BookingID = @bookingId
        AND PaymentMethod = 'DEPOSIT_PAID'
    `);

  // Hủy yêu cầu đóng cọc nếu cọc vẫn đang treo
  await pool.request()
    .input('bookingId', sql.Int, bookingId)
    .query(`
      UPDATE PAYMENT
      SET PaymentMethod = 'DEPOSIT_CANCELLED'
      WHERE BookingID = @bookingId
        AND PaymentMethod = 'DEPOSIT_PENDING'
    `);

  return {
    bookingId,
    cancelled: true,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  initiateVNPayPayment,
  handleVNPayCallback,
  getMyPaymentHistory,

  initiateCashPayment,
  confirmDeposit,
  collectCashOnArrival,
  cancelBookingWithForfeit,
};