import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Home = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isStaff, isUser, logout } = useAuth();

  // Tự động chuyển hướng đến Dashboard nếu đã đăng nhập
  useEffect(() => {
    if (user) {
      if (isAdmin() || isStaff()) {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, navigate, isAdmin, isStaff]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getInitials = (name = "") =>
    name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-[#FDF8F0] font-sans text-[#192b4d]">
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden shadow-sm bg-gray-200">
            <img
              src="/logo.png"
              alt="Moto Shine Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[1.7rem] font-extrabold text-[#192b4d] leading-none mb-1">
              Moto Shine
            </h1>
            <p className="text-lg font-bold text-[#192b4d] opacity-90 leading-none">
              Smart Car Wash System
            </p>
          </div>
        </div>

        {/* Nav Links — hiện theo role */}
        <nav className="flex items-center gap-10">
          <Link to="/" className="text-xl font-extrabold text-[#192b4d]">
            Trang chủ
          </Link>
          <Link to="/services" className="text-xl font-medium text-gray-600 hover:text-[#192b4d] transition-colors">
            Dịch vụ
          </Link>

          {/* Đặt lịch: chỉ user thường thấy */}
          {(!user || isUser()) && (
            <Link to="/booking" className="text-xl font-medium text-gray-600 hover:text-[#192b4d] transition-colors">
              Đặt lịch
            </Link>
          )}

          {/* Thành viên: tất cả thấy khi đã login */}
          {user && (
            <Link to={isAdmin() || isStaff() ? "/admin/dashboard" : "/dashboard"} className="text-xl font-medium text-gray-600 hover:text-[#192b4d] transition-colors">
              Thành viên
            </Link>
          )}

          {/* Quản lý xe (Trang của Thái): tất cả thấy khi đã login */}
          {user && (
            <Link to="/vehicles" className="text-xl font-medium text-gray-600 hover:text-[#192b4d] transition-colors">
              Quản lý xe
            </Link>
          )}

          {/* Admin Dashboard: chỉ admin và staff thấy */}
          {(isAdmin() || isStaff()) && (
            <Link to="/admin/dashboard" className="text-xl font-medium text-[#F58607] hover:text-orange-600 transition-colors font-bold">
              Quản trị
            </Link>
          )}
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-5">
          {user ? (
            <>
              {/* Avatar + tên */}
              <Link
                to="/profile"
                className="flex items-center gap-2 px-5 py-3 text-base font-bold text-[#192b4d] bg-white rounded-full shadow-sm hover:shadow-md transition-all"
              >
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "#E1F5EE", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 13, fontWeight: 700,
                  color: "#0F6E56", border: "1.5px solid #5DCAA5", flexShrink: 0
                }}>
                  {getInitials(user.fullName)}
                </div>
                {user.fullName}

                {/* Badge role */}
                {isAdmin() && (
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#EEEDFE", color: "#534AB7", fontWeight: 600 }}>
                    Admin
                  </span>
                )}
                {isStaff() && (
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#FAEEDA", color: "#854F0B", fontWeight: 600 }}>
                    Staff
                  </span>
                )}
              </Link>

              <button
                onClick={handleLogout}
                className="px-8 py-3.5 text-lg font-bold text-white bg-[#e24b4a] rounded-full shadow-md hover:bg-red-600 transition-all"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-8 py-3.5 text-lg font-bold text-gray-800 bg-white rounded-full shadow-sm hover:shadow-md transition-all">
                Login
              </Link>
              <Link to="/register" className="px-8 py-3.5 text-lg font-bold text-white bg-[#F58607] rounded-full shadow-md hover:bg-orange-600 transition-all">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-16 pb-24 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 space-y-8">
          <h2 className="text-[3.5rem] lg:text-[4rem] font-extrabold text-[#293563] leading-[1.2] tracking-tight">
            Đặt lịch rửa xe thông minh <br />
            Trải nghiệm nhanh chóng, <br />
            tiện lợi
          </h2>
          <p className="text-xl text-gray-600 leading-relaxed max-w-2xl pr-4">
            Moto Shine giúp bạn đặt lịch dễ dàng, theo dõi quá trình rửa xe và
            tích điểm thành viên để nhận nhiều ưu đãi hấp dẫn.
          </p>
          <div className="flex items-center gap-6 pt-2">
            <Link
              to="/booking"
              className="px-10 py-4 bg-[#F58607] text-white text-xl font-bold rounded-full shadow-lg hover:bg-orange-600 hover:-translate-y-1 transition transform duration-300"
            >
              Đặt lịch ngay
            </Link>
            <button className="flex items-center gap-4 group">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                <svg className="w-6 h-6 text-[#38BDF8] ml-1.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-xl font-medium text-[#192b4d] group-hover:text-[#F58607] transition-colors">
                Watch how it works
              </span>
            </button>
          </div>
        </div>
        <div className="flex-1 w-full relative">
          <div className="rounded-[2rem] overflow-hidden shadow-2xl h-[550px] relative">
            <img
              src="https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1200&q=80"
              alt="Moto Shine"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
