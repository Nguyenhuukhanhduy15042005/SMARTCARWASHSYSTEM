const express = require("express");
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../db");
const router = express.Router();

const SECRET_KEY = "smartcarwash_secret_key";

// 1. Đăng ký thông thường
router.post("/register", async (req, res) => {
  const { fullName, phone, email, password } = req.body;
  try {
    const pool = await poolPromise;
    const checkExist = await pool
      .request()
      .input("phone", sql.VarChar, phone)
      .input("email", sql.VarChar, email)
      .query(
        `SELECT UserID FROM [USER] WHERE PhoneNumber = @phone OR Email = @email`,
      );

    if (checkExist.recordset.length > 0) {
      return res
        .status(400)
        .json({ message: "Email hoặc Số điện thoại đã được sử dụng!" });
    }

    await pool
      .request()
      .input("fullName", sql.NVarChar, fullName)
      .input("phone", sql.VarChar, phone)
      .input("email", sql.VarChar, email)
      .input("password", sql.NVarChar, password).query(`
                INSERT INTO [USER] (FullName, PhoneNumber, Email, Password, RoleID)
                VALUES (@fullName, @phone, @email, @password, 3)
            `);
    res.status(201).json({ message: "Đăng ký thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// 2. Đăng nhập thông thường
router.post("/login", async (req, res) => {
  const { account, password } = req.body;
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("account", sql.VarChar, account)
      .input("password", sql.NVarChar, password).query(`
                SELECT UserID, FullName, RoleID 
                FROM [USER] 
                WHERE (Email = @account OR PhoneNumber = @account) 
                AND Password = @password
            `);

    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      const token = jwt.sign(
        { userId: user.UserID, roleId: user.RoleID },
        SECRET_KEY,
        { expiresIn: "1d" },
      );
      res.json({
        message: "Đăng nhập thành công",
        token: token,
        user: { fullName: user.FullName, roleId: user.RoleID },
      });
    } else {
      res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu!" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Đăng nhập bằng Google (Đã fix lỗi thiếu PhoneNumber)
router.post("/google-login", async (req, res) => {
  const { email, fullName } = req.body;
  try {
    const pool = await poolPromise;
    let result = await pool
      .request()
      .input("email", sql.VarChar, email)
      .query(
        `SELECT UserID, FullName, RoleID FROM [USER] WHERE Email = @email`,
      );

    let user;

    if (result.recordset.length > 0) {
      user = result.recordset[0];
    } else {
      // Xử lý tạo thông tin giả để không bị lỗi Database
      const dummyPhone = "G-" + Math.floor(10000000 + Math.random() * 90000000);
      const dummyPassword = "GOOGLE_LOGIN_NOPASSWORD";

      const insertResult = await pool
        .request()
        .input("email", sql.VarChar, email)
        .input("fullName", sql.NVarChar, fullName)
        .input("phone", sql.VarChar, dummyPhone)
        .input("password", sql.NVarChar, dummyPassword).query(`
                    INSERT INTO [USER] (FullName, Email, PhoneNumber, Password, RoleID)
                    OUTPUT INSERTED.UserID, INSERTED.FullName, INSERTED.RoleID
                    VALUES (@fullName, @email, @phone, @password, 3)
                `);
      user = insertResult.recordset[0];
    }

    const token = jwt.sign(
      { userId: user.UserID, roleId: user.RoleID },
      SECRET_KEY,
      { expiresIn: "1d" },
    );
    res.json({
      message: "Đăng nhập Google thành công",
      token: token,
      user: { fullName: user.FullName, roleId: user.RoleID },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Lỗi server Google Login: " + err.message });
  }
});

module.exports = router;
