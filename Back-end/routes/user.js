const express = require("express");
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../db");
const router = express.Router();

const SECRET_KEY = "smartcarwash_secret_key"; // Phải khớp với bên file auth.js

// Middleware xác thực Token (Chặn các request không có quyền)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Format yêu cầu: "Bearer <token>"

  if (!token) return res.status(401).json({ message: "Vui lòng đăng nhập!" });

  jwt.verify(token, SECRET_KEY, (err, decodedUser) => {
    if (err)
      return res
        .status(403)
        .json({ message: "Token không hợp lệ hoặc đã hết hạn!" });
    req.user = decodedUser; // Lưu cục data { userId, roleId } lấy từ token vào request
    next();
  });
};

// Lấy thông tin cá nhân (Task 2 & 3)
// Phải đi qua authenticateToken trước
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const pool = await poolPromise;
    // Dùng LEFT JOIN để phòng trường hợp user chưa có record trong bảng MEMBER_PROFILE
    const result = await pool
      .request()
      .input("userId", sql.Int, req.user.userId).query(`
                SELECT u.UserID, u.FullName, u.Email, u.PhoneNumber, u.RoleID,
                       ISNULL(m.CurrentPoints, 0) AS LoyaltyPoints
                FROM [USER] u
                LEFT JOIN MEMBER_PROFILE m ON u.UserID = m.UserID
                WHERE u.UserID = @userId
            `);

    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(404).json({ message: "Không tìm thấy người dùng" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cập nhật profile (Task 2 & 3)
router.put("/profile", authenticateToken, async (req, res) => {
  const { fullName, phone, email } = req.body;

  try {
    const pool = await poolPromise;
    await pool
      .request()
      .input("userId", sql.Int, req.user.userId)
      .input("fullName", sql.NVarChar, fullName)
      .input("phone", sql.VarChar, phone)
      .input("email", sql.VarChar, email).query(`
                UPDATE [USER] 
                SET FullName = @fullName, PhoneNumber = @phone, Email = @email
                WHERE UserID = @userId
            `);

    res.json({ message: "Cập nhật profile thành công!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
