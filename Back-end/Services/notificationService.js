const nodemailer = require('nodemailer');
const { sql, poolPromise } = require('../db');

// ─── Validate biến môi trường khi khởi động ───────────────────────────────────
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[NotificationService] CẢNH BÁO: EMAIL_USER hoặc EMAIL_PASS chưa được cấu hình trong .env. Tính năng gửi email sẽ không hoạt động.');
}

// ─── Cấu hình Gmail SMTP Transporter ─────────────────────────────────────────
// EMAIL_PASS phải là "App Password" 16 ký tự từ Google Account → Security → App passwords
// KHÔNG dùng mật khẩu Gmail thường (sẽ bị từ chối nếu bật 2FA)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    pool: true,         // Dùng connection pool để tái sử dụng kết nối SMTP
    maxConnections: 5,  // Tối đa 5 kết nối song song
    rateDelta: 1000,    // Giãn cách tối thiểu 1 giây giữa các email (tránh spam filter)
    rateLimit: 5,       // Tối đa 5 email/giây
});

// Kiểm tra kết nối SMTP khi khởi động
transporter.verify((err) => {
    if (err) {
        console.error('[Email SMTP] Không thể kết nối tới Gmail SMTP:', err.message);
    } else {
        console.log('[Email SMTP] Kết nối Gmail SMTP thành công ✓');
    }
});

// ─── Template Email HTML ──────────────────────────────────────────────────────
const buildEmailHtml = ({ title, message, type, bookingId }) => {
    // Màu sắc theo loại thông báo
    const colorMap = {
        REMINDER: { accent: '#f59e0b', bg: '#fffbeb', icon: '⏰' },
        BOOKING:  { accent: '#3b82f6', bg: '#eff6ff', icon: '📅' },
        PAYMENT:  { accent: '#10b981', bg: '#f0fdf4', icon: '💳' },
        CANCEL:   { accent: '#ef4444', bg: '#fef2f2', icon: '❌' },
        LOYALTY:  { accent: '#8b5cf6', bg: '#f5f3ff', icon: '⭐' },
    };
    const { accent, bg, icon } = colorMap[type] || { accent: '#6b7280', bg: '#f9fafb', icon: '🔔' };
    const bookingRef = bookingId ? `<p style="font-size:13px;color:#6b7280;margin:0 0 16px;">Mã đặt lịch: <strong>BK-${bookingId}</strong></p>` : '';

    return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:${accent};padding:24px 32px;text-align:center;">
            <span style="font-size:36px;">${icon}</span>
            <h1 style="color:#ffffff;font-size:20px;margin:8px 0 0;font-weight:600;">${title}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <div style="background:${bg};border-left:4px solid ${accent};border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:20px;">
              <p style="font-size:15px;color:#374151;line-height:1.6;margin:0;">${message}</p>
            </div>
            ${bookingRef}
            <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0;">
              Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua hotline hoặc trực tiếp tại cửa hàng.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="font-size:13px;color:#9ca3af;margin:0;">
              © ${new Date().getFullYear()} <strong>Smart Car Wash</strong> · Email này được gửi tự động, vui lòng không trả lời.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

// ─── Hàm gửi thông báo chính (In-App DB + Email) ──────────────────────────────
/**
 * @param {object} params
 * @param {number}  params.userId    - ID người nhận
 * @param {number}  [params.bookingId] - ID booking liên quan (nullable)
 * @param {string}  params.title     - Tiêu đề thông báo
 * @param {string}  params.message   - Nội dung thông báo
 * @param {string}  params.type      - Loại: REMINDER | BOOKING | PAYMENT | CANCEL | LOYALTY
 * @param {string}  [params.userEmail] - Email người nhận (nếu muốn gửi email)
 * @returns {Promise<{notificationId: number|null, emailSent: boolean}>}
 */
const createAndSendNotification = async ({
    userId,
    bookingId = null,
    title,
    message,
    type,
    userEmail = null,
}) => {
    let notificationId = null;
    let emailSent = false;

    try {
        const pool = await poolPromise;

        // ── A. Lưu In-App Notification vào Database ───────────────────────────
        const insertResult = await pool.request()
            .input('userId',    sql.Int,      userId)
            .input('bookingId', sql.Int,      bookingId)
            .input('title',     sql.NVarChar, title)
            .input('message',   sql.NVarChar, message)
            .input('type',      sql.VarChar,  type)
            .query(`
                INSERT INTO NOTIFICATION (UserID, BookingID, Title, Message, Type, IsRead, CreatedDate)
                OUTPUT INSERTED.NotificationID
                VALUES (@userId, @bookingId, @title, @message, @type, 0, GETDATE())
            `);

        notificationId = insertResult.recordset[0]?.NotificationID ?? null;
        console.log(`[Notification] ✓ In-App lưu thành công | User: ${userId} | Type: ${type} | ID: ${notificationId}`);

        // ── B. Gửi Email (bất đồng bộ, không block luồng chính) ──────────────
        if (userEmail && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const mailOptions = {
                from: `"Smart Car Wash" <${process.env.EMAIL_USER}>`,
                to: userEmail,
                subject: `[Smart Car Wash] ${title}`,
                html: buildEmailHtml({ title, message, type, bookingId }),
            };

            // Fire-and-forget: không await để không làm chậm cron job / API
            transporter.sendMail(mailOptions)
                .then((info) => {
                    emailSent = true;
                    console.log(`[Email] ✓ Gửi thành công tới ${userEmail} | MessageID: ${info.messageId}`);
                })
                .catch((err) => {
                    console.error(`[Email] ✗ Gửi thất bại tới ${userEmail}:`, err.message);
                });
        }

    } catch (err) {
        console.error(`[NotificationService] ✗ Lỗi khi tạo thông báo cho User ${userId}:`, err.message);
    }

    return { notificationId, emailSent };
};

module.exports = { createAndSendNotification };
