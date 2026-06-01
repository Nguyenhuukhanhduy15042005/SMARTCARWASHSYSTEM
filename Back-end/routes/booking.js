// Back-end/routes/booking.js
// NHIỆM VỤ CỦA TRỌNG & HUY (Task 6, 7) VÀ THẮNG (Task 5)
const express = require('express');
const router = express.Router();

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
        res.json({ message: "Placeholder: Chuyển trạng thái thành công" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// TRỌNG (Task 7): Xem lịch sử booking
router.get('/', async (req, res) => {
    try {
        res.json([]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// TRỌNG (Task 7): Chi tiết lịch đặt xe
router.get('/:id', async (req, res) => {
    try {
        res.json({ message: "Placeholder: Chi tiết booking" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
