// Back-end/routes/user.js
const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

// Lấy thông tin cá nhân (Profile & Loyalty points & Tier)
router.get('/profile', async (req, res) => {
    try {
        const pool = await poolPromise;
        const userId = req.query.userId || 12; // Mặc định userId = 12 cho mục đích test trực tiếp

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT 
                    u.UserID, 
                    u.FullName, 
                    u.PhoneNumber, 
                    u.Email,
                    COALESCE(mp.CurrentPoints, 0) AS CurrentPoints, 
                    COALESCE(mp.AccumulatedPoints, 0) AS AccumulatedPoints, 
                    COALESCE(lt.TierName, N'Standard') AS TierName, 
                    COALESCE(lt.DiscountRate, 0) AS DiscountRate
                FROM [USER] u
                LEFT JOIN MEMBER_PROFILE mp ON u.UserID = mp.UserID
                LEFT JOIN LOYALTY_TIER lt ON mp.TierID = lt.TierID
                WHERE u.UserID = @userId
            `);
            
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy thông tin người dùng" });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Cập nhật profile
router.put('/profile', async (req, res) => {
    try {
        const { FullName, Email, PhoneNumber, UserID } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('userId', sql.Int, UserID || 12)
            .input('fullName', sql.NVarChar, FullName)
            .input('email', sql.NVarChar, Email)
            .input('phoneNumber', sql.NVarChar, PhoneNumber)
            .query(`
                UPDATE [USER]
                SET FullName = @fullName, Email = @email, PhoneNumber = @phoneNumber
                WHERE UserID = @userId
            `);
        res.json({ message: "Cập nhật thông tin cá nhân thành công!" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
