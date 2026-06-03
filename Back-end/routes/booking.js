// Back-end/routes/booking.js
// NHIỆM VỤ CỦA TRỌNG & HUY (Task 6, 7) VÀ THẮNG (Task 5)
const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

// THẮNG (Task 5): Tạo lịch đặt xe mới
router.post('/', async (req, res) => {
    try {
        res.status(201).json({ message: "Placeholder: Tạo booking thành công" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// TRỌNG & HUY (Task 6): Chuyển đổi trạng thái FSM (Pending -> Confirmed -> In Service -> Completed -> Cancelled)
router.post('/:id/transition', async (req, res) => {
    try {
        const { id } = req.params;
        const { nextStatus } = req.body; // Ví dụ: 'Confirmed', 'In Service', 'Completed'

        const pool = await poolPromise;
        // Thực hiện cập nhật trạng thái mới
        await pool.request()
            .input('bookingId', sql.Int, id)
            .input('status', sql.VarChar, nextStatus)
            .query('UPDATE BOOKING SET Status = @status WHERE BookingID = @bookingId');

        res.json({ message: `Cập nhật trạng thái thành ${nextStatus} thành công` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// TRỌNG (Task 7): Xem danh sách booking của Staff
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT b.*, u.FullName AS CustomerName, u.PhoneNumber AS Phone
            FROM BOOKING b
            LEFT JOIN [USER] u ON b.CustomerID = u.UserID
            ORDER BY b.BookingDate DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// TRỌNG (Task 7): Chi tiết lịch đặt xe
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('bookingId', sql.Int, id)
            .query(`
                SELECT b.*, u.FullName AS CustomerName, u.PhoneNumber AS Phone
                FROM BOOKING b
                LEFT JOIN [USER] u ON b.CustomerID = u.UserID
                WHERE b.BookingID = @bookingId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy lịch đặt xe" });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// TRỌNG (Task 7): Xem lịch sử booking của một Khách hàng cụ thể
router.get('/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('customerId', sql.Int, customerId)
            .query(`
                SELECT b.*, u.FullName AS CustomerName, u.PhoneNumber AS Phone
                FROM BOOKING b
                LEFT JOIN [USER] u ON b.CustomerID = u.UserID
                WHERE b.CustomerID = @customerId
                ORDER BY b.BookingDate DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;