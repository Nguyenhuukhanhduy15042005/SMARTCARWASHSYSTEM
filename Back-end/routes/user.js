// Back-end/routes/user.js
const express = require("express");
const bcrypt = require("bcryptjs");
const { sql, poolPromise } = require("../db");
const verifyToken = require("../middleware/verifyToken");
const router = express.Router();

// HEAD (main): Lấy thông tin cá nhân của người dùng hiện tại (dùng token)
router.get("/me", verifyToken, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("userId", sql.Int, req.user.userId)
      .query(`
        SELECT UserID, FullName, Email, PhoneNumber, RoleID
        FROM [USER]
        WHERE UserID = @userId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// HEAD (main): Cập nhật thông tin cá nhân của người dùng hiện tại (dùng token)
router.put("/me", verifyToken, async (req, res) => {
  const { fullName, phone, email, newPassword } = req.body;

  try {
    const pool = await poolPromise;

    const checkDuplicate = await pool
      .request()
      .input("phone", sql.VarChar, phone)
      .input("email", sql.VarChar, email)
      .input("userId", sql.Int, req.user.userId)
      .query(`
        SELECT UserID FROM [USER]
        WHERE (PhoneNumber = @phone OR Email = @email)
        AND UserID != @userId
      `);

    if (checkDuplicate.recordset.length > 0) {
      return res.status(400).json({ message: "Email hoặc Số điện thoại đã được người khác sử dụng!" });
    }

    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool
        .request()
        .input("fullName", sql.NVarChar, fullName)
        .input("phone", sql.VarChar, phone)
        .input("email", sql.VarChar, email)
        .input("password", sql.NVarChar, hashedPassword)
        .input("userId", sql.Int, req.user.userId)
        .query(`
          UPDATE [USER]
          SET FullName = @fullName, PhoneNumber = @phone, Email = @email, Password = @password
          WHERE UserID = @userId
        `);
    } else {
      await pool
        .request()
        .input("fullName", sql.NVarChar, fullName)
        .input("phone", sql.VarChar, phone)
        .input("email", sql.VarChar, email)
        .input("userId", sql.Int, req.user.userId)
        .query(`
          UPDATE [USER]
          SET FullName = @fullName, PhoneNumber = @phone, Email = @email
          WHERE UserID = @userId
        `);
    }

    res.json({ message: "Cập nhật thông tin thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// HEAD (main): Lấy danh sách toàn bộ người dùng (chỉ Admin)
router.get("/", verifyToken, async (req, res) => {
  if (req.user.roleId !== 1) {
    return res.status(403).json({ message: "Chỉ admin mới được xem danh sách người dùng!" });
  }

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .query(`
        SELECT UserID, FullName, Email, PhoneNumber, RoleID
        FROM [USER]
        ORDER BY UserID DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// booking-Customer: Lấy thông tin cá nhân (Profile & Loyalty points & Tier)
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

// booking-Customer: Cập nhật profile từ User Dashboard
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