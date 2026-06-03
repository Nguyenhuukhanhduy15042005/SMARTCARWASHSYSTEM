import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";

export default function Login({ setUser }) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.error === "unauthorized") {
      setErrorMsg("Vui lòng đăng nhập để truy cập trang này!");
    }
  }, [location]);

  // ============================================
  // 1. ĐĂNG NHẬP BẰNG TÀI KHOẢN & MẬT KHẨU
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
        localStorage.setItem("TOKEN", data.token);
        localStorage.setItem("LOGIN_USER", JSON.stringify(data.user));
        setUser(data.user);
        if (data.user.roleId === 1 || data.user.roleId === 2) {
          navigate("/admin");
        } else {
          navigate("/");
        }
      } else {
        setErrorMsg(data.message || "Sai tài khoản hoặc mật khẩu!");
      }
    } catch (err) {
      setErrorMsg("Không thể kết nối đến Server Backend!");
    }
  };

  // ============================================
  // 2. ĐĂNG NHẬP BẰNG GOOGLE
  // Dùng implicit flow — gọi trực tiếp /google-login có sẵn ở backend
  // ============================================
  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Bước 1: Lấy thông tin user từ Google API
        const userInfoRes = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          },
        );

        if (!userInfoRes.ok) {
          setErrorMsg("Không lấy được thông tin từ Google!");
          return;
        }

        const userInfo = await userInfoRes.json();

        // Bước 2: Gửi email + fullName xuống backend (route đã có sẵn)
        const res = await fetch("http://localhost:5000/api/auth/google-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userInfo.email,
            fullName: userInfo.name,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          localStorage.setItem("TOKEN", data.token);
          localStorage.setItem("LOGIN_USER", JSON.stringify(data.user));
          setUser(data.user);
          navigate("/");
        } else {
          setErrorMsg(data.message || "Lỗi đăng nhập qua Google!");
        }
      } catch (err) {
        console.error("Google login error:", err);
        setErrorMsg("Lỗi kết nối: " + err.message);
      }
    },
    onError: (err) => {
      console.error("Google OAuth error:", err);
      setErrorMsg("Đăng nhập Google thất bại!");
    },
    onNonOAuthError: (err) => {
      console.error("Non-OAuth error:", err);
      if (err.type === "popup_blocked") {
        setErrorMsg(
          "Trình duyệt chặn popup! Vào chrome://settings/content/popups và cho phép localhost:5173",
        );
      } else if (err.type === "popup_closed") {
        setErrorMsg("Bạn đã đóng cửa sổ Google. Vui lòng thử lại!");
      }
    },
    flow: "implicit",
  });

  // ============================================
  // 3. GIAO DIỆN
  // ============================================
  return (
    <div className="auth-container">
      <div className="auth-card" style={{ position: "relative" }}>
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
              color: "#475569",
              fontSize: "14px",
              fontWeight: "600",
              transition: "color 0.2s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#F58607")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#475569")}
          >
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

        {errorMsg && <div className="error-msg">{errorMsg}</div>}

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

        <div
          style={{
            marginTop: "15px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => loginWithGoogle()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 24px",
              border: "1px solid #dadce0",
              borderRadius: "6px",
              backgroundColor: "#fff",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              color: "#3c4043",
              transition: "box-shadow 0.2s ease, border-color 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,0.15)";
              e.currentTarget.style.borderColor = "#aaa";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "#dadce0";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
            Đăng nhập bằng Google
          </button>
        </div>

        <p style={{ marginTop: "25px", fontSize: "14px" }}>
          Chưa có tài khoản?{" "}
          <Link
            to="/register"
            style={{
              color: "#F58607",
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
