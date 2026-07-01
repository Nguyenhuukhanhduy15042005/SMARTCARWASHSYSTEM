const cron = require('node-cron');
const { sql, poolPromise } = require('../db');

let isRunning = false;

const runPaymentTimeoutScan = async () => {
    if (isRunning) return;
    isRunning = true;

    try {
        const pool = await poolPromise;

        // 1. Tìm các booking Status=1, chưa có PAYMENT, tạo quá 15 phút
        const result = await pool.request().query(`
            SELECT b.BookingID, b.CustomerID, u.Email, u.FullName, bd.MachineID
            FROM BOOKING b
            INNER JOIN [USER] u ON b.CustomerID = u.UserID
            LEFT JOIN BOOKING_DETAIL bd ON b.BookingID = bd.BookingID
            WHERE b.Status = 1
              AND b.BookingID NOT IN (SELECT BookingID FROM PAYMENT)
              AND DATEDIFF(MINUTE, b.CreatedAt, GETDATE()) > 15
        `);

        const expiredBookings = result.recordset;

        if (expiredBookings.length > 0) {
            console.log(`[PaymentTimeout] Tìm thấy ${expiredBookings.length} booking hết hạn thanh toán.`);

            for (const booking of expiredBookings) {
                // 2. Cập nhật trạng thái booking sang Hủy (Status = 5)
                await pool.request()
                    .input('bookingId', sql.Int, booking.BookingID)
                    .query('UPDATE BOOKING SET Status = 5 WHERE BookingID = @bookingId');

                // 3. Giải phóng máy rửa xe nếu có
                if (booking.MachineID) {
                    await pool.request()
                        .input('machineId', sql.Int, booking.MachineID)
                        .query('UPDATE MACHINE SET Status = 1 WHERE MachineID = @machineId');
                }

                // 4. Gửi thông báo đến khách hàng
                try {
                    const { createAndSendNotification } = require('../Services/notificationService');
                    await createAndSendNotification({
                        userId: booking.CustomerID,
                        bookingId: booking.BookingID,
                        title: 'Đơn đặt lịch bị hủy (Quá hạn thanh toán)',
                        message: `Đơn đặt lịch rửa xe BK-${booking.BookingID} của bạn đã bị hủy tự động vì quá 15 phút chưa hoàn thành thanh toán.`,
                        type: 'CANCEL',
                        userEmail: booking.Email || null,
                    });
                } catch (notiErr) {
                    console.error(`[PaymentTimeout] Lỗi gửi thông báo cho BK-${booking.BookingID}:`, notiErr.message);
                }

                console.log(`[PaymentTimeout] ✓ Đã xử lý hủy và gửi thông báo cho BK-${booking.BookingID}`);
            }
        }
    } catch (err) {
        console.error('[PaymentTimeout] Lỗi:', err.message);
    } finally {
        isRunning = false;
    }
};

const initPaymentTimeoutJob = () => {
    cron.schedule('* * * * *', runPaymentTimeoutScan, {  // Chạy mỗi 1 phút
        scheduled: true,
        timezone: 'Asia/Ho_Chi_Minh',
    });
    console.log('[PaymentTimeout] ✓ Cron Job hủy booking quá 15p đã khởi động');
};

module.exports = initPaymentTimeoutJob;