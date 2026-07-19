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
            <a
              href="#services"
              className="text-base font-medium text-gray-600 hover:text-[#192b4d] transition-colors"
            >
              Dịch vụ
            </a>

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

        {/* Panel trực quan — minh hoạ tự vẽ: xe đi qua dàn rửa tự động */}
        <div className="relative w-full min-w-0 aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl bg-gradient-to-br from-[#192b4d] via-[#1c2c50] to-[#0A8C97]">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -inset-y-10 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[sweep_5s_ease-in-out_infinite]" />
          </div>

          <svg viewBox="0 0 400 500" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="carGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4CEBF5" />
                <stop offset="100%" stopColor="#0A8C97" />
              </linearGradient>
              <linearGradient id="brushGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1D9E75" />
                <stop offset="100%" stopColor="#0F6E56" />
              </linearGradient>
              <radialGradient id="spotlight" cx="50%" cy="40%" r="65%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              <radialGradient id="foamGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>

            <rect x="0" y="0" width="400" height="500" fill="url(#spotlight)" />

            {/* thanh ray + vạch chỉ hướng di chuyển của xe qua dàn rửa */}
            <line x1="20" y1="400" x2="380" y2="400" stroke="rgba(255,255,255,.14)" strokeWidth="2" />
            <path d="M300 400 l14 0 l-6 -6 M314 400 l-6 6" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* vòi phun nước phía trên */}
            <rect x="60" y="48" width="280" height="10" rx="5" fill="rgba(255,255,255,.12)" />
            {[95, 140, 200, 260, 305].map((x, i) => (
              <g key={x}>
                <circle cx={x} cy="58" r="3" fill="#4CEBF5" />
                <line
                  x1={x}
                  y1="61"
                  x2={x - 6}
                  y2="150"
                  stroke="#4CEBF5"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.55"
                >
                  <animate attributeName="opacity" values="0.15;0.6;0.15" dur="1.6s" repeatCount="indefinite" begin={`${i * 0.15}s`} />
                </line>
              </g>
            ))}

            {/* cụm chổi quay bên trái */}
            <g transform="translate(38,150)">
              <rect x="0" y="0" width="26" height="230" rx="13" fill="url(#brushGrad)" />
              {Array.from({ length: 9 }).map((_, i) => (
                <line key={i} x1="-6" y1={14 + i * 25} x2="32" y2={2 + i * 25} stroke="rgba(255,255,255,.35)" strokeWidth="3" strokeLinecap="round" />
              ))}
              <path d="M-14 40 a20 20 0 0 1 0 -30" stroke="rgba(255,255,255,.3)" strokeWidth="2" fill="none" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" from="0 13 25" to="360 13 25" dur="1.8s" repeatCount="indefinite" />
              </path>
            </g>

            {/* cụm chổi quay bên phải */}
            <g transform="translate(336,150)">
              <rect x="0" y="0" width="26" height="230" rx="13" fill="url(#brushGrad)" />
              {Array.from({ length: 9 }).map((_, i) => (
                <line key={i} x1="32" y1={14 + i * 25} x2="-6" y2={2 + i * 25} stroke="rgba(255,255,255,.35)" strokeWidth="3" strokeLinecap="round" />
              ))}
              <path d="M40 40 a20 20 0 0 0 0 -30" stroke="rgba(255,255,255,.3)" strokeWidth="2" fill="none" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" from="0 13 25" to="-360 13 25" dur="1.8s" repeatCount="indefinite" />
              </path>
            </g>

            {/* bọt / bong bóng quanh gầm xe */}
            <ellipse cx="200" cy="392" rx="130" ry="20" fill="url(#foamGlow)" />
            <circle cx="120" cy="388" r="6" fill="rgba(255,255,255,.55)" />
            <circle cx="150" cy="398" r="4" fill="rgba(255,255,255,.4)" />
            <circle cx="250" cy="396" r="5" fill="rgba(255,255,255,.45)" />
            <circle cx="280" cy="386" r="7" fill="rgba(255,255,255,.5)" />
            <circle cx="200" cy="402" r="3.5" fill="rgba(255,255,255,.35)" />

            {/* xe */}
            <g transform="translate(70,255)">
              <path
                d="M10 90 Q0 60 30 55 L60 20 Q75 5 110 5 L170 5 Q205 5 220 25 L245 55 Q275 58 268 90 Q268 105 250 105 L235 105 Q230 118 215 118 Q200 118 195 105 L75 105 Q70 118 55 118 Q40 118 35 105 L28 105 Q10 105 10 90 Z"
                fill="url(#carGrad)"
              />
              <path
                d="M63 53 L86 22 Q98 8 115 8 L165 8"
                fill="none"
                stroke="rgba(255,255,255,.55)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path d="M65 55 L85 25 Q95 15 115 15 L152 15 L152 55 Z" fill="rgba(20,24,43,.4)" />
              <path d="M158 15 L165 15 Q185 15 198 28 L215 55 L158 55 Z" fill="rgba(20,24,43,.4)" />
              <path d="M92 48 L108 22 L118 22 L102 48 Z" fill="rgba(255,255,255,.25)" />
              <rect x="152" y="12" width="4" height="45" fill="rgba(20,24,43,.5)" />

              <circle cx="75" cy="108" r="17" fill="#0B1130" />
              <circle cx="75" cy="108" r="17" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1.5" />
              <circle cx="75" cy="108" r="6.5" fill="#4CEBF5" />
              <circle cx="215" cy="108" r="17" fill="#0B1130" />
              <circle cx="215" cy="108" r="17" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1.5" />
              <circle cx="215" cy="108" r="6.5" fill="#4CEBF5" />

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

      {/* Dịch vụ */}
      <section id="services" className="bg-white border-y border-black/5 scroll-mt-24">
        <div className="container mx-auto px-6 py-24">
          <div className="max-w-lg mb-14">
            <div className="text-xs font-bold uppercase tracking-wider text-[#0A8C97] mb-2">
              Dịch vụ
            </div>
            <h3 className="text-3xl font-extrabold text-[#192b4d]">
              Chọn đúng gói cho từng loại xe
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                t: "Rửa nhanh",
                d: "Rửa thân xe, vệ sinh la-zăng, sấy khô — xong trong 15 phút.",
                icon: (
                  <path d="M4 12h16M4 12l3-6h10l3 6M4 12v5a1 1 0 001 1h1a1 1 0 001-1v-1h10v1a1 1 0 001 1h1a1 1 0 001-1v-5" />
                ),
              },
              {
                t: "Nội thất",
                d: "Hút bụi, lau taplo, khử mùi toàn bộ khoang lái.",
                icon: <path d="M4 6h16v9a3 3 0 01-3 3H7a3 3 0 01-3-3V6zM8 6V4h8v2" />,
              },
              {
                t: "Phủ ceramic",
                d: "Phủ bảo vệ sơn, chống xước nhẹ và ố nước lên đến 6 tháng.",
                icon: <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" />,
              },
              {
                t: "Rửa tại nhà",
                d: "Đội kỹ thuật mang thiết bị đến tận nơi, không cần chờ ở tiệm.",
                icon: <path d="M3 11l9-7 9 7M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" />,
              },
            ].map((s) => (
              <div
                key={s.t}
                className="group rounded-2xl border border-black/5 p-7 hover:border-[#0A8C97]/30 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-[#E6F6F4] flex items-center justify-center mb-5 group-hover:bg-[#0A8C97] transition-colors">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0A8C97"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6 group-hover:stroke-white transition-colors"
                  >
                    {s.icon}
                  </svg>
                </div>
                <h4 className="text-base font-bold text-[#192b4d] mb-2">{s.t}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hạng thành viên */}
      <section id="membership" className="container mx-auto px-6 py-24 scroll-mt-24">
        <div className="max-w-lg mb-14">
          <div className="text-xs font-bold uppercase tracking-wider text-[#0A8C97] mb-2">
            Hạng thành viên
          </div>
          <h3 className="text-3xl font-extrabold text-[#192b4d]">
            Rửa càng nhiều, đặt cọc càng ít
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              tier: "Bronze",
              color: "#B08D57",
              bg: "#FBF3E9",
              rule: "Đặt cọc 10% khi giữ lịch",
              perk: "Tích điểm cơ bản trên mỗi lượt rửa",
            },
            {
              tier: "Silver",
              color: "#8C97A6",
              bg: "#F1F3F6",
              rule: "Đặt cọc 10% khi giữ lịch",
              perk: "Ưu tiên khung giờ cuối tuần",
            },
            {
              tier: "Gold",
              color: "#C7941C",
              bg: "#FDF6E3",
              rule: "Giữ lịch miễn cọc",
              perk: "Đổi điểm lấy dịch vụ nâng cấp",
              note: "Huỷ trễ nhiều lần sẽ áp lại cọc",
            },
            {
              tier: "Platinum",
              color: "#192b4d",
              bg: "#EFF1F6",
              rule: "Giữ lịch miễn cọc",
              perk: "Riêng 1 kỹ thuật viên phụ trách",
              note: "Huỷ trễ nhiều lần sẽ áp lại cọc",
            },
          ].map((m) => (
            <div
              key={m.tier}
              className="rounded-2xl p-7 border border-black/5"
              style={{ background: m.bg }}
            >
              <div
                className="text-xs font-bold uppercase tracking-wider mb-4"
                style={{ color: m.color }}
              >
                {m.tier}
              </div>
              <p className="text-sm font-semibold text-[#192b4d] mb-3">{m.rule}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{m.perk}</p>
              {m.note && (
                <p className="text-xs text-gray-400 mt-3 leading-relaxed">{m.note}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Đánh giá khách hàng */}
      <section className="bg-[#192b4d]">
        <div className="container mx-auto px-6 py-24">
          <div className="max-w-lg mb-14">
            <div className="text-xs font-bold uppercase tracking-wider text-[#4CEBF5] mb-2">
              Khách nói gì
            </div>
            <h3 className="text-3xl font-extrabold text-white">
              Được tin dùng bởi khách chạy xe hằng ngày
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                q: "Đặt lịch buổi sáng, trưa quay lại xe đã sạch bong — không phải gọi hỏi lại lần nào.",
                n: "Minh Anh",
                r: "Khách hàng hạng Gold",
              },
              {
                q: "Theo dõi tiến trình rửa xe ngay trên điện thoại, biết chính xác khi nào nên quay lại lấy xe.",
                n: "Quốc Bảo",
                r: "Khách hàng hạng Silver",
              },
              {
                q: "Gói rửa tại nhà tiện cho lịch làm việc dày, không cần tranh thủ giờ nghỉ trưa nữa.",
                n: "Thu Hà",
                r: "Khách hàng hạng Platinum",
              },
            ].map((t) => (
              <div key={t.n} className="rounded-2xl bg-white/5 border border-white/10 p-7">
                <p className="text-sm text-white/90 leading-relaxed mb-6">“{t.q}”</p>
                <div className="text-sm font-bold text-white">{t.n}</div>
                <div className="text-xs text-[#4CEBF5]">{t.r}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA cuối trang */}
      <section className="container mx-auto px-6 py-24">
        <div className="rounded-[2rem] bg-gradient-to-br from-[#0A8C97] to-[#192b4d] px-10 py-16 text-center">
          <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Xe bẩn không đợi được, lịch trống thì có.
          </h3>
          <p className="text-white/80 max-w-md mx-auto mb-8">
            Đặt lịch trong 30 giây, chọn khung giờ gần bạn nhất và theo dõi tiến trình theo thời gian thực.
          </p>
          <Link
            to="/booking"
            className="inline-block px-8 py-3.5 text-sm font-bold text-[#192b4d] bg-white rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            Đặt lịch ngay
          </Link>
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