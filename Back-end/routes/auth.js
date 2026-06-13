const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { sql, poolPromise } = require("../db");
const router = express.Router();

// Map RoleID (số trong DB) → role string dùng trong JWT và frontend
const ROLE_MAP = {
  1: "admin",
  2: "staff",
  3: "user",
};

// ==========================================
// CẤU HÌNH GỬI MAIL (NODEMAILER)
// ==========================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "hungduong738@gmail.com",
    pass: process.env.EMAIL_PASS || "foxjkvzbffrlzkgi",
  },
});

// Nơi lưu trữ OTP tạm thời trong RAM (Key: Email, Value: { otp, expiresAt })
const otpStore = new Map();

// ==========================================
// 1A. ĐĂNG KÝ BƯỚC 1: KIỂM TRA & GỬI OTP
// ==========================================
router.post("/register-step1", async (req, res) => {
  const { fullName, phone, email } = req.body;
  if (!fullName || !phone || !email) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin!" });
  }

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

    // Tạo mã OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Lưu mã OTP vào bộ nhớ, hết hạn sau 5 phút (300,000 ms)
    otpStore.set(email, {
      otp: otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // Nội dung Email
    const mailOptions = {
      from: `"AutoWash Pro" <${process.env.EMAIL_USER || "hungduong738@gmail.com"}>`,
      to: email,
      subject: "Mã xác thực OTP - AutoWash Pro",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #2C387E;">Xin chào ${fullName},</h2>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại <b>AutoWash Pro</b>.</p>
          <p>Mã xác thực OTP của bạn là:</p>
          <h1 style="color: #F58607; font-size: 36px; letter-spacing: 5px; text-align: center; background: #fdf8f0; padding: 15px; border-radius: 8px;">${otp}</h1>
          <p><i>Mã này sẽ hết hạn trong vòng 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.</i></p>
          <p>Trân trọng,<br/>Đội ngũ AutoWash Pro</p>
        </div>
      `,
    };

    // Gửi mail
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Mã OTP đã được gửi đến email của bạn!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi gửi OTP: " + err.message });
  }
});

// ==========================================
// 1B. ĐĂNG KÝ BƯỚC 2: XÁC THỰC OTP & LƯU DB
// ==========================================
router.post("/register-step2", async (req, res) => {
  const { fullName, phone, email, password, otp } = req.body;

  if (!fullName || !phone || !email || !password || !otp) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin!" });
  }

  try {
    const storedOtpData = otpStore.get(email);

    if (!storedOtpData) {
      return res
        .status(400)
        .json({ message: "Mã OTP không tồn tại hoặc chưa được yêu cầu!" });
    }

    if (Date.now() > storedOtpData.expiresAt) {
      otpStore.delete(email); // Xóa OTP cũ
      return res
        .status(400)
        .json({ message: "Mã OTP đã hết hạn, vui lòng gửi lại!" });
    }

    if (storedOtpData.otp !== otp) {
      return res.status(400).json({ message: "Mã OTP không chính xác!" });
    }

    // OTP đúng -> Hash mật khẩu và Lưu vào Database
    const hashedPassword = await bcrypt.hash(password, 10);
    const pool = await poolPromise;
    await pool
      .request()
      .input("fullName", sql.NVarChar, fullName)
      .input("phone", sql.VarChar, phone)
      .input("email", sql.VarChar, email)
      .input("password", sql.NVarChar, hashedPassword).query(`
        INSERT INTO [USER] (FullName, PhoneNumber, Email, Password, RoleID)
        VALUES (@fullName, @phone, @email, @password, 3)
      `);

    // Xóa OTP khỏi bộ nhớ sau khi đăng ký thành công
    otpStore.delete(email);

    res.status(201).json({ message: "Đăng ký tài khoản thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// ================================================================
// 1C. Đăng ký thông thường (Trực tiếp không qua OTP - giữ lại làm fallback)
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
      .query(
        `SELECT UserID FROM [USER] WHERE PhoneNumber = @phone OR Email = @email`,
      );

    if (checkExist.recordset.length > 0) {
      return res
        .status(400)
        .json({ message: "Email hoặc Số điện thoại đã được sử dụng!" });
    }

    // [FIX] Hash mật khẩu trước khi lưu DB
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool
      .request()
      .input("fullName", sql.NVarChar, fullName)
      .input("phone", sql.VarChar, phone)
      .input("email", sql.VarChar, email)
      .input("password", sql.NVarChar, hashedPassword).query(`
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
    return res
      .status(400)
      .json({ message: "Vui lòng nhập tài khoản và mật khẩu!" });
  }

  try {
    const pool = await poolPromise;

    // [FIX] Chỉ query theo account, KHÔNG so sánh password trong SQL nữa
    const result = await pool.request().input("account", sql.VarChar, account)
      .query(`
        SELECT UserID, FullName, RoleID, Password
        FROM [USER]
        WHERE Email = @account OR PhoneNumber = @account
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu!" });
    }

    const user = result.recordset[0];

    // So sánh mật khẩu bằng bcrypt hoặc plaintext fallback cho môi trường test/development
    let isMatch = false;
    if (
      user.Password &&
      (user.Password.startsWith("$2a$") || user.Password.startsWith("$2b$"))
    ) {
      isMatch = await bcrypt.compare(password, user.Password);
    } else {
      isMatch = password === user.Password;
    }

    if (!isMatch) {
      return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu!" });
    }

    // [FIX] Thêm field "role" (string) vào JWT payload
    const role = ROLE_MAP[user.RoleID] || "user";
    const token = jwt.sign(
      { userId: user.UserID, roleId: user.RoleID, role: role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
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
    return res
      .status(400)
      .json({ message: "Thiếu thông tin email từ Google!" });
  }

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
      // Tạo user mới từ Google — dùng phone giả và password giả đã hash
      const dummyPhone = "G-" + Math.floor(10000000 + Math.random() * 90000000);
      // [FIX] Hash dummyPassword thay vì lưu plaintext
      const dummyPassword = await bcrypt.hash("GOOGLE_LOGIN_" + Date.now(), 10);

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

    // [FIX] Thêm field "role" (string) vào JWT payload
    const role = ROLE_MAP[user.RoleID] || "user";
    const token = jwt.sign(
      { userId: user.UserID, roleId: user.RoleID, role: role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      message: "Đăng nhập Google thành công",
      token: token,
      user: { fullName: user.FullName, roleId: user.RoleID, role: role },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Lỗi server Google Login: " + err.message });
  }
});

module.exports = router;
