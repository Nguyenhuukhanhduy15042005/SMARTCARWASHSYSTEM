const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { sql, poolPromise } = require('../db');

// Role verification middlewares
const requireStaffOrAdmin = (req, res, next) => {
  if (req.user.roleId !== 1 && req.user.roleId !== 2) {
    return res.status(403).json({ message: "Chỉ Admin/Staff mới có quyền thực hiện!" });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user.roleId !== 1) {
    return res.status(403).json({ message: "Chỉ Admin mới có quyền thực hiện!" });
  }
  next();
};

// ── Helper: lấy thông tin payment + booking ──────────────────────────────────
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
        AND (p.IsHiddenByUser IS NULL OR p.IsHiddenByUser = 0)
    `);
  return result.recordset[0] || null;
};


// ── Helper: gửi notification ──────────────────────────────────────────────────
const sendNotif = async (pool, userId, bookingId, title, message) => {
  try {
    const userRes = await pool.request()
      .input('uid', sql.Int, userId)
      .query("SELECT Email FROM [USER] WHERE UserID = @uid");
    const userEmail = userRes.recordset[0]?.Email;
    const { createAndSendNotification } = require('../Services/notificationService');
    await createAndSendNotification({ userId, bookingId, title, message, type: 'CANCEL', userEmail: userEmail || null });
  } catch (e) {
    console.error('[sendNotif]', e.message);
  }
};

/**
 * [6] Staff chuyển trạng thái sang UnderReview (đã xem xét, chuyển cho Admin)
 * PATCH /api/refund-requests/:id/review-start
 * Auth: Staff
 */
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

    if (rr.recordset[0].Status !== 'Pending') {
      return res.status(400).json({ message: `Chỉ có thể chuyển từ Pending (hiện tại: ${rr.recordset[0].Status})` });
    }

    await pool.request()
      .input('refundId', sql.Int, refundId)
      .query(`
        UPDATE REFUND_REQUEST SET Status = 'UnderReview', UpdatedAt = GETDATE()
        WHERE RefundID = @refundId
      `);

    res.json({ message: 'Đã chuyển sang UnderReview', refundId, status: 'UnderReview' });
  } catch (err) {
    console.error('[startReview]', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * [1] Staff tạo yêu cầu hoàn tiền
 * POST /api/refund-requests
 * Body: { paymentId, reason }
 * Auth: Staff hoặc Admin
 */
const createRefundRequest = async (req, res) => {
  try {
    const { paymentId, reason } = req.body;
    const requestedBy = req.user.userId;

    if (!paymentId || !reason) {
      return res.status(400).json({ message: 'Thiếu paymentId hoặc lý do hoàn tiền' });
    }

    const pool = await poolPromise;
    const payment = await getPaymentInfo(pool, paymentId);

    if (!payment) {
      return res.status(404).json({ message: 'Không tìm thấy payment' });
    }

    if (payment.BookingStatus === 3) {
      return res.status(400).json({ message: 'Xe đang được rửa, không thể tạo yêu cầu hoàn tiền' });
    }

    if (payment.BookingStatus === 4 && payment.Amount > 0) {
      // Dịch vụ hoàn thành — chỉ Admin mới được duyệt hoàn tiền đặc biệt
    }

    // Kiểm tra đã có yêu cầu Pending/UnderReview chưa
    const existing = await pool.request()
      .input('paymentId', sql.Int, paymentId)
      .query(`
        SELECT RefundID FROM REFUND_REQUEST
        WHERE PaymentID = @paymentId AND Status IN ('Pending', 'UnderReview')
      `);

    if (existing.recordset.length > 0) {
      return res.status(400).json({ message: 'Payment này đã có yêu cầu hoàn tiền đang xử lý (chờ duyệt hoặc đang xem xét)' });
    }

    // Tính refundPercent + refundAmount đề xuất (Staff đề xuất, Admin có thể sửa)
    const now = new Date();
    const bookingDate = new Date(payment.BookingDate);
    const hoursLeft = Math.max(0, (bookingDate - now) / (1000 * 60 * 60));

    // Lấy cancelCount của khách
    const cancelResult = await pool.request()
      .input('customerId', sql.Int, payment.CustomerID)
      .query(`
        SELECT COUNT(*) AS CancelCount FROM BOOKING
        WHERE CustomerID = @customerId
          AND Status = 5
          AND BookingDate >= DATEADD(DAY, -30, GETDATE())
      `);
    const cancelCount = cancelResult.recordset[0].CancelCount || 0;

    // Tiền cọc cash → 0%
    const isDeposit = (payment.PaymentMethod || '').toLowerCase() === 'cash' && Number(payment.Amount) > 0;
    let refundPercent = 0;
    let refundAmount = 0;

    if (!isDeposit) {
      if (hoursLeft >= 24 && cancelCount === 0) refundPercent = 100;
      else if (hoursLeft >= 2 && cancelCount <= 1) refundPercent = 50;
      else refundPercent = 0;
      refundAmount = Math.round(Number(payment.Amount) * refundPercent / 100);
    }

    // Tạo yêu cầu hoàn tiền
    const insertResult = await pool.request()
      .input('paymentId',    sql.Int,           paymentId)
      .input('bookingId',    sql.Int,           payment.BookingID)
      .input('customerId',   sql.Int,           payment.CustomerID)
      .input('requestedBy',  sql.Int,           requestedBy)
      .input('refundAmount', sql.Decimal(12,2), refundAmount)
      .input('refundPercent',sql.Int,           refundPercent)
      .input('reason',       sql.NVarChar(500), reason)
      .query(`
        INSERT INTO REFUND_REQUEST 
          (PaymentID, BookingID, CustomerID, RequestedBy, RefundAmount, RefundPercent, Reason, Status, CreatedAt)
        OUTPUT INSERTED.RefundID
        VALUES 
          (@paymentId, @bookingId, @customerId, @requestedBy, @refundAmount, @refundPercent, @reason, 'Pending', GETDATE())
      `);

    const refundId = insertResult.recordset[0].RefundID;

    res.status(201).json({
      message: 'Tạo yêu cầu hoàn tiền thành công, đang chờ Admin duyệt',
      refundId,
      paymentId,
      bookingId: payment.BookingID,
      customerName: payment.CustomerName,
      originalAmount: Number(payment.Amount),
      refundPercent,
      refundAmount,
      isDeposit,
      status: 'Pending'
    });

  } catch (err) {
    console.error('[createRefundRequest]', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * [2] Lấy danh sách yêu cầu hoàn tiền (Staff xem tất cả, có thể lọc theo status)
 * GET /api/refund-requests?status=Pending&page=1&limit=10
 * Auth: Staff hoặc Admin
 */
const getRefundRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const pool = await poolPromise;
    const request = pool.request()
      .input('limit',  sql.Int, Number(limit))
      .input('offset', sql.Int, offset);

    let whereClause = '';
    if (status && ['Pending', 'UnderReview', 'Approved', 'Rejected'].includes(status)) {
      whereClause = `WHERE rr.Status = @status`;
      request.input('status', sql.NVarChar(20), status);
    }

    const result = await request.query(`
      SELECT 
        rr.RefundID, rr.PaymentID, rr.BookingID, rr.Status,
        rr.RefundAmount, rr.RefundPercent, rr.Reason, rr.Note,
        rr.CreatedAt, rr.UpdatedAt,
        customer.FullName AS CustomerName,
        customer.Email    AS CustomerEmail,
        staff.FullName    AS RequestedByName,
        admin.FullName    AS ApprovedByName,
        p.Amount          AS OriginalAmount,
        p.PaymentMethod,
        b.BookingDate,
        b.LicensePlate,
        b.VehicleType,
        b.Status          AS BookingStatus
      FROM REFUND_REQUEST rr
      JOIN PAYMENT p        ON rr.PaymentID  = p.PaymentID
      JOIN BOOKING b        ON rr.BookingID  = b.BookingID
      JOIN [USER] customer  ON rr.CustomerID = customer.UserID
      LEFT JOIN [USER] staff ON rr.RequestedBy = staff.UserID
      LEFT JOIN [USER] admin ON rr.ApprovedBy  = admin.UserID
      ${whereClause}
      ORDER BY rr.CreatedAt DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const countRequest = pool.request();
    if (status && ['Pending', 'UnderReview', 'Approved', 'Rejected'].includes(status)) {
      countRequest.input('status', sql.NVarChar(20), status);
    }
    const countResult = await countRequest.query(`
      SELECT COUNT(*) AS total FROM REFUND_REQUEST rr
      ${whereClause}
    `);

    res.json({
      data: result.recordset,
      total: countResult.recordset[0].total,
      page: Number(page),
      limit: Number(limit)
    });

  } catch (err) {
    console.error('[getRefundRequests]', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * [3] Lấy chi tiết 1 yêu cầu hoàn tiền
 * GET /api/refund-requests/:id
 * Auth: Staff hoặc Admin
 */
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
          b.BookingDate,
          b.LicensePlate,
          b.VehicleType,
          b.Status          AS BookingStatus,
          b.FinalPrice
        FROM REFUND_REQUEST rr
        JOIN PAYMENT p        ON rr.PaymentID  = p.PaymentID
        JOIN BOOKING b        ON rr.BookingID  = b.BookingID
        JOIN [USER] customer  ON rr.CustomerID = customer.UserID
        LEFT JOIN [USER] staff ON rr.RequestedBy = staff.UserID
        LEFT JOIN [USER] admin ON rr.ApprovedBy  = admin.UserID
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

/**
 * [4] Admin duyệt hoặc từ chối yêu cầu hoàn tiền
 * PATCH /api/refund-requests/:id/review
 * Body: { action: 'approve' | 'reject', refundAmount?, note? }
 * Auth: Admin only
 */
const reviewRefundRequest = async (req, res) => {
  try {
    const refundId = Number(req.params.id);
    const { action, refundAmount, note } = req.body;
    const approvedBy = req.user.userId;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'action phải là approve hoặc reject' });
    }

    const pool = await poolPromise;

    // Lấy yêu cầu
    const rr = await pool.request()
      .input('refundId', sql.Int, refundId)
      .query(`
        SELECT rr.*, p.Amount AS OriginalAmount, p.PaymentMethod,
               b.CustomerID, b.Status AS BookingStatus, b.BookingID
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
      return res.status(400).json({ message: `Yêu cầu đã được xử lý (${refundReq.Status})` });
    }

    let newStatus = action === 'approve' ? 'Approved' : 'Rejected';
    const finalRefundAmount = refundAmount !== undefined
      ? Number(refundAmount)
      : Number(refundReq.RefundAmount);

    // Validate refundAmount không vượt quá số tiền đã trả
    if (action === 'approve' && finalRefundAmount > Number(refundReq.OriginalAmount)) {
      return res.status(400).json({
        message: `Số tiền hoàn (${finalRefundAmount}) không thể vượt quá số tiền đã trả (${refundReq.OriginalAmount})`
      });
    }

    // Cập nhật trạng thái yêu cầu
    await pool.request()
      .input('refundId',      sql.Int,           refundId)
      .input('approvedBy',    sql.Int,           approvedBy)
      .input('refundAmount',  sql.Decimal(12,2), finalRefundAmount)
      .input('note',          sql.NVarChar(500), note || null)
      .input('status',        sql.NVarChar(20),  newStatus)
      .query(`
        UPDATE REFUND_REQUEST SET
          Status       = @status,
          ApprovedBy   = @approvedBy,
          RefundAmount = @refundAmount,
          Note         = @note,
          UpdatedAt    = GETDATE()
        WHERE RefundID = @refundId
      `);

    // Nếu APPROVE → thực hiện hủy booking + soft delete payment
    if (action === 'approve') {
      // Hủy booking + nhả voucher + giải phóng máy
      await pool.request()
        .input('bookingId', sql.Int, refundReq.BookingID)
        .query(`
          UPDATE BOOKING SET Status = 5 WHERE BookingID = @bookingId;
          UPDATE MEMBER_PROMOTION SET IsUsed = 0
            WHERE MemberPromoID = (SELECT MemberPromoID FROM BOOKING WHERE BookingID = @bookingId);
          UPDATE MACHINE SET Status = 1
            WHERE MachineID = (SELECT MachineID FROM BOOKING_DETAIL WHERE BookingID = @bookingId);
        `);

      // Soft delete payment
      await pool.request()
        .input('paymentId', sql.Int, refundReq.PaymentID)
        .query(`UPDATE PAYMENT SET IsHiddenByUser = 1 WHERE PaymentID = @paymentId`);

      // Gửi notification cho khách
      try {
        const userRes = await pool.request()
          .input('customerId', sql.Int, refundReq.CustomerID)
          .query(`SELECT Email FROM [USER] WHERE UserID = @customerId`);
        const userEmail = userRes.recordset[0]?.Email;

        const { createAndSendNotification } = require('../Services/notificationService');
        await createAndSendNotification({
          userId: refundReq.CustomerID,
          bookingId: refundReq.BookingID,
          title: 'Yêu cầu hoàn tiền đã được duyệt',
          message: `Yêu cầu hoàn tiền của bạn (Mã đơn BK-${refundReq.BookingID}) đã được Admin phê duyệt. Số tiền hoàn: ${finalRefundAmount.toLocaleString('vi-VN')}đ.`,
          type: 'CANCEL',
          userEmail: userEmail || null
        });
      } catch (notiErr) {
        console.error('[RefundApproveNotification]', notiErr.message);
      }
    } else {
      // Gửi notification từ chối cho khách
      try {
        const userRes = await pool.request()
          .input('customerId', sql.Int, refundReq.CustomerID)
          .query(`SELECT Email FROM [USER] WHERE UserID = @customerId`);
        const userEmail = userRes.recordset[0]?.Email;

        const { createAndSendNotification } = require('../Services/notificationService');
        await createAndSendNotification({
          userId: refundReq.CustomerID,
          bookingId: refundReq.BookingID,
          title: 'Yêu cầu hoàn tiền bị từ chối',
          message: `Yêu cầu hoàn tiền của bạn (Mã đơn BK-${refundReq.BookingID}) đã bị từ chối.${note ? ` Lý do: ${note}` : ''}`,
          type: 'CANCEL',
          userEmail: userEmail || null
        });
      } catch (notiErr) {
        console.error('[RefundRejectNotification]', notiErr.message);
      }
    }

    res.json({
      message: action === 'approve' ? 'Đã duyệt hoàn tiền thành công' : 'Đã từ chối yêu cầu hoàn tiền',
      refundId,
      status: newStatus,
      refundAmount: finalRefundAmount,
      note: note || null
    });

  } catch (err) {
    console.error('[reviewRefundRequest]', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * [5] Lấy lịch sử hoàn tiền đã xử lý (Admin xuất báo cáo)
 * GET /api/refund-requests/history?range=30d
 * Auth: Admin
 */
const getRefundHistory = async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const pool = await poolPromise;

    let dateFilter = '';
    if (range === '7d')    dateFilter = `AND rr.UpdatedAt >= DATEADD(DAY, -7, GETDATE())`;
    else if (range === '30d') dateFilter = `AND rr.UpdatedAt >= DATEADD(DAY, -30, GETDATE())`;
    else if (range === '90d') dateFilter = `AND rr.UpdatedAt >= DATEADD(DAY, -90, GETDATE())`;

    const result = await pool.request().query(`
      SELECT 
        rr.RefundID, rr.Status, rr.RefundAmount, rr.RefundPercent,
        rr.Reason, rr.Note, rr.CreatedAt, rr.UpdatedAt,
        customer.FullName AS CustomerName,
        staff.FullName    AS RequestedByName,
        admin.FullName    AS ApprovedByName,
        p.Amount          AS OriginalAmount,
        p.PaymentMethod,
        b.LicensePlate,
        b.BookingDate
      FROM REFUND_REQUEST rr
      JOIN PAYMENT p        ON rr.PaymentID  = p.PaymentID
      JOIN BOOKING b        ON rr.BookingID  = b.BookingID
      JOIN [USER] customer  ON rr.CustomerID = customer.UserID
      LEFT JOIN [USER] staff ON rr.RequestedBy = staff.UserID
      LEFT JOIN [USER] admin ON rr.ApprovedBy  = admin.UserID
      WHERE rr.Status IN ('Approved', 'Rejected')
      ${dateFilter}
      ORDER BY rr.UpdatedAt DESC
    `);

    // Tổng hợp
    const totalApproved = result.recordset
      .filter(r => r.Status === 'Approved')
      .reduce((sum, r) => sum + Number(r.RefundAmount || 0), 0);

    res.json({
      meta: { range, generatedAt: new Date() },
      summary: {
        totalRequests: result.recordset.length,
        approved: result.recordset.filter(r => r.Status === 'Approved').length,
        rejected: result.recordset.filter(r => r.Status === 'Rejected').length,
        totalRefundAmount: totalApproved
      },
      data: result.recordset
    });

  } catch (err) {
    console.error('[getRefundHistory]', err.message);
    res.status(500).json({ message: err.message });
  }
};

// Define router endpoints
router.post('/', verifyToken, requireStaffOrAdmin, createRefundRequest);
router.get('/', verifyToken, requireStaffOrAdmin, getRefundRequests);
router.get('/history', verifyToken, requireAdmin, getRefundHistory);
router.get('/:id', verifyToken, requireStaffOrAdmin, getRefundRequestById);
router.patch('/:id/review-start', verifyToken, requireStaffOrAdmin, startReview);
router.patch('/:id/review', verifyToken, requireAdmin, reviewRefundRequest);

module.exports = router;