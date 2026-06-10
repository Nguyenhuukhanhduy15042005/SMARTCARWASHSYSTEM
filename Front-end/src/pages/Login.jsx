import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";

export default function Login({ setUser }) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const { setUser: setAuthUser, setToken } = useAuth();

  useEffect(() => {
    if (location.state?.error === "unauthorized") {
      setErrorMsg("Vui lòng đăng nhập để truy cập trang này!");
    }
  }, [location]);

  // Nếu đã đăng nhập rồi thì không cho vào trang login nữa
  useEffect(() => {
    const savedUser = localStorage.getItem("LOGIN_USER");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.role === "admin" || user.role === "staff") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, []);

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
        localStorage.setItem("token", data.token); // Thêm lowercase key để tương thích
        localStorage.setItem("LOGIN_USER", JSON.stringify(data.user));
        setUser(data.user);
        setAuthUser(data.user); // Đồng bộ cho AuthContext
        setToken(data.token); // Đồng bộ cho AuthContext
        const role = data.user.role;
        if (role === "admin") {
          navigate("/admin/dashboard");
        } else if (role === "staff") {
          navigate("/staff/dashboard");
        } else {
          navigate("/dashboard");
        }
      } else {
        setErrorMsg(data.message || "Sai tài khoản hoặc mật khẩu!");
      }
    } catch (err) {
      setErrorMsg("Không thể kết nối đến Server Backend!");
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const userInfoRes = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          },
        );
        if (!userInfoRes.ok)
          return setErrorMsg("Không lấy được thông tin từ Google!");
        const userInfo = await userInfoRes.json();
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
          localStorage.setItem("token", data.token); // Thêm lowercase key
          localStorage.setItem("LOGIN_USER", JSON.stringify(data.user));
          setUser(data.user);
          setAuthUser(data.user); // Đồng bộ cho AuthContext
          setToken(data.token); // Đồng bộ cho AuthContext
          const role = data.user.role;
          if (role === "admin") {
            navigate("/admin/dashboard");
          } else if (role === "staff") {
            navigate("/staff/dashboard");
          } else {
            navigate("/dashboard");
          }
        } else {
          setErrorMsg(data.message || "Lỗi đăng nhập qua Google!");
        }
      } catch (err) {
        setErrorMsg("Lỗi kết nối: " + err.message);
      }
    },
    onError: () => setErrorMsg("Đăng nhập Google thất bại!"),
    flow: "implicit",
  });

  return (
    <div className="min-h-screen bg-[#FDF8F0] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-[2rem] shadow-xl relative transition-all duration-300">
        {/* Nút Quay Lại */}
        <div className="mb-6 flex justify-start">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#F58607] font-semibold text-sm transition-all duration-300"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Quay lại
          </Link>
        </div>

        <h2 className="text-3xl font-extrabold text-[#2C387E] mb-6 text-center">
          Đăng Nhập
        </h2>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Tài khoản
            </label>
            <input
              type="text"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="Email hoặc Số điện thoại"
              required
              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-[#F58607] transition-all outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              required
              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-[#F58607] transition-all outline-none"
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

        <div className="flex items-center my-8">
          <div className="flex-1 border-b border-gray-200"></div>
          <span className="px-4 text-sm text-gray-400 font-medium">
            Hoặc đăng nhập bằng
          </span>
          <div className="flex-1 border-b border-gray-200"></div>
        </div>

        <button
          onClick={() => loginWithGoogle()}
          className="w-full flex items-center justify-center gap-3 py-3.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
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
          </svg>
          <span className="text-gray-700 font-bold">Google</span>
        </button>

        <p className="text-center mt-8 text-sm text-gray-600">
          Chưa có tài khoản?{" "}
          <Link
            to="/register"
            className="text-[#F58607] font-bold hover:underline"
          >
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
