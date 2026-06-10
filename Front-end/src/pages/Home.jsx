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
<<<<<<< HEAD
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
=======
    <div className="min-h-screen bg-[#FDF8F0] font-sans text-[#192b4d] overflow-x-hidden">
      {/* Header / Navbar */}
      <header className="container mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Logo */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden shadow-sm bg-gray-200 shrink-0">
              <img
                src="https://placehold.co/400x400/2C387E/FFFFFF?text=AW\nPro&font=Montserrat"
                alt="AutoWash Pro Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl md:text-[1.7rem] font-extrabold text-[#192b4d] leading-none mb-1">
                Tự động rửa
              </h1>
              <p className="text-sm md:text-lg font-bold text-[#192b4d] opacity-90 leading-none">
                hệ thống thông minh
              </p>
            </div>
          </div>
        </div>

        {/* Navigation - Cuộn ngang trên mobile nếu cần */}
        <nav className="flex items-center gap-4 md:gap-10 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 whitespace-nowrap hide-scrollbar">
          <Link
            to="/"
            className="text-lg md:text-xl font-extrabold text-[#192b4d]"
          >
            Trang chủ
          </Link>
          <Link
            to="/services"
            className="text-lg md:text-xl font-medium text-gray-600 hover:text-[#192b4d] transition-colors"
          >
            Dịch vụ
          </Link>
          <Link
            to="/booking"
            className="text-lg md:text-xl font-medium text-gray-600 hover:text-[#192b4d] transition-colors"
          >
            Đặt lịch
          </Link>
          <Link
            to="/profile"
            className="text-lg md:text-xl font-medium text-gray-600 hover:text-[#192b4d] transition-colors"
          >
            Thành viên
          </Link>
>>>>>>> Thắng---feature/login-logout
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3 md:gap-5 w-full md:w-auto justify-center md:justify-end">
          {user ? (
            <>
<<<<<<< HEAD
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
=======
              <span className="text-sm md:text-base font-semibold text-[#192b4d] hidden sm:block">
                Xin chào, {user.fullName}!
              </span>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 md:px-6 md:py-3 text-sm md:text-base font-bold text-white bg-red-600 hover:bg-red-700 rounded-full transition-colors"
>>>>>>> Thắng---feature/login-logout
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
<<<<<<< HEAD
              <Link to="/login" className="px-8 py-3.5 text-lg font-bold text-gray-800 bg-white rounded-full shadow-sm hover:shadow-md transition-all">
                Login
              </Link>
              <Link to="/register" className="px-8 py-3.5 text-lg font-bold text-white bg-[#F58607] rounded-full shadow-md hover:bg-orange-600 transition-all">
                Sign Up
=======
              <Link
                to="/login"
                className="px-5 py-2.5 md:px-8 md:py-3.5 text-sm md:text-lg font-bold text-gray-800 bg-white rounded-full shadow-sm hover:shadow-md transition-all"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 md:px-8 md:py-3.5 text-sm md:text-lg font-bold text-white bg-[#F58607] rounded-full shadow-md hover:bg-orange-600 transition-all"
              >
                Đăng ký
>>>>>>> Thắng---feature/login-logout
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
<<<<<<< HEAD
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
=======
      <main className="container mx-auto px-4 md:px-6 pt-10 md:pt-16 pb-24 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
        <div className="flex-1 space-y-6 md:space-y-8 text-center lg:text-left">
          <h2 className="text-4xl md:text-5xl lg:text-[4rem] font-extrabold text-[#293563] leading-[1.2] tracking-tight">
            Đặt lịch rửa xe
            <br />
            Trải nghiệm nhanh chóng, tiện lợi
          </h2>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
            AutoWash Pro giúp bạn đặt lịch dễ dàng, theo dõi quá trình rửa xe và
            tích điểm thành viên để nhận ưu đãi.
>>>>>>> Thắng---feature/login-logout
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 md:gap-6 pt-4">
            <Link
              to="/booking"
              className="w-full sm:w-auto px-8 md:px-10 py-4 bg-[#F58607] text-white text-lg md:text-xl font-bold rounded-full shadow-lg hover:bg-orange-600 hover:-translate-y-1 transition transform duration-300 text-center"
            >
              Đặt lịch ngay
            </Link>
<<<<<<< HEAD
            <button className="flex items-center gap-4 group">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                <svg className="w-6 h-6 text-[#38BDF8] ml-1.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-xl font-medium text-[#192b4d] group-hover:text-[#F58607] transition-colors">
                Watch how it works
=======
            <button className="flex items-center gap-3 md:gap-4 group">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 shrink-0">
                <svg
                  className="w-5 h-5 md:w-6 md:h-6 text-[#38BDF8] ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-lg md:text-xl font-medium text-[#192b4d] group-hover:text-[#F58607] transition-colors">
                Xem cách hoạt động
>>>>>>> Thắng---feature/login-logout
              </span>
            </button>
          </div>
        </div>
<<<<<<< HEAD
        <div className="flex-1 w-full relative">
          <div className="rounded-[2rem] overflow-hidden shadow-2xl h-[550px] relative">
=======

        <div className="flex-1 w-full mt-10 lg:mt-0">
          <div className="rounded-[2rem] overflow-hidden shadow-2xl h-[350px] sm:h-[450px] lg:h-[550px] w-full">
>>>>>>> Thắng---feature/login-logout
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
