import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

export default function Login({ setUser }) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  // Hiển thị thông báo nếu bị chặn từ trang yêu cầu quyền (ProtectedRoute)
  useEffect(() => {
    if (location.state?.error === "unauthorized") {
      setErrorMsg("Vui lòng đăng nhập để truy cập trang này!");
    }
  }, [location]);

  // ============================================
  // 1. XỬ LÝ ĐĂNG NHẬP BẰNG TÀI KHOẢN & MẬT KHẨU
  // ============================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Lưu token và thông tin user vào trình duyệt
        localStorage.setItem("TOKEN", data.token);
        localStorage.setItem("LOGIN_USER", JSON.stringify(data.user));
        setUser(data.user);

        // Phân quyền chuyển trang
        if (data.user.roleId === 1 || data.user.roleId === 2) {
          navigate("/admin"); // Admin hoặc Staff
        } else {
          navigate("/"); // Khách hàng về trang chủ
        }
      } else {
        setErrorMsg(data.message || "Sai tài khoản hoặc mật khẩu!");
      }
    } catch (err) {
      setErrorMsg("Không thể kết nối đến Server Backend!");
    }
  };

  // ============================================
  // 2. XỬ LÝ ĐĂNG NHẬP BẰNG GOOGLE (GMAIL)
  // ============================================
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      // Giải mã token của Google để lấy Email và Tên
      const decoded = jwtDecode(credentialResponse.credential);

      // Gửi dữ liệu xuống Backend
      const res = await fetch("http://localhost:5000/api/auth/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: decoded.email,
          fullName: decoded.name,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Đăng nhập thành công
        localStorage.setItem("TOKEN", data.token);
        localStorage.setItem("LOGIN_USER", JSON.stringify(data.user));
        setUser(data.user);
        navigate("/"); // Điều hướng về trang chủ
      } else {
        setErrorMsg(data.message || "Lỗi đăng nhập qua Google!");
      }
    } catch (err) {
      setErrorMsg("Không thể kết nối Backend khi đăng nhập Google!");
    }
  };

  // ============================================
  // 3. GIAO DIỆN HTML (JSX)
  // ============================================
  return (
    <div className="auth-container">
      <div className="auth-card" style={{ position: "relative" }}>
        {/* NÚT QUAY VỀ TRANG CHỦ */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            marginBottom: "15px",
          }}
        >
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              textDecoration: "none",
              color: "#475569", // Màu xám đậm
              fontSize: "14px",
              fontWeight: "600",
              transition: "color 0.2s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#F58607")} // Hover thành màu cam
            onMouseOut={(e) => (e.currentTarget.style.color = "#475569")}
          >
            {/* Icon mũi tên sang trái */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Quay lại
          </Link>
        </div>

        <h2>Đăng Nhập</h2>

        {/* Hiện dòng chữ lỗi màu đỏ nếu có lỗi */}
        {errorMsg && <div className="error-msg">{errorMsg}</div>}

        {/* Form đăng nhập truyền thống */}
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Tài khoản</label>
            <input
              type="text"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="Email hoặc Số điện thoại"
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
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "10px" }}
          >
            Đăng nhập
          </button>
        </form>

        <div className="divider">Hoặc đăng nhập bằng</div>

        {/* Nút Đăng nhập Google */}
        <div
          style={{
            marginTop: "15px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              setErrorMsg("Đăng nhập Google bị hủy hoặc thất bại!");
            }}
          />
        </div>

        {/* Link chuyển sang trang đăng ký */}
        <p style={{ marginTop: "25px", fontSize: "14px" }}>
          Chưa có tài khoản?{" "}
          <Link
            to="/register"
            style={{
              color: "#F58607" /* Màu cam đồng bộ với thiết kế */,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
