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
    name
      .split(" ")
      .slice(-2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F4F5F8] font-sans text-[#192b4d]">
      <header className="sticky top-0 z-50 bg-[#F4F5F8]/85 backdrop-blur-md border-b border-black/5">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden shadow-sm bg-gray-200 ring-2 ring-white">
              <img
                src="/logo.png"
                alt="Moto Shine Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-extrabold text-[#192b4d] leading-none mb-1">
                Moto Shine
              </h1>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0A8C97] leading-none">
                Smart Car Wash
              </p>
            </div>
          </div>

          {/* Nav Links — hiện theo role */}
          <nav className="hidden md:flex items-center gap-9">
            <Link
              to="/"
              className="relative text-base font-bold text-[#192b4d] after:content-[''] after:absolute after:-bottom-[18px] after:left-0 after:right-0 after:h-[2px] after:bg-[#F58607]"
            >
              Trang chủ
            </Link>
            <Link
              to="/login"
              className="text-base font-medium text-gray-600 hover:text-[#192b4d] transition-colors"
            >
              Dịch vụ
            </Link>

            {/* Đặt lịch: chỉ user thường thấy */}
            {(!user || isUser()) && (
              <Link
                to="/booking"
                className="text-base font-medium text-gray-600 hover:text-[#192b4d] transition-colors"
              >
                Đặt lịch
              </Link>
            )}

            {/* Thành viên: tất cả thấy khi đã login */}
            {user && (
              <Link
                to={isAdmin() || isStaff() ? "/admin/dashboard" : "/dashboard"}
                className="text-base font-medium text-gray-600 hover:text-[#192b4d] transition-colors"
              >
                Thành viên
              </Link>
            )}

            {/* Quản lý xe (Trang của Thái): tất cả thấy khi đã login */}
            {user && (
              <Link
                to="/vehicles"
                className="text-base font-medium text-gray-600 hover:text-[#192b4d] transition-colors"
              >
                Quản lý xe
              </Link>
            )}

            {/* Admin Dashboard: chỉ admin và staff thấy */}
            {(isAdmin() || isStaff()) && (
              <Link
                to="/admin/dashboard"
                className="text-base font-bold text-[#F58607] hover:text-orange-600 transition-colors"
              >
                Quản trị
              </Link>
            )}
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Avatar + tên */}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 pl-2 pr-4 py-2 text-sm font-bold text-[#192b4d] bg-white rounded-full shadow-sm hover:shadow-md transition-all"
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "#E1F5EE",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#0F6E56",
                      border: "1.5px solid #5DCAA5",
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(user.fullName)}
                  </div>
                  {user.fullName}

                  {/* Badge role */}
                  {isAdmin() && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 7px",
                        borderRadius: 20,
                        background: "#EEEDFE",
                        color: "#534AB7",
                        fontWeight: 600,
                      }}
                    >
                      Admin
                    </span>
                  )}
                  {isStaff() && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 7px",
                        borderRadius: 20,
                        background: "#FAEEDA",
                        color: "#854F0B",
                        fontWeight: 600,
                      }}
                    >
                      Staff
                    </span>
                  )}
                </Link>

                <button
                  onClick={handleLogout}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-[#e24b4a] rounded-full shadow-sm hover:bg-red-600 transition-all"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-6 py-2.5 text-sm font-bold text-gray-800 bg-white rounded-full shadow-sm hover:shadow-md transition-all"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-[#F58607] rounded-full shadow-md shadow-orange-200 hover:bg-orange-600 transition-all"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-20 pb-28 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="min-w-0 space-y-8">
          <div className="inline-flex items-center gap-2 pl-3 pr-4 py-1.5 rounded-full bg-white border border-black/5 shadow-sm text-xs font-bold uppercase tracking-wider text-[#0A8C97]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F58607]" />
            Đặt lịch trong 30 giây
          </div>

          <h2 className="text-5xl sm:text-6xl lg:text-[4.2rem] font-extrabold text-[#192b4d] leading-[1.05] tracking-tighter">
            Rửa xe không phải<br />
            chờ đợi <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#0FB6C4] to-[#0A8C97]">mù mờ.</span>
          </h2>

          <p className="text-[17px] text-gray-500 leading-relaxed max-w-md">
            Moto Shine giúp bạn đặt lịch dễ dàng, theo dõi quá trình rửa xe theo
            thời gian thực và tích điểm thành viên để nhận nhiều ưu đãi hấp dẫn.
          </p>

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <Link
              to="/booking"
              className="group inline-flex items-center gap-2 px-9 py-4 bg-[#F58607] text-white text-lg font-bold rounded-full shadow-lg shadow-orange-200 hover:bg-orange-600 hover:-translate-y-0.5 transition-all"
            >
              Đặt lịch ngay
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <a href="#how-it-works" className="flex items-center gap-3 group">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all shrink-0">
                <svg className="w-5 h-5 text-[#0A8C97] ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-base font-bold text-[#192b4d] group-hover:text-[#F58607] transition-colors">
                Xem cách hoạt động
              </span>
            </a>
          </div>

          <div className="flex items-stretch pt-6 mt-2 border-t border-black/5">
            <div className="pr-8">
              <div className="text-xl font-extrabold text-[#192b4d]">3 bước</div>
              <div className="text-xs text-gray-500 mt-0.5">từ đặt lịch đến rửa xong</div>
            </div>
            <div className="px-8 border-l border-black/5">
              <div className="text-xl font-extrabold text-[#192b4d]">4 hạng</div>
              <div className="text-xs text-gray-500 mt-0.5">thành viên tích điểm</div>
            </div>
            <div className="pl-8 border-l border-black/5">
              <div className="text-xl font-extrabold text-[#192b4d]">Thời gian thực</div>
              <div className="text-xs text-gray-500 mt-0.5">theo dõi tiến trình</div>
            </div>
          </div>
        </div>

        {/* Panel trực quan — thay cho ảnh stock */}
        <div className="relative w-full min-w-0 aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl bg-gradient-to-br from-[#192b4d] via-[#22315c] to-[#0A8C97]">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -inset-y-10 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[sweep_5s_ease-in-out_infinite]" />
          </div>

          <svg viewBox="0 0 400 500" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="carGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4CEBF5" />
                <stop offset="100%" stopColor="#0A8C97" />
              </linearGradient>
              <radialGradient id="spotlight" cx="50%" cy="45%" r="60%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(0,0,0,0.35)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
            </defs>

            <rect x="0" y="0" width="400" height="500" fill="url(#spotlight)" />

            {/* bong bóng / giọt nước, kích thước khác nhau tạo chiều sâu */}
            <circle cx="66" cy="86" r="5" fill="rgba(255,255,255,.32)" />
            <circle cx="66" cy="86" r="9" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1" />
            <circle cx="334" cy="132" r="3.5" fill="rgba(255,255,255,.28)" />
            <circle cx="302" cy="64" r="2.5" fill="rgba(255,255,255,.35)" />
            <circle cx="58" cy="190" r="2" fill="rgba(255,255,255,.22)" />
            <circle cx="352" cy="220" r="6" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1" />
            <circle cx="120" cy="60" r="2" fill="rgba(255,255,255,.25)" />

            {/* bóng đổ dưới xe */}
            <ellipse cx="200" cy="378" rx="145" ry="16" fill="url(#shadow)" />

            <g transform="translate(40,260)">
              <path
                d="M10 90 Q0 60 30 55 L60 20 Q75 5 110 5 L230 5 Q265 5 280 25 L305 55 Q335 58 328 90 Q328 105 310 105 L295 105 Q290 118 275 118 Q260 118 255 105 L95 105 Q90 118 75 118 Q60 118 55 105 L28 105 Q10 105 10 90 Z"
                fill="url(#carGrad)"
              />
              {/* viền sáng trên nóc xe */}
              <path
                d="M63 53 L86 22 Q98 8 115 8 L225 8"
                fill="none"
                stroke="rgba(255,255,255,.55)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* kính lái — kính chắn gió */}
              <path
                d="M65 55 L85 25 Q95 15 115 15 L172 15 L172 55 Z"
                fill="rgba(20,24,43,.4)"
              />
              <path
                d="M178 15 L225 15 Q245 15 258 28 L275 55 L178 55 Z"
                fill="rgba(20,24,43,.4)"
              />
              {/* phản chiếu trên kính */}
              <path d="M92 48 L108 22 L118 22 L102 48 Z" fill="rgba(255,255,255,.25)" />
              <path d="M195 20 L235 20 L250 40 L195 40 Z" fill="rgba(255,255,255,.12)" />
              {/* trụ cửa giữa */}
              <rect x="172" y="12" width="4" height="45" fill="rgba(20,24,43,.5)" />

              {/* bánh xe */}
              <circle cx="75" cy="108" r="18" fill="#0B1130" />
              <circle cx="75" cy="108" r="18" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1.5" />
              <circle cx="75" cy="108" r="7" fill="#4CEBF5" />
              <circle cx="275" cy="108" r="18" fill="#0B1130" />
              <circle cx="275" cy="108" r="18" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1.5" />
              <circle cx="275" cy="108" r="7" fill="#4CEBF5" />

              {/* gương chiếu hậu */}
              <path d="M58 48 Q48 46 47 56 Q47 62 55 61" fill="#0A8C97" />
            </g>
          </svg>

          <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-white">
            <span className="font-mono text-xs bg-white/15 px-2.5 py-1.5 rounded-md">MS-0417-VN</span>
            <span className="flex items-center gap-2 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3EE6A0] shadow-[0_0_0_4px_rgba(62,230,160,0.25)]" />
              Đang rửa xe
            </span>
          </div>
        </div>
      </main>

      {/* Cách hoạt động */}
      <section id="how-it-works" className="container mx-auto px-6 pb-28 scroll-mt-24">
        <div className="max-w-lg mb-12">
          <div className="text-xs font-bold uppercase tracking-wider text-[#0A8C97] mb-2">
            Cách hoạt động
          </div>
          <h3 className="text-3xl font-extrabold text-[#192b4d]">
            Ba bước, không cần gọi điện xác nhận lại
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              n: "01",
              t: "Chọn dịch vụ",
              d: "Chọn gói rửa phù hợp với loại xe và nhu cầu.",
              bar: "bg-[#F58607]",
            },
            {
              n: "02",
              t: "Chọn khung giờ",
              d: "Chọn địa điểm và khung giờ trống gần bạn nhất.",
              bar: "bg-[#0A8C97]",
            },
            {
              n: "03",
              t: "Theo dõi & nhận xe",
              d: "Theo dõi tiến trình theo thời gian thực, tự động tích điểm.",
              bar: "bg-[#192b4d]",
            },
          ].map((s) => (
            <div key={s.n} className="relative bg-white border border-black/5 rounded-2xl p-7 shadow-sm">
              <span className={`absolute top-0 left-7 right-7 h-[3px] rounded-b ${s.bar}`} />
              <div className="font-mono text-xs text-gray-400 mb-4">{s.n}</div>
              <h4 className="text-lg font-bold text-[#192b4d] mb-2">{s.t}</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes sweep {
          0%, 100% { transform: translateX(-120%) skewX(-12deg); }
          50% { transform: translateX(320%) skewX(-12deg); }
        }
      `}</style>
    </div>
  );
};

export default Home;