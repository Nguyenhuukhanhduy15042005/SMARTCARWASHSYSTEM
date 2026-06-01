// Back-end/routes/auth.js
// NHIỆM VỤ CỦA THẮNG: Đăng nhập / Đăng ký (Task 1)
const express = require('express');
const router = express.Router();

// Đăng ký
router.post('/register', async (req, res) => {
    try {
        // Viết code đăng ký ở đây
        res.status(201).json({ message: "Placeholder: Đăng ký thành công" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Đăng nhập
router.post('/login', async (req, res) => {
    try {
        // Viết code đăng nhập JWT ở đây
        res.json({ message: "Placeholder: Đăng nhập thành công", token: "mock-token" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
