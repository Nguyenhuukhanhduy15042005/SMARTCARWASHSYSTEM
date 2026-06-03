import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="min-h-screen bg-[#FDF8F0] font-sans text-[#192b4d]">
      {/* Header / Navbar */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden shadow-sm bg-gray-200">
            {/* Thay thế src bằng ảnh logo thực tế */}
            <img
              src="https://placehold.co/400x400/2C387E/FFFFFF?text=AW\nPro&font=Montserrat"
              alt="Moto Shine Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[1.7rem] font-extrabold text-[#192b4d] leading-none mb-1">
              AutoWash Pro
            </h1>
            <p className="text-lg font-bold text-[#192b4d] opacity-90 leading-none">
              Smart Car Wash System
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-10">
          <Link to="/" className="text-xl font-extrabold text-[#192b4d]">
            Trang chủ
          </Link>
          <Link
            to="/services"
            className="text-xl font-medium text-gray-600 hover:text-[#192b4d] transition-colors"
          >
            Dịch vụ
          </Link>
          <Link
            to="/booking"
            className="text-xl font-medium text-gray-600 hover:text-[#192b4d] transition-colors"
          >
            Đặt lịch
          </Link>
          <Link
            to="/profile"
            className="text-xl font-medium text-gray-600 hover:text-[#192b4d] transition-colors"
          >
            Thành viên
          </Link>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-5">
          <Link
            to="/login"
            className="px-8 py-3.5 text-lg font-bold text-gray-800 bg-white rounded-full shadow-sm hover:shadow-md transition-all"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-8 py-3.5 text-lg font-bold text-white bg-[#F58607] rounded-full shadow-md hover:bg-orange-600 transition-all"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-16 pb-24 flex flex-col lg:flex-row items-center gap-16">
        {/* Left Content */}
        <div className="flex-1 space-y-8">
          <h2 className="text-[3.5rem] lg:text-[4rem] font-extrabold text-[#293563] leading-[1.2] tracking-tight">
            Đặt lịch rửa xe thông minh <br />
            Trải nghiệm nhanh chóng, <br />
            tiện lợi
          </h2>

          <p className="text-xl text-gray-600 leading-relaxed max-w-2xl pr-4">
            AutoWash Pro giúp bạn đặt lịch dễ dàng, theo dõi quá trình rửa xe và
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
                {/* Play Icon */}
                <svg
                  className="w-6 h-6 text-[#38BDF8] ml-1.5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-xl font-medium text-[#192b4d] group-hover:text-[#F58607] transition-colors">
                Watch how it works
              </span>
            </button>
          </div>
        </div>

        {/* Right Image */}
        <div className="flex-1 w-full relative">
          <div className="rounded-[2rem] overflow-hidden shadow-2xl h-[550px] relative">
            {/* Thay thế src bằng ảnh trạm rửa xe/nhân viên thực tế */}
            <img
              src="https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1200&q=80"
              alt="AutoWash Pro Attendant"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
