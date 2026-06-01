// Back-end/routes/user.js
// NHIỆM VỤ CỦA DUY: Profile & Roles (Task 2 & 3)
const express = require('express');
const router = express.Router();

// Lấy thông tin cá nhân
router.get('/profile', async (req, res) => {
    try {
        // Viết code lấy thông tin cá nhân, loyalty points ở đây
        res.json({ message: "Placeholder: Profile cá nhân" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Cập nhật profile
router.put('/profile', async (req, res) => {
    try {
        // Viết code cập nhật thông tin cá nhân ở đây
        res.json({ message: "Placeholder: Cập nhật profile thành công" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
