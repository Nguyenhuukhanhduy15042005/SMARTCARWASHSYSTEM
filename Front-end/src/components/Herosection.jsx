import React from "react";
import { Link } from "react-router-dom";

const HeroSection = () => {
  const heroImageUrl = "/assets/hero_carwash_recreated.png"; // Thay thế bằng đường dẫn thực tế đến ảnh trạm rửa xe

  return (
    <section className="bg-cream-50 pt-32 pb-24 min-h-screen">
      <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* Nội dung bên trái */}
        <div className="space-y-10">
          <h2 className="text-6xl font-extrabold text-blue-900 leading-tight tracking-tight">
            Đặt lịch rửa xe thông minh <br />
            Trải nghiệm nhanh chóng, <br />
            tiện lợi
          </h2>
          <p className="text-xl text-gray-700 leading-relaxed max-w-2xl">
            Moto Shine giúp bạn đặt lịch dễ dàng, theo dõi quá trình rửa xe và
            tích điểm thành viên để nhận nhiều ưu đãi hấp dẫn.
          </p>

          <div className="flex items-center gap-6 pt-6">
            <Link
              to="/booking"
              className="px-10 py-5 text-xl font-bold text-white bg-orange-600 rounded-full shadow-2xl hover:shadow-3xl hover:bg-orange-700 transform hover:-translate-y-1 transition-all"
            >
              Đặt lịch ngay
            </Link>

            <button className="flex items-center gap-3 text-lg font-bold text-blue-800 hover:text-blue-900 group">
              <div className="w-16 h-16 rounded-full bg-cream-100 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                {/* Biểu tượng Play */}
                <svg
                  className="w-6 h-6 text-blue-600 ml-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.576 0 0.436 0.445 0.408 1.197 0 1.615l-4.695 4.502c-0.218 0.209-0.504 0.314-0.789 0.314s-0.571-0.105-0.789-0.314l-4.695-4.502c-0.408-0.418-0.436-1.17 0-1.615z" />
                </svg>
              </div>
              Watch how it works
            </button>
          </div>
        </div>

        {/* Hình ảnh bên phải */}
        <div className="relative">
          <img
            src={heroImageUrl}
            alt="Automated car wash station cleaning a motorcycle"
            className="w-full rounded-3xl shadow-2xl"
          />
          <div className="absolute top-4 right-4 bg-white/70 px-4 py-2 rounded-full text-xs font-bold text-blue-900 backdrop-blur-sm shadow">
            Moto Shine
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
