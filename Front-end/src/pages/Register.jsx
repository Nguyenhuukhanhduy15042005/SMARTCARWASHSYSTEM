import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Kiểm tra mật khẩu xác nhận
    if (password !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không khớp!");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg("Đăng ký thành công! Đang chuyển hướng...");
        // Đợi 2 giây để user đọc thông báo rồi tự động chuyển về trang Login
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setErrorMsg(data.message || "Đăng ký thất bại!");
      }
    } catch (err) {
      setErrorMsg("Không thể kết nối đến Server Backend!");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Đăng Ký Tài Khoản</h2>

        {/* Thông báo lỗi hoặc thành công */}
        {errorMsg && (
          <div
            className="error-msg"
            style={{ color: "red", marginBottom: "10px" }}
          >
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div
            className="success-msg"
            style={{ color: "green", marginBottom: "10px" }}
          >
            {successMsg}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>Họ và tên</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nhập họ và tên"
              required
            />
          </div>

          <div className="input-group">
            <label>Số điện thoại</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại"
              required
            />
          </div>

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập địa chỉ email"
              required
            />
          </div>

          <div className="input-group">
            <label>Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              required
            />
          </div>

          <div className="input-group">
            <label>Xác nhận mật khẩu</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "15px" }}
          >
            Đăng ký
          </button>
        </form>

        <p style={{ marginTop: "25px", fontSize: "14px", textAlign: "center" }}>
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            style={{
              color: "var(--primary-color)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
