const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { sql, poolPromise } = require("../db");
const router = express.Router();

// Map RoleID (số trong DB) → role string dùng trong JWT và frontend
const ROLE_MAP = {
  1: "admin",
  2: "staff",
  3: "user",
};

// ================================================================
// 1. Đăng ký thông thường
// ================================================================
router.post("/register", async (req, res) => {
  const { fullName, phone, email, password } = req.body;

  if (!fullName || !phone || !email || !password) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin!" });
  }

  try {
    const pool = await poolPromise;

    // Kiểm tra email / SĐT đã tồn tại chưa
    const checkExist = await pool
      .request()
      .input("phone", sql.VarChar, phone)
      .input("email", sql.VarChar, email)
      .query(`SELECT UserID FROM [USER] WHERE PhoneNumber = @phone OR Email = @email`);

    if (checkExist.recordset.length > 0) {
      return res.status(400).json({ message: "Email hoặc Số điện thoại đã được sử dụng!" });
    }

    // [FIX] Hash mật khẩu trước khi lưu DB
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool
      .request()
      .input("fullName", sql.NVarChar, fullName)
      .input("phone", sql.VarChar, phone)
      .input("email", sql.VarChar, email)
      .input("password", sql.NVarChar, hashedPassword)
      .query(`
        INSERT INTO [USER] (FullName, PhoneNumber, Email, Password, RoleID)
        VALUES (@fullName, @phone, @email, @password, 3)
      `);

    res.status(201).json({ message: "Đăng ký thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// ================================================================
// 2. Đăng nhập thông thường
// ================================================================
router.post("/login", async (req, res) => {
  const { account, password } = req.body;

  if (!account || !password) {
    return res.status(400).json({ message: "Vui lòng nhập tài khoản và mật khẩu!" });
  }

  try {
    const pool = await poolPromise;

    // [FIX] Chỉ query theo account, KHÔNG so sánh password trong SQL nữa
    const result = await pool
      .request()
      .input("account", sql.VarChar, account)
      .query(`
        SELECT UserID, FullName, RoleID, Password
        FROM [USER]
        WHERE Email = @account OR PhoneNumber = @account
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu!" });
    }

    const user = result.recordset[0];

    // [FIX] So sánh mật khẩu bằng bcrypt
    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) {
      return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu!" });
    }

    // [FIX] Thêm field "role" (string) vào JWT payload
    const role = ROLE_MAP[user.RoleID] || "user";
    const token = jwt.sign(
      { userId: user.UserID, roleId: user.RoleID, role: role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Đăng nhập thành công",
      token: token,
      user: { fullName: user.FullName, roleId: user.RoleID, role: role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================================================================
// 3. Đăng nhập bằng Google
// ================================================================
router.post("/google-login", async (req, res) => {
  const { email, fullName } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Thiếu thông tin email từ Google!" });
  }

  try {
    const pool = await poolPromise;

    let result = await pool
      .request()
      .input("email", sql.VarChar, email)
      .query(`SELECT UserID, FullName, RoleID FROM [USER] WHERE Email = @email`);

    let user;

    if (result.recordset.length > 0) {
      user = result.recordset[0];
    } else {
      // Tạo user mới từ Google — dùng phone giả và password giả đã hash
      const dummyPhone = "G-" + Math.floor(10000000 + Math.random() * 90000000);
      // [FIX] Hash dummyPassword thay vì lưu plaintext
      const dummyPassword = await bcrypt.hash("GOOGLE_LOGIN_" + Date.now(), 10);

      const insertResult = await pool
        .request()
        .input("email", sql.VarChar, email)
        .input("fullName", sql.NVarChar, fullName)
        .input("phone", sql.VarChar, dummyPhone)
        .input("password", sql.NVarChar, dummyPassword)
        .query(`
          INSERT INTO [USER] (FullName, Email, PhoneNumber, Password, RoleID)
          OUTPUT INSERTED.UserID, INSERTED.FullName, INSERTED.RoleID
          VALUES (@fullName, @email, @phone, @password, 3)
        `);

      user = insertResult.recordset[0];
    }

    // [FIX] Thêm field "role" (string) vào JWT payload
    const role = ROLE_MAP[user.RoleID] || "user";
    const token = jwt.sign(
      { userId: user.UserID, roleId: user.RoleID, role: role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Đăng nhập Google thành công",
      token: token,
      user: { fullName: user.FullName, roleId: user.RoleID, role: role },
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server Google Login: " + err.message });
  }
});

module.exports = router;
