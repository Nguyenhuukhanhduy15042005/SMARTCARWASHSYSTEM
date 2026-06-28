const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
// GET /api/notifications?userId=123 — Lấy danh sách thông báo của User
router.get('/', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) return res.status(400).json({ message: 'Thiếu userId' });
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT * FROM NOTIFICATION WHERE UserID = @userId ORDER BY CreatedDate DESC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// PUT /api/notifications/:id/read — Đánh dấu 1 thông báo là đã đọc
router.put('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .query('UPDATE NOTIFICATION SET IsRead = 1 WHERE NotificationID = @id');
        res.json({ message: 'Đã cập nhật trạng thái đã đọc' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
module.exports = router;