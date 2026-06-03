// Back-end/routes/auth.js
// NHIỆM VỤ CỦA THẮNG: Đăng nhập / Đăng ký (Task 1)
const jwt = require('jsonwebtoken');
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


// kiểm tra admin

function adminAuth(req, res, next) {
// Lấy token từ header
const token = req.headers.authorization?.split(' ')[1];

// Nếu không có token
if (!token) {
    return res.status(401).json({
        message: 'Không có token'
    });
}

try {

    // Giải mã token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Kiểm tra role admin
    // roleId = 1 là ADMIN
    if (decoded.roleId !== 1) {
        return res.status(403).json({
            message: 'Chỉ ADMIN mới được truy cập'
        });
    }

    // Lưu thông tin user
    req.user = decoded;

    next();

} catch (err) {

    return res.status(401).json({
        message: 'Token không hợp lệ'
    });

}

}

// Route test admin
router.get('/admin', adminAuth, (req, res) => {

res.json({
    message: 'Xin chào ADMIN',
    user: req.user
});

});


module.exports = router;
