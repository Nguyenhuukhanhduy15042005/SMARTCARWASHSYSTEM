const express = require("express");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { sql, poolPromise } = require("../db");
const router = express.Router();

const SECRET_KEY = "smartcarwash_secret_key";

// ==========================================
// CẤU HÌNH GỬI MAIL (NODEMAILER)
// ==========================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "hungduong738@gmail.com", // TODO: Thay bằng Gmail của bạn
    pass: "foxjkvzbffrlzkgi", // TODO: Thay bằng Mật khẩu ứng dụng (App Password)
  },
});

// Nơi lưu trữ OTP tạm thời trong RAM (Key: Email, Value: { otp, expiresAt })
const otpStore = new Map();

// ==========================================
// 1A. ĐĂNG KÝ BƯỚC 1: KIỂM TRA & GỬI OTP
// ==========================================
router.post("/register-step1", async (req, res) => {
  const { fullName, phone, email } = req.body;
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
      from: '"AutoWash Pro" <hungduong738@gmail.com>', // Nhớ đổi Email ở đây nữa nhé
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

    // OTP đúng -> Lưu vào Database
    const pool = await poolPromise;
    await pool
      .request()
      .input("fullName", sql.NVarChar, fullName)
      .input("phone", sql.VarChar, phone)
      .input("email", sql.VarChar, email)
      .input("password", sql.NVarChar, password).query(`
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

// ==========================================
// 2. ĐĂNG NHẬP THÔNG THƯỜNG
// ==========================================
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

// ==========================================
// 3. ĐĂNG NHẬP BẰNG GOOGLE
// ==========================================
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
