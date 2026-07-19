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

        {/* Panel trực quan — SVG animation */}
        <div className="relative w-full min-w-0 max-w-[560px] mx-auto lg:ml-auto aspect-[13/10] rounded-[2rem] overflow-hidden shadow-2xl bg-gradient-to-br from-[#192b4d] via-[#22315c] to-[#0A8C97]">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -inset-y-10 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[sweep_5s_ease-in-out_infinite]" />
          </div>

          <svg
            viewBox="0 0 520 400"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="carGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#58EEF4" />
                <stop offset="100%" stopColor="#0A8C97" />
              </linearGradient>

              <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(223,255,255,.86)" />
                <stop offset="100%" stopColor="rgba(35,95,113,.9)" />
              </linearGradient>

              <radialGradient id="spotlight" cx="50%" cy="42%" r="65%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>

              <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(0,0,0,0.42)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>

              <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect x="0" y="0" width="520" height="400" fill="url(#spotlight)" />

            {/* Chấm nền */}
            {[
              [48, 48, 4], [472, 48, 4], [48, 350, 4], [472, 350, 4],
              [130, 30, 2.5], [260, 22, 2.5], [390, 30, 2.5],
              [25, 190, 3], [495, 190, 3]
            ].map(([cx, cy, r], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="rgba(255,255,255,.28)"
                className="animate-[pulse_2.4s_ease-in-out_infinite]"
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            ))}

            {/* Cổng rửa */}
            <g>
              <path
                d="M115 330V158C115 100 162 54 220 54H300C358 54 405 100 405 158V330"
                fill="none"
                stroke="#08182f"
                strokeWidth="34"
                strokeLinecap="round"
              />
              <path
                d="M135 330V164C135 117 173 79 220 79H300C347 79 385 117 385 164V330"
                fill="none"
                stroke="#5DEBF1"
                strokeWidth="6"
                strokeLinecap="round"
                opacity=".82"
                filter="url(#softGlow)"
                className="animate-[portalPulse_1.8s_ease-in-out_infinite_alternate]"
              />
            </g>

            {/* Tia nước trên */}
            <g className="animate-[waterShow_8s_ease-in-out_infinite]">
              {[190, 225, 260, 295, 330].map((x, i) => (
                <line
                  key={i}
                  x1={x}
                  y1="96"
                  x2={x + (i - 2) * 4}
                  y2="245"
                  stroke="#A8FAFF"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray="12 10"
                  filter="url(#softGlow)"
                  className="animate-[waterFlow_.55s_linear_infinite]"
                />
              ))}
            </g>

            {/* Tia nước hai bên */}
            <g className="animate-[waterShow_8s_ease-in-out_infinite]">
              <path d="M138 176C182 190 210 215 230 248" fill="none" stroke="#A8FAFF" strokeWidth="7" strokeLinecap="round" strokeDasharray="12 10" filter="url(#softGlow)" className="animate-[waterFlow_.55s_linear_infinite]" />
              <path d="M382 176C338 190 310 215 290 248" fill="none" stroke="#A8FAFF" strokeWidth="7" strokeLinecap="round" strokeDasharray="12 10" filter="url(#softGlow)" className="animate-[waterFlow_.55s_linear_infinite]" />
            </g>

            {/* Bóng dưới xe */}
            <ellipse
              cx="260"
              cy="325"
              rx="145"
              ry="20"
              fill="url(#shadow)"
              className="animate-[carShadow_8s_cubic-bezier(.65,0,.35,1)_infinite]"
            />

            {/* Xe */}
            <g className="animate-[carMove_8s_cubic-bezier(.65,0,.35,1)_infinite]">
              <path
                d="M135 283C142 247 167 222 204 211L228 176H306L339 212C373 222 395 247 402 283L414 296V330H394C388 356 366 372 338 372C310 372 288 356 282 330H238C232 356 210 372 182 372C154 372 132 356 126 330H106V296L117 284Z"
                fill="url(#carGrad)"
                stroke="#8FF8FA"
                strokeWidth="2.5"
              />

              <path
                d="M216 188H301L329 220H193Z"
                fill="url(#glassGrad)"
                stroke="rgba(230,255,255,.72)"
                strokeWidth="2"
              />

              <path d="M257 188V220" stroke="rgba(5,55,74,.58)" strokeWidth="4" />
              <path d="M129 301H391" stroke="rgba(5,55,74,.42)" strokeWidth="4" strokeLinecap="round" />

              <circle cx="182" cy="330" r="30" fill="#07162F" stroke="#163756" strokeWidth="6" />
              <circle cx="182" cy="330" r="11" fill="#4CEBF5" stroke="#D8FFFF" strokeWidth="3" />
              <circle cx="338" cy="330" r="30" fill="#07162F" stroke="#163756" strokeWidth="6" />
              <circle cx="338" cy="330" r="11" fill="#4CEBF5" stroke="#D8FFFF" strokeWidth="3" />

              <rect x="126" y="269" width="42" height="13" rx="6" fill="#E7FFFF" filter="url(#softGlow)" />
              <rect x="352" y="269" width="42" height="13" rx="6" fill="#E7FFFF" filter="url(#softGlow)" />
            </g>

            {/* Bọt */}
            <g className="animate-[foamShow_8s_ease-in-out_infinite]">
              {[
                [196, 236, 15], [224, 225, 11], [254, 241, 18],
                [285, 225, 12], [315, 240, 16]
              ].map(([cx, cy, r], i) => (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="rgba(246,255,255,.9)"
                  stroke="rgba(112,235,242,.85)"
                  strokeWidth="2"
                  className="animate-[foamFloat_1.1s_ease-in-out_infinite_alternate]"
                  style={{ animationDelay: `${-i * 0.18}s` }}
                />
              ))}
            </g>

            {/* Ánh sáng hoàn tất */}
            <g
              fill="#F2FFFF"
              filter="url(#softGlow)"
              className="animate-[shineShow_8s_ease-in-out_infinite]"
            >
              <path d="M188 202L198 178L208 202L232 212L208 222L198 246L188 222L164 212Z" />
              <path d="M334 230L341 213L348 230L365 237L348 244L341 261L334 244L317 237Z" />
            </g>
          </svg>

          <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-white">
            <span className="font-mono text-xs bg-white/15 px-2.5 py-1.5 rounded-md">
              MS-0417-VN
            </span>
            <span className="flex items-center gap-2 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3EE6A0] shadow-[0_0_0_4px_rgba(62,230,160,0.25)] animate-pulse" />
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
                className="group relative overflow-hidden rounded-2xl border border-black/5 p-7 hover:border-[#0A8C97]/30 hover:shadow-xl transition-all"
              >
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[#0A8C97]/5 group-hover:bg-[#0A8C97]/10 transition-colors" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E6F6F4] to-[#CFF0EE] flex items-center justify-center mb-5 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0A8C97"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-7 h-7"
                  >
                    {s.icon}
                  </svg>
                </div>
                <h4 className="relative text-base font-bold text-[#192b4d] mb-2">{s.t}</h4>
                <p className="relative text-sm text-gray-600 leading-relaxed">{s.d}</p>
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
              icon: <path d="M12 15a5 5 0 100-10 5 5 0 000 10zM8.5 14L7 21l5-2 5 2-1.5-7" />,
            },
            {
              tier: "Silver",
              color: "#8C97A6",
              bg: "#F1F3F6",
              rule: "Đặt cọc 10% khi giữ lịch",
              perk: "Ưu tiên khung giờ cuối tuần",
              icon: <path d="M12 15a5 5 0 100-10 5 5 0 000 10zM8.5 14L7 21l5-2 5 2-1.5-7" />,
            },
            {
              tier: "Gold",
              color: "#C7941C",
              bg: "#FDF6E3",
              rule: "Giữ lịch miễn cọc",
              perk: "Đổi điểm lấy dịch vụ nâng cấp",
              note: "Huỷ trễ nhiều lần sẽ áp lại cọc",
              icon: <path d="M4 4h3l1.5 6M4 4H2m2 0l2.2 11a2 2 0 002 1.6h7.6a2 2 0 002-1.6L18 9H6.4M9 20a1 1 0 102 0 1 1 0 00-2 0zm7 0a1 1 0 102 0 1 1 0 00-2 0z" />,
            },
            {
              tier: "Platinum",
              color: "#192b4d",
              bg: "#EFF1F6",
              rule: "Giữ lịch miễn cọc",
              perk: "Riêng 1 kỹ thuật viên phụ trách",
              note: "Huỷ trễ nhiều lần sẽ áp lại cọc",
              icon: <path d="M3 8l4-4 5 4 5-4 4 4-2 10H5L3 8zM8 18h8" />,
            },
          ].map((m) => (
            <div
              key={m.tier}
              className="relative overflow-hidden rounded-2xl p-7 border border-black/5"
              style={{ background: m.bg }}
            >
              <div
                className="absolute -right-4 -top-4 w-9 h-9 flex items-center justify-center opacity-25"
                style={{ color: m.color }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                  {m.icon}
                </svg>
              </div>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center mb-4"
                style={{ background: "rgba(255,255,255,.6)", color: m.color }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
                  {m.icon}
                </svg>
              </div>
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
        @keyframes riseIn {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        /* Cổng rửa phát sáng nhấp nháy */
        @keyframes portalPulse {
          0% { opacity: .55; }
          100% { opacity: 1; }
        }

        /* Tia nước chỉ hiện khi xe đang ở trong cổng rửa (giữa chu kỳ) */
        @keyframes waterShow {
          0%, 28% { opacity: 0; }
          36%, 64% { opacity: 1; }
          72%, 100% { opacity: 0; }
        }

        /* Vệt nước chảy dọc theo tia (dịch chuyển dash) */
        @keyframes waterFlow {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -44; }
        }

        /* Bóng xe di chuyển đồng bộ với xe */
        @keyframes carShadow {
          0% { transform: translateX(-190px); opacity: .25; }
          50% { transform: translateX(0); opacity: .55; }
          100% { transform: translateX(190px); opacity: .25; }
        }

        /* Xe chạy từ trái, xuyên qua cổng rửa, ra bên phải rồi lặp lại */
        @keyframes carMove {
          0% { transform: translateX(-190px); }
          50% { transform: translateX(0); }
          100% { transform: translateX(190px); }
        }

        /* Bọt chỉ hiện khi xe ở trong cổng rửa */
        @keyframes foamShow {
          0%, 32% { opacity: 0; }
          40%, 60% { opacity: 1; }
          70%, 100% { opacity: 0; }
        }

        /* Bọt bồng bềnh nhẹ */
        @keyframes foamFloat {
          0% { transform: translateY(0); }
          100% { transform: translateY(-5px); }
        }

        /* Tia sáng loé lên khi xe vừa rửa xong, ra khỏi cổng */
        @keyframes shineShow {
          0%, 68% { opacity: 0; transform: scale(.8); }
          76%, 88% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(.8); }
        }
        @keyframes sweep {
          0%, 100% { transform: translateX(-120%) skewX(-12deg); }
          50% { transform: translateX(320%) skewX(-12deg); }
        }

        /* ===== Polish thêm cho toàn trang ===== */

        /* màu bôi đen văn bản theo brand thay vì xanh mặc định của trình duyệt */
        ::selection { background: #0A8C97; color: #ffffff; }

        /* thanh cuộn mảnh, theo tông brand */
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: #F4F5F8; }
        ::-webkit-scrollbar-thumb { background: #C7D3D8; border-radius: 999px; border: 2px solid #F4F5F8; }
        ::-webkit-scrollbar-thumb:hover { background: #0A8C97; }

        /* mọi thẻ bo góc (dịch vụ / hạng thành viên / đánh giá) nổi nhẹ + đổ bóng mềm khi rê chuột */
        .rounded-2xl { transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
        .rounded-2xl:hover { transform: translateY(-3px); }

        /* focus rõ ràng, không dùng viền xanh mặc định thô của trình duyệt */
        a:focus-visible, button:focus-visible {
          outline: 2px solid #0A8C97;
          outline-offset: 3px;
          border-radius: 6px;
        }

        /* gạch chân chạy động khi hover các link điều hướng */
        header nav a {
          position: relative;
        }
        header nav a:not(.text-\[\#192b4d\])::after {
          content: "";
          position: absolute;
          left: 0; right: 100%;
          bottom: -6px;
          height: 2px;
          background: #F58607;
          transition: right .25s ease;
        }
        header nav a:not(.text-\[\#192b4d\]):hover::after { right: 0; }

        /* nút CTA cam nhích nhẹ + sáng hơn khi hover, mượt hơn transition mặc định của Tailwind */
        a.bg-\[\#F58607\] { transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease; }
        a.bg-\[\#F58607\]:hover { transform: translateY(-2px); }
      `}</style>
    </div>
  );
};

export default Home;