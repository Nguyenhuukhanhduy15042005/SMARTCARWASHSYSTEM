const cron = require('node-cron');
const { sql, poolPromise } = require('../db');
const { createAndSendNotification } = require('../services/notificationService');
const initReminderJob = () => {
    // Chạy mỗi 5 phút một lần: '*/5 * * * *'
    cron.schedule('*/5 * * * *', async () => {
        console.log('[Cron Job] Đang quét lịch hẹn sắp diễn ra để gửi nhắc nhở...');
        try {
            const pool = await poolPromise;

            // Tìm các booking chưa hoàn thành/hủy (Status 1 hoặc 2) 
            // có BookingDate nằm trong khoảng từ (hiện tại + 55 phút) đến (hiện tại + 65 phút)
            const result = await pool.request().query(`
                SELECT b.BookingID, b.CustomerID, b.BookingDate, u.Email
                FROM BOOKING b
                JOIN [USER] u ON b.CustomerID = u.UserID
                WHERE b.Status IN (1, 2)
                  AND b.BookingDate BETWEEN DATEADD(minute, 55, GETDATE()) AND DATEADD(minute, 65, GETDATE())
            `);
            for (const b of result.recordset) {
                // Kiểm tra xem đã gửi nhắc nhở cho booking này chưa để tránh gửi lặp
                const checkNoti = await pool.request()
                    .input('bid', sql.Int, b.BookingID)
                    .query("SELECT NotificationID FROM NOTIFICATION WHERE BookingID = @bid AND Type = 'REMINDER'");
                if (checkNoti.recordset.length === 0) {
                    const timeStr = new Date(b.BookingDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                    createAndSendNotification({
                        userId: b.CustomerID,
                        bookingId: b.BookingID,
                        title: 'Nhắc lịch: Sắp đến giờ rửa xe!',
                        message: `Bạn có lịch hẹn rửa xe (BK-${b.BookingID}) vào lúc ${timeStr} hôm nay. Vui lòng đến đúng giờ nhé!`,
                        type: 'REMINDER',
                        userEmail: b.Email
                    });
                }
            }
        } catch (err) {
            console.error('[Cron Job Error]', err.message);
        }
    });
};
module.exports = initReminderJob;