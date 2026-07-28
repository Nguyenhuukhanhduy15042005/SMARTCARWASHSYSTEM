const { sql, poolPromise } = require('../db');

// ── Helper: lấy thông tin payment + booking ───────────────────────────────────
const getPaymentInfo = async (pool, paymentId) => {
  const result = await pool.request()
    .input('paymentId', sql.Int, paymentId)
    .query(`
      SELECT 
        p.PaymentID, p.BookingID, p.Amount, p.PaymentMethod, p.PaidAt,
        b.Status AS BookingStatus, b.CustomerID, b.BookingDate, b.FinalPrice,
        u.FullName AS CustomerName, u.Email AS CustomerEmail
      FROM PAYMENT p
      JOIN BOOKING b ON p.BookingID = b.BookingID
      JOIN [USER] u ON b.CustomerID = u.UserID
      WHERE p.PaymentID = @paymentId
    `);
  return result.recordset[0] || null;
};

// ── Helper: gửi notification + email ─────────────────────────────────────────
const sendNotif = async (pool, userId, bookingId, title, message, type = 'CANCEL', sendEmail = false) => {
  try {
    let userEmail = null;
    if (sendEmail) {
      const userRes = await pool.request()
        .input('uid', sql.Int, userId)
        .query('SELECT Email FROM [USER] WHERE UserID = @uid');
      userEmail = userRes.recordset[0]?.Email;
    }
    const { createAndSendNotification } = require('../Services/notificationService');
    await createAndSendNotification({ userId, bookingId, title, message, type, userEmail: userEmail || null });
  } catch (e) {
    console.error('[sendNotif]', e.message);
  }
};

// ── Helper: hủy booking + nhả voucher + giải phóng máy ───────────────────────
const cancelBookingActions = async (pool, bookingId) => {
  await pool.request()
    .input('bookingId', sql.Int, bookingId)
    .query(`
      UPDATE BOOKING SET Status = 5 WHERE BookingID = @bookingId;
      UPDATE MEMBER_PROMOTION SET IsUsed = 0
        WHERE MemberPromoID = (SELECT MemberPromoID FROM BOOKING WHERE BookingID = @bookingId);
      UPDATE MACHINE SET Status = 1
        WHERE MachineID IN (SELECT MachineID FROM BOOKING_DETAIL WHERE BookingID = @bookingId);
    `);
};

/* ============================================================================
   [1] NGUỒN 1 — Customer khiếu nại xin xem xét hoàn tiền
   POST /api/refund-requests/appeal { paymentId, reason }

   Điều kiện:
     - Booking đã bị hủy (Status = 5) — tức là đã chạy qua refundPayment rồi
     - refundPercent = 0% (vi phạm chính sách hoặc tiền cọc)
     - Chưa có đơn Pending/UnderReview nào cho payment này

   Luồng:
     User bấm "Hủy lịch" → refundPayment (logic cũ, tự hủy ngay)
     Nếu refundPercent = 0% → hiện nút "Yêu cầu xem xét hoàn tiền"
     User bấm nút đó → gọi route này → tạo đơn gửi Admin
     → Noti Staff/Admin
     → Noti Customer: "Đang chờ xét duyệt"

   Auth: Customer (chính chủ)
============================================================================ */
const createRefundFromCustomer = async (req, res) => {
  try {
    const { paymentId, reason } = req.body;
    const customerId = req.user.userId;

    if (!paymentId || !reason) {
      return res.status(400).json({ message: 'Thiếu paymentId hoặc lý do' });
    }

    const pool = await poolPromise;
    const payment = await getPaymentInfo(pool, paymentId);

    if (!payment) {
      return res.status(404).json({ message: 'Không tìm thấy payment' });
    }

    if (payment.CustomerID !== customerId) {
      return res.status(403).json({ message: 'Bạn không có quyền tạo yêu cầu này' });
    }

    if (payment.BookingStatus !== 5) {
      return res.status(400).json({
        message: 'Chỉ có thể yêu cầu xem xét hoàn tiền sau khi booking đã bị hủy'
      });
    }

    const existing = await pool.request()
      .input('paymentId', sql.Int, paymentId)
      .query(`
        SELECT RefundID FROM REFUND_REQUEST
        WHERE PaymentID = @paymentId
          AND Status IN ('Pending', 'UnderReview')
      `);
    if (existing.recordset.length > 0) {
      return res.status(400).json({ message: 'Đã có yêu cầu đang được xử lý cho payment này' });
    }

    const refundPercent = 0;
    const refundAmount  = 0;

    const insertResult = await pool.request()
      .input('paymentId',     sql.Int,           paymentId)
      .input('bookingId',     sql.Int,           payment.BookingID)
      .input('customerId',    sql.Int,           customerId)
      .input('refundAmount',  sql.Decimal(12,2), refundAmount)
      .input('refundPercent', sql.Int,           refundPercent)
      .input('reason',        sql.NVarChar(500), reason)
      .input('initiatedBy',   sql.NVarChar(20),  'customer')
      .query(`
        INSERT INTO REFUND_REQUEST
          (PaymentID, BookingID, CustomerID, RefundAmount, RefundPercent,
           Reason, Status, InitiatedBy, CreatedAt)
        OUTPUT INSERTED.RefundID
        VALUES
          (@paymentId, @bookingId, @customerId, @refundAmount, @refundPercent,
           @reason, 'Pending', @initiatedBy, GETDATE())
      `);

    const refundId = insertResult.recordset[0].RefundID;

    // Noti #1 — Customer
    await sendNotif(pool, customerId, payment.BookingID,
      '📨 Yêu cầu xem xét hoàn tiền đã được gửi',
      `Yêu cầu xem xét hoàn tiền (BK-${payment.BookingID}) đã được ghi nhận. Admin sẽ xem xét và phản hồi sớm nhất có thể.`
    );

    // Noti Staff/Admin
    try {
      const staffList = await pool.request()
        .query(`SELECT UserID FROM [USER] WHERE RoleID IN (1, 2)`);
      for (const staff of staffList.recordset) {
        await sendNotif(pool, staff.UserID, payment.BookingID,
          '🔔 Khách yêu cầu xem xét hoàn tiền',
          `Khách ${payment.CustomerName} yêu cầu xem xét hoàn tiền cho BK-${payment.BookingID} (đã hủy). Lý do: ${reason}`,
          'PAYMENT'
        );
      }
    } catch (e) {
      console.error('[StaffNoti]', e.message);
    }

    res.status(201).json({
      message: 'Yêu cầu xem xét hoàn tiền đã được gửi, đang chờ Admin xét duyệt',
      refundId,
      paymentId,
      bookingId: payment.BookingID,
      status: 'Pending'
    });

  } catch (err) {
    console.error('[createRefundFromCustomer]', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ============================================================================
   [2] NGUỒN 2 — Staff tạo do sự cố (máy hư, mất điện, thời tiết...)
   POST /api/refund-requests
   Body: { paymentId, reason, incidentType }
   → RefundPercent = 100% tự động (lỗi từ phía shop)

   Noti #1 (Staff tạo) — bắn ngay cho Customer:
     ⚠️ Lịch hẹn của bạn bị ảnh hưởng bởi sự cố
     Lịch rửa xe BK-XXX bị hủy do sự cố: [loại]. 
     Chúng tôi đang xử lý hoàn tiền 100% (XXXđ) cho bạn.

   Auth: Staff hoặc Admin
============================================================================ */
const createRefundFromStaff = async (req, res) => {
  try {
    const { paymentId, reason, incidentType } = req.body;
    const requestedBy = req.user.userId;

    if (!paymentId || !reason) {
      return res.status(400).json({ message: 'Thiếu paymentId hoặc lý do' });
    }

    const validIncidentTypes = ['Máy hư', 'Mất điện', 'Thời tiết', 'Khác'];
    const incident = incidentType && validIncidentTypes.includes(incidentType)
      ? incidentType : 'Khác';

    const pool = await poolPromise;
    const payment = await getPaymentInfo(pool, paymentId);

    if (!payment) {
      return res.status(404).json({ message: 'Không tìm thấy payment' });
    }

    if (payment.BookingStatus === 5) {
      return res.status(400).json({ message: 'Booking đã bị hủy trước đó' });
    }

    const existing = await pool.request()
      .input('paymentId', sql.Int, paymentId)
      .query(`
        SELECT RefundID FROM REFUND_REQUEST
        WHERE PaymentID = @paymentId
          AND Status IN ('Pending', 'UnderReview')
      `);
    if (existing.recordset.length > 0) {
      return res.status(400).json({ message: 'Đã có yêu cầu hoàn tiền đang được xử lý' });
    }

    const refundPercent = 100;
    const refundAmount  = Number(payment.Amount);
    const fullReason    = `[${incident}] ${reason}`;

    const insertResult = await pool.request()
      .input('paymentId',     sql.Int,           paymentId)
      .input('bookingId',     sql.Int,           payment.BookingID)
      .input('customerId',    sql.Int,           payment.CustomerID)
      .input('requestedBy',   sql.Int,           requestedBy)
      .input('refundAmount',  sql.Decimal(12,2), refundAmount)
      .input('refundPercent', sql.Int,           refundPercent)
      .input('reason',        sql.NVarChar(500), fullReason)
      .input('initiatedBy',   sql.NVarChar(20),  'staff')
      .input('incidentType',  sql.NVarChar(50),  incident)
      .query(`
        INSERT INTO REFUND_REQUEST
          (PaymentID, BookingID, CustomerID, RequestedBy, RefundAmount, RefundPercent,
           Reason, Status, InitiatedBy, IncidentType, CreatedAt)
        OUTPUT INSERTED.RefundID
        VALUES
          (@paymentId, @bookingId, @customerId, @requestedBy, @refundAmount, @refundPercent,
           @reason, 'Pending', @initiatedBy, @incidentType, GETDATE())
      `);

    const refundId = insertResult.recordset[0].RefundID;

    // Noti #1 — Staff tạo yêu cầu → bắn ngay cho Customer
    await sendNotif(pool, payment.CustomerID, payment.BookingID,
      '⚠️ Lịch hẹn của bạn bị ảnh hưởng bởi sự cố',
      `Lịch rửa xe BK-${payment.BookingID} bị hủy do sự cố: ${incident}. Chúng tôi đang xử lý hoàn tiền 100% (${refundAmount.toLocaleString('vi-VN')}đ) cho bạn.`
    );

    res.status(201).json({
      message: 'Đã tạo yêu cầu hoàn tiền do sự cố, đang chờ Admin duyệt',
      refundId,
      paymentId,
      bookingId: payment.BookingID,
      customerName: payment.CustomerName,
      refundPercent,
      refundAmount,
      incidentType: incident,
      status: 'Pending'
    });

  } catch (err) {
    console.error('[createRefundFromStaff]', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ============================================================================
   [3] Staff chuyển sang UnderReview (đã xem xét, chuyển cho Admin)
   PATCH /api/refund-requests/:id/review-start
   Auth: Staff hoặc Admin
============================================================================ */
const startReview = async (req, res) => {
  try {
    const refundId = Number(req.params.id);
    const pool = await poolPromise;

    const rr = await pool.request()
      .input('refundId', sql.Int, refundId)
      .query(`SELECT * FROM REFUND_REQUEST WHERE RefundID = @refundId`);

    if (!rr.recordset.length) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu hoàn tiền' });
    }

    const refundReq = rr.recordset[0];

    if (refundReq.Status !== 'Pending') {
      return res.status(400).json({
        message: `Chỉ có thể chuyển từ Pending (hiện tại: ${refundReq.Status})`
      });
    }

    await pool.request()
      .input('refundId', sql.Int, refundId)
      .query(`
        UPDATE REFUND_REQUEST
        SET Status = 'UnderReview', UpdatedAt = GETDATE()
        WHERE RefundID = @refundId
      `);

    // 1. Noti Customer (In-App only)
    await sendNotif(pool, refundReq.CustomerID, refundReq.BookingID,
      '🔍 Yêu cầu hoàn tiền đang được xem xét',
      `Yêu cầu hoàn tiền cho lịch BK-${refundReq.BookingID} của bạn đang được xem xét và phê duyệt.`
    );

    // 2. Noti Admin (In-App only)
    try {
      const adminList = await pool.request()
        .query(`SELECT UserID FROM [USER] WHERE RoleID = 1`);
      for (const admin of adminList.recordset) {
        await sendNotif(pool, admin.UserID, refundReq.BookingID,
          '🔔 Yêu cầu hoàn tiền chờ duyệt',
          `Yêu cầu hoàn tiền cho BK-${refundReq.BookingID} đã được chuyển sang trạng thái chờ Admin duyệt.`,
          'PAYMENT'
        );
      }
    } catch (e) {
      console.error('[AdminNoti]', e.message);
    }

    res.json({ message: 'Đã chuyển sang UnderReview', refundId, status: 'UnderReview' });

  } catch (err) {
    console.error('[startReview]', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ============================================================================
   [4] Lấy danh sách yêu cầu hoàn tiền
   GET /api/refund-requests?status=Pending&page=1&limit=10
   Auth: Staff hoặc Admin
============================================================================ */
const getRefundRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const pool = await poolPromise;

    const validStatuses = ['Pending', 'UnderReview', 'Approved', 'RefundProcessing', 'Refunded', 'Rejected'];
    let whereClause = '';
    const request = pool.request()
      .input('limit',  sql.Int, Number(limit))
      .input('offset', sql.Int, offset);

    if (status && validStatuses.includes(status)) {
      whereClause = `WHERE rr.Status = @status`;
      request.input('status', sql.NVarChar(20), status);
    }

    const result = await request.query(`
      SELECT
        rr.RefundID, rr.PaymentID, rr.BookingID, rr.Status,
        rr.RefundAmount, rr.RefundPercent, rr.Reason, rr.Note,
        rr.InitiatedBy, rr.IncidentType,
        rr.CreatedAt, rr.UpdatedAt,
        customer.FullName AS CustomerName,
        customer.Email    AS CustomerEmail,
        staff.FullName    AS RequestedByName,
        admin.FullName    AS ApprovedByName,
        p.Amount          AS OriginalAmount,
        p.PaymentMethod,
        b.BookingDate, b.LicensePlate, b.VehicleType,
        b.Status          AS BookingStatus
      FROM REFUND_REQUEST rr
      JOIN PAYMENT p          ON rr.PaymentID  = p.PaymentID
      JOIN BOOKING b          ON rr.BookingID  = b.BookingID
      JOIN [USER] customer    ON rr.CustomerID = customer.UserID
      LEFT JOIN [USER] staff  ON rr.RequestedBy = staff.UserID
      LEFT JOIN [USER] admin  ON rr.ApprovedBy  = admin.UserID
      ${whereClause}
      ORDER BY rr.CreatedAt DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const countRequest = pool.request();
    if (status && validStatuses.includes(status)) {
      countRequest.input('status', sql.NVarChar(20), status);
    }
    const countResult = await countRequest.query(`
      SELECT COUNT(*) AS total FROM REFUND_REQUEST rr ${whereClause}
    `);

    res.json({
      data:  result.recordset,
      total: countResult.recordset[0].total,
      page:  Number(page),
      limit: Number(limit)
    });

  } catch (err) {
    console.error('[getRefundRequests]', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ============================================================================
   [5] Lấy chi tiết 1 yêu cầu hoàn tiền
   GET /api/refund-requests/:id
   Auth: Staff hoặc Admin
============================================================================ */
const getRefundRequestById = async (req, res) => {
  try {
    const refundId = Number(req.params.id);
    const pool = await poolPromise;

    const result = await pool.request()
      .input('refundId', sql.Int, refundId)
      .query(`
        SELECT
          rr.*,
          customer.FullName AS CustomerName,
          customer.Email    AS CustomerEmail,
          staff.FullName    AS RequestedByName,
          admin.FullName    AS ApprovedByName,
          p.Amount          AS OriginalAmount,
          p.PaymentMethod,
          b.BookingDate, b.LicensePlate, b.VehicleType,
          b.Status          AS BookingStatus, b.FinalPrice
        FROM REFUND_REQUEST rr
        JOIN PAYMENT p          ON rr.PaymentID  = p.PaymentID
        JOIN BOOKING b          ON rr.BookingID  = b.BookingID
        JOIN [USER] customer    ON rr.CustomerID = customer.UserID
        LEFT JOIN [USER] staff  ON rr.RequestedBy = staff.UserID
        LEFT JOIN [USER] admin  ON rr.ApprovedBy  = admin.UserID
        WHERE rr.RefundID = @refundId
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu hoàn tiền' });
    }

    res.json(result.recordset[0]);

  } catch (err) {
    console.error('[getRefundRequestById]', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ============================================================================
   [6] Admin duyệt hoặc từ chối yêu cầu hoàn tiền
   PATCH /api/refund-requests/:id/review
   Body: { action: 'approve' | 'reject', refundAmount?, note? }
   Auth: Admin only

   Khi APPROVE — 3 noti theo luồng:
     Noti #1 (đã có khi Staff tạo): ⚠️ Lịch hẹn bị ảnh hưởng [giữ nguyên]
     Noti #2 (thêm mới ở đây):     ✅ Yêu cầu hoàn tiền đã được duyệt → ra quầy nhận
     Noti #3 (khi Staff confirm):   💵 Đã hoàn tiền thành công

   Nếu booking CHƯA hủy (sự cố Staff): hủy booking + nhả voucher + giải phóng máy
   LUÔN soft delete payment (IsHiddenByUser=1) để frontend không hiện "Đã thanh toán"

   Khi REJECT:
     → Status = Rejected
     → Booking giữ nguyên
     → Noti Customer kèm lý do
============================================================================ */
const reviewRefundRequest = async (req, res) => {
  try {
    const refundId = Number(req.params.id);
    const { action, refundAmount, note } = req.body;
    const approvedBy = req.user.userId;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'action phải là approve hoặc reject' });
    }

    const pool = await poolPromise;

    const rr = await pool.request()
      .input('refundId', sql.Int, refundId)
      .query(`
        SELECT 
          rr.RefundID, rr.PaymentID, rr.BookingID, rr.CustomerID, rr.RequestedBy,
          rr.ApprovedBy, rr.RefundAmount, rr.RefundPercent, rr.Reason, rr.Status,
          rr.Note, rr.InitiatedBy, rr.IncidentType, rr.CreatedAt, rr.UpdatedAt,
          p.Amount AS OriginalAmount, p.PaymentMethod,
          b.Status AS BookingStatus
        FROM REFUND_REQUEST rr
        JOIN PAYMENT p ON rr.PaymentID = p.PaymentID
        JOIN BOOKING b ON rr.BookingID = b.BookingID
        WHERE rr.RefundID = @refundId
      `);

    if (!rr.recordset.length) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu hoàn tiền' });
    }

    const refundReq = rr.recordset[0];

    if (!['Pending', 'UnderReview'].includes(refundReq.Status)) {
      return res.status(400).json({
        message: `Yêu cầu đã được xử lý (${refundReq.Status})`
      });
    }

    const finalRefundAmount = refundAmount !== undefined
      ? Number(refundAmount)
      : Number(refundReq.RefundAmount);

    const finalRefundPercent = refundReq.OriginalAmount > 0
      ? Math.min(100, Math.round((finalRefundAmount / Number(refundReq.OriginalAmount)) * 100))
      : 0;

    if (action === 'approve') {
      if (finalRefundAmount > Number(refundReq.OriginalAmount)) {
        return res.status(400).json({
          message: `Số tiền hoàn (${finalRefundAmount.toLocaleString('vi-VN')}đ) không thể vượt quá số tiền đã trả (${Number(refundReq.OriginalAmount).toLocaleString('vi-VN')}đ)`
        });
      }

      // Bước 1: Cập nhật trạng thái REFUND_REQUEST thành Approved
      await pool.request()
        .input('refundId',      sql.Int,           refundId)
        .input('approvedBy',    sql.Int,           approvedBy)
        .input('refundAmount',  sql.Decimal(12,2), finalRefundAmount)
        .input('refundPercent', sql.Int,           finalRefundPercent)
        .input('note',          sql.NVarChar(500), note || null)
        .query(`
          UPDATE REFUND_REQUEST SET
            Status        = 'Approved',
            ApprovedBy    = @approvedBy,
            RefundAmount  = @refundAmount,
            RefundPercent = @refundPercent,
            Note          = @note,
            UpdatedAt     = GETDATE()
          WHERE RefundID = @refundId
        `);

      // Bước 2: Hủy booking nếu chưa hủy
      if (refundReq.BookingStatus !== 5) {
        await cancelBookingActions(pool, refundReq.BookingID);
      }

      // Bước 3: Soft delete payment
      await pool.request()
        .input('paymentId', sql.Int, refundReq.PaymentID)
        .query(`UPDATE PAYMENT SET IsHiddenByUser = 1 WHERE PaymentID = @paymentId`);

      // Bước 4: Gửi thông báo đến khách hàng (Gửi cả In-App + Email)
      await sendNotif(
        pool,
        refundReq.CustomerID,
        refundReq.BookingID,
        '✅ Yêu cầu hoàn tiền đã được duyệt',
        `Yêu cầu hoàn tiền cho lịch BK-${refundReq.BookingID} đã được duyệt. Số tiền: ${finalRefundAmount.toLocaleString('vi-VN')}đ. Vui lòng nhận tại quầy.`,
        'CANCEL',
        true
      );

      return res.json({
        message: 'Đã duyệt yêu cầu hoàn tiền. Chờ Staff xác nhận hoàn tiền mặt.',
        refundId,
        status: 'Approved',
        refundAmount: finalRefundAmount,
        note: note || null
      });


    } else {
      // REJECT
      await pool.request()
        .input('refundId',   sql.Int,           refundId)
        .input('approvedBy', sql.Int,           approvedBy)
        .input('note',       sql.NVarChar(500), note || null)
        .query(`
          UPDATE REFUND_REQUEST SET
            Status     = 'Rejected',
            ApprovedBy = @approvedBy,
            Note       = @note,
            UpdatedAt  = GETDATE()
          WHERE RefundID = @refundId
        `);

      await sendNotif(
        pool,
        refundReq.CustomerID,
        refundReq.BookingID,
        '❌ Yêu cầu hoàn tiền bị từ chối',
        `Yêu cầu hoàn tiền (BK-${refundReq.BookingID}) đã bị từ chối.${note ? ` Lý do: ${note}` : ''}`
      );

      return res.json({
        message: 'Đã từ chối yêu cầu hoàn tiền',
        refundId,
        status: 'Rejected',
        note: note || null
      });
    }

  } catch (err) {
    console.error('[reviewRefundRequest]', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ============================================================================
   [7] Lấy danh sách payment đủ điều kiện tạo yêu cầu hoàn tiền
   GET /api/refund-requests/refundable
   Auth: Staff hoặc Admin
============================================================================ */
const getRefundablePayments = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        p.PaymentID, p.BookingID, p.Amount, p.PaymentMethod, p.PaidAt,
        b.Status      AS BookingStatus,
        b.BookingDate, b.LicensePlate, b.VehicleType,
        b.CustomerID,
        u.FullName    AS CustomerName,
        u.Email       AS CustomerEmail
      FROM PAYMENT p
      JOIN BOOKING b ON p.BookingID = b.BookingID
      JOIN [USER] u  ON b.CustomerID = u.UserID
      LEFT JOIN REFUND_REQUEST rr
        ON rr.PaymentID = p.PaymentID
        AND rr.Status IN ('Pending', 'UnderReview')
      WHERE
        (p.IsHiddenByUser IS NULL OR p.IsHiddenByUser = 0)
        AND b.Status != 5
        AND p.Amount > 0
        AND rr.RefundID IS NULL
      ORDER BY p.PaidAt DESC
    `);

    res.json({
      total: result.recordset.length,
      data:  result.recordset
    });

  } catch (err) {
    console.error('[getRefundablePayments]', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ============================================================================
   [8] Lịch sử hoàn tiền đã xử lý + báo cáo tổng hợp
   GET /api/refund-requests/history?range=30d
   Auth: Admin
============================================================================ */
const getRefundHistory = async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const pool = await poolPromise;

    let dateFilter = '';
    if (range === '7d')  dateFilter = `AND rr.UpdatedAt >= DATEADD(DAY, -7,  GETDATE())`;
    if (range === '30d') dateFilter = `AND rr.UpdatedAt >= DATEADD(DAY, -30, GETDATE())`;
    if (range === '90d') dateFilter = `AND rr.UpdatedAt >= DATEADD(DAY, -90, GETDATE())`;

    const result = await pool.request().query(`
      SELECT
        rr.RefundID, rr.Status, rr.RefundAmount, rr.RefundPercent,
        rr.Reason, rr.Note, rr.InitiatedBy, rr.IncidentType,
        rr.CreatedAt, rr.UpdatedAt,
        customer.FullName AS CustomerName,
        staff.FullName    AS RequestedByName,
        admin.FullName    AS ApprovedByName,
        p.Amount          AS OriginalAmount,
        p.PaymentMethod,
        b.LicensePlate, b.BookingDate
      FROM REFUND_REQUEST rr
      JOIN PAYMENT p          ON rr.PaymentID  = p.PaymentID
      JOIN BOOKING b          ON rr.BookingID  = b.BookingID
      JOIN [USER] customer    ON rr.CustomerID = customer.UserID
      LEFT JOIN [USER] staff  ON rr.RequestedBy = staff.UserID
      LEFT JOIN [USER] admin  ON rr.ApprovedBy  = admin.UserID
      WHERE rr.Status IN ('Refunded', 'Rejected')
      ${dateFilter}
      ORDER BY rr.UpdatedAt DESC
    `);

    const totalRefunded = result.recordset
      .filter(r => r.Status === 'Refunded')
      .reduce((sum, r) => sum + Number(r.RefundAmount || 0), 0);

    res.json({
      meta: { range, generatedAt: new Date() },
      summary: {
        totalRequests:     result.recordset.length,
        refunded:          result.recordset.filter(r => r.Status === 'Refunded').length,
        rejected:          result.recordset.filter(r => r.Status === 'Rejected').length,
        totalRefundAmount: totalRefunded,
        bySource: {
          customer: result.recordset.filter(r => r.InitiatedBy === 'customer').length,
          staff:    result.recordset.filter(r => r.InitiatedBy === 'staff').length,
        }
      },
      data: result.recordset
    });

  } catch (err) {
    console.error('[getRefundHistory]', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ============================================================================
   [9] Staff xác nhận đã hoàn tiền mặt cho khách tại quầy
   PATCH /api/refund-requests/:id/confirm-refunded
   Auth: Staff hoặc Admin

   Điều kiện: Status phải là 'Approved'

   Noti #3 — Staff xác nhận đã trả tiền mặt:
     💵 Đã hoàn tiền thành công
     Bạn đã nhận XXXđ tiền hoàn cho lịch BK-XXX. Cảm ơn bạn đã ghé cửa hàng.
============================================================================ */
const confirmRefunded = async (req, res) => {
  try {
    const refundId = Number(req.params.id);
    const pool = await poolPromise;

    const rr = await pool.request()
      .input('refundId', sql.Int, refundId)
      .query(`
        SELECT rr.*, b.CustomerID, b.BookingID
        FROM REFUND_REQUEST rr
        JOIN BOOKING b ON rr.BookingID = b.BookingID
        WHERE rr.RefundID = @refundId
      `);

    if (!rr.recordset.length) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu hoàn tiền' });
    }

    const refundReq = rr.recordset[0];

    if (refundReq.Status !== 'Approved') {
      return res.status(400).json({
        message: `Chỉ xác nhận được khi đã Approved (hiện tại: ${refundReq.Status})`
      });
    }

    await pool.request()
      .input('refundId', sql.Int, refundId)
      .query(`
        UPDATE REFUND_REQUEST
        SET Status = 'Refunded', UpdatedAt = GETDATE()
        WHERE RefundID = @refundId
      `);

    // Noti #3 — Staff xác nhận đã trả tiền mặt
    await sendNotif(
      pool,
      refundReq.CustomerID,
      refundReq.BookingID,
      '💵 Đã hoàn tiền thành công',
      `Bạn đã nhận ${Number(refundReq.RefundAmount).toLocaleString('vi-VN')}đ tiền hoàn cho lịch BK-${refundReq.BookingID}. Cảm ơn bạn đã ghé cửa hàng.`
    );

    res.json({
      message: 'Đã xác nhận hoàn tiền mặt thành công',
      refundId,
      status: 'Refunded'
    });

  } catch (err) {
    console.error('[confirmRefunded]', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createRefundFromCustomer,   // POST /api/refund-requests/appeal        ← Customer khiếu nại
  createRefundFromStaff,      // POST /api/refund-requests               ← Staff/sự cố
  startReview,                // PATCH /api/refund-requests/:id/review-start
  getRefundRequests,          // GET  /api/refund-requests
  getRefundRequestById,       // GET  /api/refund-requests/:id
  reviewRefundRequest,        // PATCH /api/refund-requests/:id/review   ← Admin duyệt/từ chối
  getRefundablePayments,      // GET  /api/refund-requests/refundable
  getRefundHistory,           // GET  /api/refund-requests/history
  confirmRefunded,            // PATCH /api/refund-requests/:id/confirm-refunded ← Staff xác nhận
};