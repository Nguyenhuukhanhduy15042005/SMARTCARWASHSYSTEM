
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useState } from "react";
import "./Login.css";

const MOCK_USERS = [
  {
    username: "admin",
    password: "admin123",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
      btoa(JSON.stringify({ sub: "1", name: "Admin User", role: "admin", exp: 9999999999 })) +
      ".mock_signature",
  },
  {
    username: "user",
    password: "user123",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
      btoa(JSON.stringify({ sub: "2", name: "John Doe", role: "user", exp: 9999999999 })) +
      ".mock_signature",
  },
];

const mockLogin = (username, password) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const found = MOCK_USERS.find(
        (u) => u.username === username && u.password === password
      );
      if (found) {
        resolve({ token: found.token });
      } else {
        reject(new Error("Tên đăng nhập hoặc mật khẩu không đúng"));
      }
    }, 800);
  });
};

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { token } = await mockLogin(form.username, form.password);
      localStorage.setItem("token", token);

      const decoded = jwtDecode(token);
      if (decoded.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="10" fill="#0f4c81" />
              <path d="M10 26 L18 10 L26 26" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M13 21 H23" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="login-title">Smart Car Wash</h1>
          <p className="login-subtitle">Đăng nhập vào hệ thống</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="username">Tên đăng nhập</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Nhập tên đăng nhập"
                value={form.username}
                onChange={handleChange}
                autoComplete="username"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="password"
                name="password"
                type={showPass ? "text" : "password"}
                placeholder="Nhập mật khẩu"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-pass"
                onClick={() => setShowPass(!showPass)}
                tabIndex={-1}
                aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPass ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-msg" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" />
                Đang đăng nhập...
              </span>
            ) : (
              "Đăng nhập"
            )}
          </button>
        </form>

        <div className="login-hint">
          <p>Tài khoản thử nghiệm:</p>
          <code>admin / admin123 → Admin</code>
          <code>user / user123 → User</code>
        </div>
      </div>
    </div>
  );
}
