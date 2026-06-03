import React from "react";
import { Link, useNavigate } from "react-router-dom";

const Home = ({ user, setUser }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("TOKEN");
    localStorage.removeItem("LOGIN_USER");
    setUser(null);
    navigate("/");
  };

  return (
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
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3 md:gap-5 w-full md:w-auto justify-center md:justify-end">
          {user ? (
            <>
              <span className="text-sm md:text-base font-semibold text-[#192b4d] hidden sm:block">
                Xin chào, {user.fullName}!
              </span>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 md:px-6 md:py-3 text-sm md:text-base font-bold text-white bg-red-600 hover:bg-red-700 rounded-full transition-colors"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
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
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
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
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 md:gap-6 pt-4">
            <Link
              to="/booking"
              className="w-full sm:w-auto px-8 md:px-10 py-4 bg-[#F58607] text-white text-lg md:text-xl font-bold rounded-full shadow-lg hover:bg-orange-600 hover:-translate-y-1 transition transform duration-300 text-center"
            >
              Đặt lịch ngay
            </Link>
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
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 w-full mt-10 lg:mt-0">
          <div className="rounded-[2rem] overflow-hidden shadow-2xl h-[350px] sm:h-[450px] lg:h-[550px] w-full">
            <img
              src="https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1200&q=80"
              alt="AutoWash Pro"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
