// Back-end/routes/vehicle.js
// NHIỆM VỤ CỦA THÁI: Quản lý phương tiện (Task 4 & 8)
const express = require('express');
const router = express.Router();

// Lấy danh sách xe
router.get('/', async (req, res) => {
    try {
        // Viết code lấy danh sách xe của user ở đây
        res.json([]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Thêm xe mới
router.post('/', async (req, res) => {
    try {
        // Viết code thêm phương tiện ở đây
        res.status(201).json({ message: "Placeholder: Thêm xe thành công" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
