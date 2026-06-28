const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

// ─── GET /api/notifications?userId=123 ───────────────────────────────────────
// Lấy danh sách thông báo của user, mới nhất trước, tối đa 50 bản ghi
router.get('/', async (req, res) => {
    const userId = parseInt(req.query.userId, 10);
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'userId không hợp lệ.' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT TOP 50
                    NotificationID,
                    UserID,
                    BookingID,
                    Title,
                    Message,
                    Type,
                    IsRead,
                    CreatedDate
                FROM NOTIFICATION
                WHERE UserID = @userId
                ORDER BY CreatedDate DESC
            `);

        return res.json(result.recordset);

    } catch (err) {
        console.error('[GET /notifications]', err.message);
        return res.status(500).json({ error: 'Không thể lấy danh sách thông báo.' });
    }
});

// ─── GET /api/notifications/unread-count?userId=123 ──────────────────────────
// Lấy số lượng thông báo chưa đọc (dùng cho badge)
router.get('/unread-count', async (req, res) => {
    const userId = parseInt(req.query.userId, 10);
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'userId không hợp lệ.' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT COUNT(*) AS UnreadCount
                FROM NOTIFICATION
                WHERE UserID = @userId AND IsRead = 0
            `);

        return res.json({ unreadCount: result.recordset[0].UnreadCount });

    } catch (err) {
        console.error('[GET /notifications/unread-count]', err.message);
        return res.status(500).json({ error: 'Không thể lấy số thông báo chưa đọc.' });
    }
});

// ─── PUT /api/notifications/:id/read ─────────────────────────────────────────
// Đánh dấu một thông báo đã đọc
router.put('/:id/read', async (req, res) => {
    const notificationId = parseInt(req.params.id, 10);
    if (!notificationId || isNaN(notificationId)) {
        return res.status(400).json({ error: 'ID thông báo không hợp lệ.' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, notificationId)
            .query(`
                UPDATE NOTIFICATION
                SET IsRead = 1
                WHERE NotificationID = @id AND IsRead = 0
            `);

        if (result.rowsAffected[0] === 0) {
            // Có thể đã đọc trước đó hoặc không tìm thấy — cả 2 đều OK với client
            return res.json({ success: true, message: 'Thông báo đã được đánh dấu đọc (hoặc không tồn tại).' });
        }

        return res.json({ success: true, message: 'Đã đánh dấu thông báo là đã đọc.' });

    } catch (err) {
        console.error('[PUT /notifications/:id/read]', err.message);
        return res.status(500).json({ error: 'Không thể cập nhật trạng thái thông báo.' });
    }
});

// ─── PUT /api/notifications/read-all?userId=123 ──────────────────────────────
// Đánh dấu tất cả thông báo của user là đã đọc (1 lần query thay vì N lần)
router.put('/read-all', async (req, res) => {
    const userId = parseInt(req.query.userId, 10);
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'userId không hợp lệ.' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                UPDATE NOTIFICATION
                SET IsRead = 1
                WHERE UserID = @userId AND IsRead = 0
            `);

        return res.json({
            success: true,
            updatedCount: result.rowsAffected[0],
            message: `Đã đánh dấu ${result.rowsAffected[0]} thông báo là đã đọc.`,
        });

    } catch (err) {
        console.error('[PUT /notifications/read-all]', err.message);
        return res.status(500).json({ error: 'Không thể cập nhật thông báo.' });
    }
});

// ─── DELETE /api/notifications/:id ───────────────────────────────────────────
// Xoá một thông báo (tuỳ chọn, nếu cần)
router.delete('/:id', async (req, res) => {
    const notificationId = parseInt(req.params.id, 10);
    if (!notificationId || isNaN(notificationId)) {
        return res.status(400).json({ error: 'ID thông báo không hợp lệ.' });
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, notificationId)
            .query(`DELETE FROM NOTIFICATION WHERE NotificationID = @id`);

        return res.json({ success: true, message: 'Đã xoá thông báo.' });

    } catch (err) {
        console.error('[DELETE /notifications/:id]', err.message);
        return res.status(500).json({ error: 'Không thể xoá thông báo.' });
    }
});

module.exports = router;
