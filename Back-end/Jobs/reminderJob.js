const cron = require('node-cron');
const { sql, poolPromise } = require('../db');
const { createAndSendNotification } = require('../services/notificationService');

// ─── Cờ chống chạy đè (tránh overlap khi query DB chậm) ──────────────────────
let isRunning = false;

// ─── Logic quét và gửi nhắc lịch ─────────────────────────────────────────────
const runReminderScan = async () => {
    if (isRunning) {
        console.log('[ReminderJob] Bỏ qua lượt này — lượt trước vẫn đang chạy.');
        return;
    }
    isRunning = true;
    const startTime = Date.now();
    console.log(`[ReminderJob] ▶ Bắt đầu quét lúc ${new Date().toLocaleString('vi-VN')}`);

    try {
        const pool = await poolPromise;

        // Tìm booking chưa hoàn thành/hủy có giờ hẹn trong khoảng 55–65 phút tới
        // (window 10 phút để tránh bỏ sót khi cron chạy trễ vài giây)
        const result = await pool.request().query(`
            SELECT
                b.BookingID,
                b.CustomerID,
                b.BookingDate,
                u.Email,
                u.FullName
            FROM BOOKING b
            JOIN [USER] u ON b.CustomerID = u.UserID
            WHERE b.Status IN (1, 2)
              AND b.BookingDate BETWEEN DATEADD(minute, 55, GETDATE())
                                    AND DATEADD(minute, 65, GETDATE())
        `);

        const bookings = result.recordset;
        console.log(`[ReminderJob] Tìm thấy ${bookings.length} lịch hẹn sắp tới.`);

        // Xử lý song song, tối đa 5 booking cùng lúc (tránh quá tải DB)
        const CONCURRENCY = 5;
        for (let i = 0; i < bookings.length; i += CONCURRENCY) {
            const batch = bookings.slice(i, i + CONCURRENCY);
            await Promise.allSettled(batch.map(processBookingReminder));
        }

    } catch (err) {
        console.error('[ReminderJob] ✗ Lỗi khi quét DB:', err.message);
    } finally {
        isRunning = false;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[ReminderJob] ■ Hoàn thành sau ${elapsed}s`);
    }
};

// ─── Xử lý nhắc lịch cho từng booking ───────────────────────────────────────
const processBookingReminder = async (booking) => {
    try {
        const pool = await poolPromise;

        // Kiểm tra đã gửi REMINDER cho booking này chưa (deduplication guard)
        const checkResult = await pool.request()
            .input('bookingId', sql.Int, booking.BookingID)
            .query(`
                SELECT TOP 1 NotificationID
                FROM NOTIFICATION
                WHERE BookingID = @bookingId
                  AND Type = 'REMINDER'
            `);

        if (checkResult.recordset.length > 0) {
            // Đã nhắc rồi, bỏ qua
            return;
        }

        const timeStr = new Date(booking.BookingDate).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
        });
        const greeting = booking.FullName ? `Xin chào ${booking.FullName},` : 'Xin chào,';

        await createAndSendNotification({
            userId:    booking.CustomerID,
            bookingId: booking.BookingID,
            title:     'Nhắc lịch: Sắp đến giờ rửa xe!',
            message:   `${greeting} Bạn có lịch hẹn rửa xe (BK-${booking.BookingID}) vào lúc ${timeStr} hôm nay. Vui lòng đến đúng giờ để được phục vụ tốt nhất!`,
            type:      'REMINDER',
            userEmail: booking.Email || null,
        });

        console.log(`[ReminderJob] ✓ Đã nhắc BK-${booking.BookingID} cho User ${booking.CustomerID}`);

    } catch (err) {
        console.error(`[ReminderJob] ✗ Lỗi khi xử lý BK-${booking.BookingID}:`, err.message);
    }
};

// ─── Khởi tạo Cron Job ────────────────────────────────────────────────────────
const initReminderJob = () => {
    // Chạy mỗi 5 phút: '*/5 * * * *'
    // Timezone Việt Nam để log giờ chính xác
    const job = cron.schedule('*/5 * * * *', runReminderScan, {
        scheduled: true,
        timezone: 'Asia/Ho_Chi_Minh',
    });

    console.log('[ReminderJob] ✓ Cron Job nhắc lịch đã khởi động (chạy mỗi 5 phút)');

    // Graceful shutdown: dừng job khi app tắt
    process.on('SIGTERM', () => {
        job.stop();
        console.log('[ReminderJob] Đã dừng Cron Job (SIGTERM).');
    });
    process.on('SIGINT', () => {
        job.stop();
        console.log('[ReminderJob] Đã dừng Cron Job (SIGINT).');
    });

    return job;
};

module.exports = initReminderJob;
