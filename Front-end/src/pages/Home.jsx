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
    <div className="min-h-screen bg-[#FDF8F0] font-sans text-[#192b4d]">
      {/* Header / Navbar */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden shadow-sm bg-gray-200">
            <img
              src="https://placehold.co/400x400/2C387E/FFFFFF?text=AW\nPro&font=Montserrat"
              alt="AutoWash Pro Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[1.7rem] font-extrabold text-[#192b4d] leading-none mb-1">
              Tự động rửa
            </h1>
            <p className="text-lg font-bold text-[#192b4d] opacity-90 leading-none">
              hệ thống rửa xe thông minh
            </p>
          </div>
        </div>

        {/* Navigation */}
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
          {user ? (
            // ĐÃ ĐĂNG NHẬP: hiện tên + nút Logout
            <>
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#192b4d",
                }}
              >
                Xin chào, {user.fullName}!
              </span>
              <button
                onClick={handleLogout}
                style={{
                  padding: "10px 24px",
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#fff",
                  backgroundColor: "#e53e3e",
                  border: "none",
                  borderRadius: "9999px",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#c53030")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "#e53e3e")
                }
              >
                Đăng xuất
              </button>
            </>
          ) : (
            // CHƯA ĐĂNG NHẬP: hiện Login + Sign Up
            <>
              <Link
                to="/login"
                className="px-8 py-3.5 text-lg font-bold text-gray-800 bg-white rounded-full shadow-sm hover:shadow-md transition-all"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-8 py-3.5 text-lg font-bold text-white bg-[#F58607] rounded-full shadow-md hover:bg-orange-600 transition-all"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-16 pb-24 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 space-y-8">
          <h2 className="text-[3.5rem] lg:text-[4rem] font-extrabold text-[#293563] leading-[1.2] tracking-tight">
            Đặt lịch rửa xe
            <br />
            Trải nghiệm nhanh chóng,tiện lợi
            <br />
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
                <svg
                  className="w-6 h-6 text-[#38BDF8] ml-1.5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-xl font-medium text-[#192b4d] group-hover:text-[#F58607] transition-colors">
                Xem cách hoạt động
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 w-full relative">
          <div className="rounded-[2rem] overflow-hidden shadow-2xl h-[550px] relative">
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
