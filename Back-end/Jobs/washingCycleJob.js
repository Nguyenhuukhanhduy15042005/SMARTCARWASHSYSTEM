const cron = require('node-cron');
const { sql, poolPromise } = require('../db');
const bookingRouter = require('../routes/booking');
const processBookingStatusChange = bookingRouter.processBookingStatusChange;

let isRunning = false;

const runWashingCycleScan = async () => {
    if (isRunning) return;
    isRunning = true;

    try {
        const pool = await poolPromise;

        // 1. Tìm các booking có Status = 3 (Washing) và thời gian rửa đã quá 30 phút
        const result = await pool.request().query(`
            SELECT BookingID
            FROM BOOKING
            WHERE Status = 3
              AND CheckInTime IS NOT NULL
              AND DATEDIFF(MINUTE, CheckInTime, GETDATE()) >= 30
        `);

        const completedBookings = result.recordset;

        if (completedBookings.length > 0) {
            console.log(`[WashingCycleJob] Tìm thấy ${completedBookings.length} booking đã hoàn tất thời gian rửa.`);

            for (const booking of completedBookings) {
                try {
                    // 2. Chuyển trạng thái booking sang Đã hoàn thành (Status = 4)
                    // Hàm này tự động cập nhật trạng thái máy về Available (Status = 1) và cộng điểm tích lũy
                    await processBookingStatusChange(booking.BookingID, 4, pool);
                    console.log(`[WashingCycleJob] ✓ Đã tự động hoàn tất BK-${booking.BookingID}`);
                } catch (err) {
                    console.error(`[WashingCycleJob] ✗ Lỗi khi hoàn tất BK-${booking.BookingID}:`, err.message);
                }
            }
        }
    } catch (err) {
        console.error('[WashingCycleJob] Lỗi quét chu trình rửa:', err.message);
    } finally {
        isRunning = false;
    }
};

const initWashingCycleJob = () => {
    // Chạy mỗi phút để kiểm tra
    const job = cron.schedule('* * * * *', runWashingCycleScan, {
        scheduled: true,
        timezone: 'Asia/Ho_Chi_Minh',
    });
    console.log('[WashingCycleJob] ✓ Cron Job tự động hoàn tất chu trình rửa đã khởi động');
    return job;
};

module.exports = initWashingCycleJob;
