import React from "react";
import { Link } from "react-router-dom"; // Sử dụng Link để điều hướng

const Header = () => {
  const logoUrl = "/assets/logo_recreated.png"; // Thay thế bằng đường dẫn thực tế đến logo của bạn

  return (
    <header className="fixed top-0 left-0 w-full bg-white z-50 shadow-sm border-b border-gray-100">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo và Tên Hệ Thống */}
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="Moto Shine Logo"
            className="w-12 h-12 rounded-full shadow-md"
          />
          <div>
            <h1 className="text-2xl font-extrabold text-blue-900 tracking-tight">
              AutoWash Pro
            </h1>
            <p className="text-xs font-semibold text-blue-900 opacity-90">
              Smart Car Wash System
            </p>
          </div>
        </div>

        {/* Menu Điều Hướng */}
        <nav className="flex items-center gap-8">
          <Link to="/home" className="text-lg font-bold text-blue-900">
            Trang chủ
          </Link>
          <Link
            to="/services"
            className="text-lg font-medium text-gray-700 hover:text-blue-900 transition-colors"
          >
            Dịch vụ
          </Link>
          <Link
            to="/booking"
            className="text-lg font-medium text-gray-700 hover:text-blue-900 transition-colors"
          >
            Đặt lịch
          </Link>
          <Link
            to="/profile"
            className="text-lg font-medium text-gray-700 hover:text-blue-900 transition-colors"
          >
            Thành viên
          </Link>
        </nav>

        {/* Nút Đăng Nhập và Đăng Ký */}
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="px-6 py-2.5 text-lg font-bold text-gray-800 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-all"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-8 py-3 text-lg font-bold text-white bg-orange-600 rounded-full shadow-lg hover:shadow-xl hover:bg-orange-700 transform hover:-translate-y-0.5 transition-all"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
