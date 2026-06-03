const express = require("express");
const bcrypt = require("bcryptjs");
const { sql, poolPromise } = require("../db");
const verifyToken = require("../middleware/verifyToken");
const router = express.Router();

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

module.exports = router;