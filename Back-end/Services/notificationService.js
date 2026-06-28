const nodemailer = require('nodemailer');
const { sql, poolPromise } = require('../db');
// 1. Cấu hình Transporter để gửi Email (Dùng Gmail SMTP)
// Lưu ý: pass ở đây là "App Password" (Mật khẩu ứng dụng) của Gmail, không phải mật khẩu nick Gmail thường.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'binbintrongkt@gmail.com',
        pass: process.env.EMAIL_PASS || 'tcavoakshdjuehjq'
    }
});
/**
 * Hàm gửi thông báo chung (Lưu vào DB + Gửi Email)
 */
const createAndSendNotification = async ({ userId, bookingId = null, title, message, type, userEmail = null }) => {
    try {
        const pool = await poolPromise;
        // A. Lưu thông báo In-App vào Database
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('bookingId', sql.Int, bookingId)
            .input('title', sql.NVarChar, title)
            .input('message', sql.NVarChar, message)
            .input('type', sql.VarChar, type)
            .query(`
                INSERT INTO NOTIFICATION (UserID, BookingID, Title, Message, Type, IsRead, CreatedDate)
                VALUES (@userId, @bookingId, @title, @message, @type, 0, GETDATE())
            `);
        console.log(`[Notification] Đã lưu thông báo In-App cho User ${userId}`);
        // B. Gửi Email nếu có Email khách hàng
        if (userEmail) {
            const mailOptions = {
                from: '"SMART CAR WASH" <no-reply@smartcarwash.com>',
                to: userEmail,
                subject: `[Smart Car Wash] ${title}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                        <h2 style="color: #2563eb;">${title}</h2>
                        <p style="font-size: 16px; color: #333;">Xin chào,</p>
                        <p style="font-size: 15px; color: #555; line-height: 1.5;">${message}</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p style="font-size: 13px; color: #888;">Cảm ơn bạn đã sử dụng dịch vụ của Smart Car Wash!</p>
                    </div>
                `
            };
            // Gửi email bất đồng bộ (không await để tránh làm chậm response của API)
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) console.error('[Email Error]', err.message);
                else console.log('[Email Sent]', info.response);
            });
        }
    } catch (err) {
        console.error('[Notification Service Error]', err.message);
    }
};
module.exports = { createAndSendNotification };