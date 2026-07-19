import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Home = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isStaff, isUser, logout } = useAuth();

  // Chế độ mô phỏng tương tác thời gian thực
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(null); // null, 0, 1, 2, 3

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

  // Khởi động mô phỏng
  const startSimulation = (e) => {
    if (e) e.preventDefault();
    if (isSimulating) return;
    setIsSimulating(true);

    const panel = document.getElementById("sim-panel");
    if (panel) {
      panel.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    setSimulationStep(0);

    const timers = [
      setTimeout(() => setSimulationStep(1), 1800),
      setTimeout(() => setSimulationStep(2), 5300),
      setTimeout(() => setSimulationStep(3), 7500),
      setTimeout(() => {
        setIsSimulating(false);
        setSimulationStep(null);
      }, 10500)
    ];

    return () => timers.forEach(clearTimeout);
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F8FAFC] font-sans text-[#1E293B] antialiased" style={{ width: '100%', maxWidth: '100vw' }}>
      {/* SECTION 1: HEADER NỔI + HERO TRONG PHÂN VÙNG FULL-WIDTH TỐI (DARK MODE PREMIUM) */}
      <div 
        className="text-white relative overflow-hidden w-full pb-28 flex flex-col items-center"
        style={{
          background: `
            radial-gradient(circle at 50% 25%, rgba(15, 182, 196, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 50% 75%, rgba(245, 134, 7, 0.08) 0%, transparent 50%),
            linear-gradient(to bottom, #0B0F19, #0F172A, #0A0D14)
          `
        }}
      >
        {/* Header Capsule - Thiết kế dạng viên nang lơ lửng cực kỳ thời thượng */}
        <div className="w-full px-6 pt-6 relative z-50">
          <header 
            className="w-full rounded-2xl border border-white/5 bg-[#0F172A]/60 backdrop-blur-xl shadow-2xl flex items-center justify-between" 
            style={{ maxWidth: '1600px', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '0.875rem', paddingBottom: '0.875rem' }}
          >
            {/* Logo - Sát trái */}
            <div className="flex items-center gap-3.5 group cursor-pointer flex-shrink-0">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-800 ring-2 ring-white/10 group-hover:ring-[#0FB6C4]/50 transition-all duration-300">
                <img
                  src="/logo.png"
                  alt="Moto Shine Logo"
                  className="w-full h-full object-cover group-hover:scale-110 transition-all duration-300"
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-black text-white leading-none mb-0.5 tracking-tight">
                  Moto Shine
                </h1>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#0FB6C4] leading-none">
                  Smart Car Wash
                </p>
              </div>
            </div>

            {/* Navigation Links - Giữa, trải rộng hơn */}
            <nav className="hidden lg:flex items-center gap-10">
              <Link to="/" className="text-sm font-black text-[#0FB6C4] tracking-wider uppercase relative py-1">
                Trang chủ
              </Link>
              <a href="#services" className="text-sm font-bold text-slate-400 hover:text-white tracking-wider uppercase transition-colors relative py-1">
                Dịch vụ
              </a>
              {(!user || isUser()) && (
                <Link to="/booking" className="text-sm font-bold text-slate-400 hover:text-white tracking-wider uppercase transition-colors relative py-1">
                  Đặt lịch
                </Link>
              )}
              {user && (
                <Link to={isAdmin() || isStaff() ? "/admin/dashboard" : "/dashboard"} className="text-sm font-bold text-slate-400 hover:text-white tracking-wider uppercase transition-colors relative py-1">
                  Thành viên
                </Link>
              )}
              {user && (
                <Link to="/vehicles" className="text-sm font-bold text-slate-400 hover:text-white tracking-wider uppercase transition-colors relative py-1">
                  Quản lý xe
                </Link>
              )}
              {(isAdmin() || isStaff()) && (
                <Link to="/admin/dashboard" className="text-sm font-bold text-[#F58607] hover:text-orange-500 tracking-wider uppercase transition-colors">
                  Quản trị ⚙️
                </Link>
              )}
            </nav>

            {/* Auth Buttons - Sát phải */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {user ? (
                <>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2.5 pl-2.5 pr-5 py-1.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-full transition-all"
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #0FB6C4 0%, #0A8C97 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 800,
                        color: "white",
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(user.fullName)}
                    </div>
                    <span className="hidden sm:inline-block max-w-[120px] truncate">{user.fullName}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-5 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-full active:scale-95 transition-all"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-5 py-2 text-sm font-bold text-slate-300 hover:text-white transition-all flex-shrink-0"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="px-6 py-2.5 text-sm font-bold text-white bg-[#F58607] hover:bg-orange-600 rounded-full active:scale-95 shadow-lg shadow-orange-500/10 transition-all flex-shrink-0"
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </div>
          </header>
        </div>

        {/* Hero Content - THIẾT KẾ CĂN GIỮA ĐỐI XỨNG TUYỆT ĐỐI (TRÁNH LỆCH BÊN TRÁI) */}
        <div className="page-center pt-24 pb-12 flex flex-col items-center text-center relative z-10" style={{ maxWidth: '960px' }}>
          <div className="inline-flex items-center gap-2 pl-3.5 pr-4 py-2 rounded-full bg-slate-800/80 border border-slate-700/50 text-[10px] font-extrabold uppercase tracking-widest text-[#0FB6C4] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F58607] animate-pulse" />
            Rửa xe công nghệ IoT thời gian thực
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-[4.2rem] font-black leading-[1.12] tracking-tight text-white mb-8">
            Rửa xe thông minh<br />
            Không còn phải <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#0FB6C4] via-[#0A8C97] to-[#F58607]">chờ đợi mù mờ.</span>
          </h2>

          <p className="text-sm sm:text-base text-slate-450 leading-relaxed max-w-xl mb-8">
            Hệ thống đặt lịch tự động hóa, điều phối luồng xe thông minh thông qua cảm biến IoT giúp bạn chủ động thời gian, nhận thông báo tiến độ trực quan.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-5 mb-10 w-full">
            <Link
              to="/booking"
              className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-[#F58607] hover:bg-orange-600 text-white text-sm sm:text-base font-bold rounded-full shadow-lg shadow-orange-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex-shrink-0"
            >
              Đặt lịch ngay
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <button
              onClick={startSimulation}
              className="flex items-center gap-3 group bg-transparent border-none cursor-pointer text-left focus:outline-none flex-shrink-0"
              disabled={isSimulating}
              style={{ padding: 0 }}
            >
              <div className="w-11 h-11 bg-slate-800 rounded-full flex items-center justify-center shadow-md group-hover:bg-slate-700 active:scale-95 transition-all duration-300 shrink-0 border border-slate-750">
                {isSimulating ? (
                  <div className="w-5 h-5 border-2 border-[#0FB6C4] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-[#0FB6C4] ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs sm:text-sm font-bold text-white group-hover:text-[#F58607] transition-colors">
                  {isSimulating ? "Đang chạy mô phỏng..." : "Xem cách hoạt động"}
                </span>
                {isSimulating && (
                  <span className="text-[9px] text-[#0FB6C4] font-bold mt-0.5 animate-pulse">
                    {simulationStep === 0 && "1. Quét biển số xe... ⏳"}
                    {simulationStep === 1 && "2. Đang rửa sạch... 💦"}
                    {simulationStep === 2 && "3. Đang sấy khô... 🌪️"}
                    {simulationStep === 3 && "4. Rửa xong! ✨"}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Khối stats căn giữa */}
          <div className="grid grid-cols-3 gap-8 pt-8 border-t border-slate-800/80 w-full max-w-md mx-auto mb-16">
            <div>
              <div className="text-xl sm:text-2xl font-black text-[#0FB6C4]">3 Bước</div>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Đăng ký dễ dàng</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-[#F58607]">4 Hạng</div>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Tích lũy hạng</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-white">Real-time</div>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Theo dõi tiến độ</div>
            </div>
          </div>

          {/* SVG mô phỏng căn giữa hoàn hảo dưới khối thông tin */}
          <div id="sim-panel" className="relative w-full min-w-0 max-w-[500px] aspect-[13/10] scroll-mt-28 bg-[#0F172A]/40 backdrop-blur-md overflow-hidden rounded-3xl border border-white/5 shadow-2xl">
            {/* Hộp thông tin động khi chạy mô phỏng */}
            {simulationStep !== null && (
              <div className="absolute top-4 left-4 right-4 bg-[#0F172A]/90 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-white flex items-center gap-3.5 shadow-xl z-20 transition-all duration-300 animate-[riseIn_0.3s_ease-out]">
                <div className="w-9 h-9 rounded-full bg-[#5DEBF1]/15 border border-[#5DEBF1]/30 flex items-center justify-center text-xs font-extrabold text-[#5DEBF1] shrink-0">
                  {simulationStep + 1}
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs sm:text-sm text-white mb-0.5">
                    {simulationStep === 0 && "1. Quét biển số & Check-in ⏳"}
                    {simulationStep === 1 && "2. Rửa sạch bằng chổi xoay 💦"}
                    {simulationStep === 2 && "3. Thổi sấy khô cao áp 🌪️"}
                    {simulationStep === 3 && "4. Rửa xong & Nhận xe ✨"}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-350 leading-normal text-left">
                    {simulationStep === 0 && "Hệ thống IoT nhận diện biển số xe và kích hoạt phiên làm việc tự động."}
                    {simulationStep === 1 && "Phun bọt tuyết cùng chổi xoay thông minh làm sạch toàn bộ thân xe."}
                    {simulationStep === 2 && "Dàn sấy luồng khí lớn quét sạch hạt nước đọng trên gương và kính xe."}
                    {simulationStep === 3 && "Thông báo hoàn thành gửi đến điện thoại khách hàng, sẵn sàng lăn bánh."}
                  </div>
                </div>
              </div>
            )}

            <svg
              viewBox="0 0 520 400"
              className="w-full h-full overflow-hidden"
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
                  <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>

                <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(0,0,0,0.45)" />
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
                  fill="rgba(255,255,255,.15)"
                  className="animate-[pulse_2.4s_ease-in-out_infinite]"
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              ))}

              {/* Cổng rửa */}
              <g>
                <path
                  d="M115 330V158C115 100 162 54 220 54H300C358 54 405 100 405 158V330"
                  fill="none"
                  stroke="#080e1a"
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
              <g
                className={simulationStep === null ? "animate-[waterShow_8s_ease-in-out_infinite]" : ""}
                style={{
                  opacity: simulationStep === 1 ? 1 : 0,
                  transition: "opacity 0.4s ease"
                }}
              >
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
              <g
                className={simulationStep === null ? "animate-[waterShow_8s_ease-in-out_infinite]" : ""}
                style={{
                  opacity: simulationStep === 1 ? 1 : 0,
                  transition: "opacity 0.4s ease"
                }}
              >
                <path d="M138 176C182 190 210 215 230 248" fill="none" stroke="#A8FAFF" strokeWidth="7" strokeLinecap="round" strokeDasharray="12 10" filter="url(#softGlow)" className="animate-[waterFlow_.55s_linear_infinite]" />
                <path d="M382 176C338 190 310 215 290 248" fill="none" stroke="#A8FAFF" strokeWidth="7" strokeLinecap="round" strokeDasharray="12 10" filter="url(#softGlow)" className="animate-[waterFlow_.55s_linear_infinite]" />
              </g>

              {/* Luồng gió sấy khô */}
              <g
                style={{
                  opacity: simulationStep === 2 ? 1 : 0,
                  transition: "opacity 0.4s ease"
                }}
              >
                <path d="M160 210 Q 210 200 260 210 T 360 210" fill="none" stroke="#E7FFFF" strokeWidth="2.5" strokeDasharray="6 6" filter="url(#softGlow)" className="animate-[waterFlow_.35s_linear_infinite]" />
                <path d="M140 230 Q 190 220 240 230 T 340 230" fill="none" stroke="#E7FFFF" strokeWidth="2.5" strokeDasharray="6 6" filter="url(#softGlow)" className="animate-[waterFlow_.35s_linear_infinite]" />
                <path d="M180 250 Q 230 240 280 250 T 380 250" fill="none" stroke="#E7FFFF" strokeWidth="2.5" strokeDasharray="6 6" filter="url(#softGlow)" className="animate-[waterFlow_.35s_linear_infinite]" />
              </g>

              {/* Bóng dưới xe */}
              <ellipse
                cx="260"
                cy="325"
                rx="145"
                ry="20"
                fill="url(#shadow)"
                className={simulationStep === 1 || simulationStep === 2 ? "animate-[carRumble_0.15s_linear_infinite]" : ""}
                style={{
                  opacity: 0.55,
                  transformOrigin: "260px 325px"
                }}
              />

              {/* Xe - Rung tại chỗ mô phỏng đang rửa/sấy */}
              <g
                className={simulationStep === 1 || simulationStep === 2 ? "animate-[carRumble_0.15s_linear_infinite]" : ""}
                style={{
                  transformOrigin: "260px 325px"
                }}
              >
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
              <g
                className={simulationStep === null ? "animate-[foamShow_8s_ease-in-out_infinite]" : ""}
                style={{
                  opacity: simulationStep === 1 ? 1 : 0,
                  transition: "opacity 0.4s ease"
                }}
              >
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
                className={simulationStep === null ? "animate-[shineShow_8s_ease-in-out_infinite]" : ""}
                style={{
                  opacity: simulationStep === 3 ? 1 : 0,
                  transform: simulationStep === 3 ? "scale(1)" : "scale(0.8)",
                  transition: "opacity 0.4s ease, transform 0.4s ease",
                  transformOrigin: "260px 200px"
                }}
              >
                <path d="M188 202L198 178L208 202L232 212L208 222L198 246L188 222L164 212Z" />
                <path d="M334 230L341 213L348 230L365 237L348 244L341 261L334 244L317 237Z" />
              </g>
            </svg>

            {/* Thông báo trạng thái dưới gầm xe */}
            <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-white z-10">
              <span className="font-mono text-[9px] bg-white/10 border border-white/5 px-2 py-0.5 rounded">
                MS-0417-VN
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  simulationStep === 0 ? "bg-yellow-400 shadow-[0_0_0_4px_rgba(250,204,21,0.25)]" :
                  simulationStep === 1 ? "bg-[#5DEBF1] shadow-[0_0_0_4px_rgba(93,235,241,0.25)]" :
                  simulationStep === 2 ? "bg-purple-400 shadow-[0_0_0_4px_rgba(192,132,252,0.25)]" :
                  simulationStep === 3 ? "bg-green-400 shadow-[0_0_0_4px_rgba(74,222,128,0.25)]" :
                  "bg-[#5DEBF1] shadow-[0_0_0_4px_rgba(93,235,241,0.25)]"
                }`} />
                {simulationStep === 0 && "Chờ check-in"}
                {simulationStep === 1 && "Đang rửa xe"}
                {simulationStep === 2 && "Đang sấy khô"}
                {simulationStep === 3 && "Hoàn thành"}
                {simulationStep === null && "Đang rửa xe"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: CÁC PHÂN VÙNG THÔNG TIN SÁNG (LIGHT MODE) - SANG TRỌNG, KHÔNG KHUNG CỨNG */}
      
      {/* Cách hoạt động - Flat, clean & symmetric */}
      <section id="how-it-works" className="bg-white py-32 scroll-mt-24 w-full">
        <div className="page-center">
          <div className="flex flex-col items-center text-center mb-20 w-full">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#0A8C97] bg-[#E6F6F4] px-4 py-1.5 rounded-full mb-4">
              Quy trình thông minh
            </div>
            <h3 className="text-3xl sm:text-4xl lg:text-[2.8rem] font-black text-[#0F172A] tracking-tight text-balance leading-tight">
              Ba bước đặt lịch tự động
            </h3>
            <p className="text-sm text-slate-500 mt-4 max-w-md mx-auto leading-relaxed">
              Nhanh chóng, chính xác và không bao giờ phải xếp hàng chờ đợi tại cửa hàng.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 max-w-5xl mx-auto w-full">
            {[
              {
                n: "01",
                t: "Chọn dịch vụ",
                d: "Lựa chọn gói dịch vụ cơ bản và các phụ phí thích hợp dựa trên dòng xe của bạn.",
                gradient: "from-amber-400 to-orange-500 shadow-orange-500/20",
              },
              {
                n: "02",
                t: "Chọn khung giờ trống",
                d: "Xem trực tiếp lịch trống của máy rửa và tiến hành đặt hẹn giữ chỗ trước.",
                gradient: "from-teal-400 to-cyan-500 shadow-teal-500/20",
              },
              {
                n: "03",
                t: "Theo dõi & Nhận xe",
                d: "Theo dõi tiến độ IoT thời gian thực qua điện thoại và nhận xe sạch bong sau khi hoàn thành.",
                gradient: "from-indigo-50 to-purple-600 shadow-indigo-500/20",
              },
            ].map((s) => (
              <div key={s.n} className="flex flex-col items-center text-center space-y-4 group cursor-pointer">
                <div className={`w-14 h-14 rounded-full bg-gradient-to-tr ${s.gradient} text-white flex items-center justify-center font-mono text-lg font-black shadow-lg group-hover:scale-110 transition-all duration-300`}>
                  {s.n}
                </div>
                <h4 className="text-lg font-bold text-[#0F172A] tracking-tight pt-2">{s.t}</h4>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dịch vụ - Tinh tế, phẳng, hover đổi màu nhẹ nhàng */}
      <section id="services" className="bg-[#F8FAFC] py-32 scroll-mt-24 w-full">
        <div className="page-center">
          <div className="flex flex-col items-center text-center mb-20 w-full">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#0A8C97] bg-[#E6F6F4] px-4 py-1.5 rounded-full mb-4">
              Gói dịch vụ chuyên sâu
            </div>
            <h3 className="text-3xl sm:text-4xl lg:text-[2.8rem] font-black text-[#0F172A] tracking-tight text-balance leading-tight">
              Đầy đủ các gói cho từng dòng xe
            </h3>
            <p className="text-sm text-slate-500 mt-4 max-w-md mx-auto leading-relaxed">
              Hệ thống vòi phun áp lực lớn kết hợp chổi lau chuyên dụng nhập khẩu siêu mềm bảo vệ bề mặt sơn.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto w-full">
            {[
              {
                t: "Rửa nhanh",
                d: "Vệ sinh toàn bộ thân vỏ ngoại thất, làm sạch la-zăng và sấy khô chỉ trong 15 phút.",
                bg: "hover:bg-[#E6F6F4]/40",
                iconBg: "bg-teal-50 text-teal-600",
                icon: (
                  <path d="M4 12h16M4 12l3-6h10l3 6M4 12v5a1 1 0 001 1h1a1 1 0 001-1v-1h10v1a1 1 0 001 1h1a1 1 0 001-1v-5" />
                ),
              },
              {
                t: "Chăm sóc nội thất",
                d: "Hút bụi sâu, lau dọn khử khuẩn taplo, khe gió và bảo dưỡng bề mặt da ghế cao cấp.",
                bg: "hover:bg-amber-50/30",
                iconBg: "bg-amber-50 text-amber-600",
                icon: <path d="M4 6h16v9a3 3 0 01-3 3H7a3 3 0 01-3-3V6zM8 6V4h8v2" />,
              },
              {
                t: "Phủ bóng Ceramic",
                d: "Công nghệ phủ bảo vệ bề mặt sơn xe, tăng độ bóng sâu, chống ố nước và hạn chế trầy xước.",
                bg: "hover:bg-indigo-50/30",
                iconBg: "bg-indigo-50 text-indigo-600",
                icon: <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" />,
              },
              {
                t: "Rửa tại nhà",
                d: "Xe rửa di động mang trang thiết bị chuyên dụng tới phục vụ trực tiếp tại nhà riêng hoặc hầm chung cư.",
                bg: "hover:bg-rose-50/30",
                iconBg: "bg-rose-50 text-rose-650",
                icon: <path d="M3 11l9-7 9 7M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" />,
              },
            ].map((s) => (
              <div key={s.t} className={`flex flex-col items-center text-center p-6 space-y-4 rounded-3xl transition-all duration-300 group cursor-pointer ${s.bg}`}>
                <div className={`w-14 h-14 rounded-2xl ${s.iconBg} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6"
                  >
                    {s.icon}
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-[#0F172A] group-hover:text-[#0A8C97] transition-colors pt-2">{s.t}</h4>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hạng thành viên - Phẳng hoàn toàn, không khung hộp, thanh thoát và hiện đại */}
      <section id="membership" className="bg-white py-32 scroll-mt-24 w-full">
        <div className="page-center">
          <div className="flex flex-col items-center text-center mb-20 w-full">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#0A8C97] bg-[#E6F6F4] px-4 py-1.5 rounded-full mb-4">
              Đặc quyền hội viên
            </div>
            <h3 className="text-3xl sm:text-4xl lg:text-[2.8rem] font-black text-[#0F172A] tracking-tight text-balance leading-tight">
              Hạng thành viên tích điểm
            </h3>
            <p className="text-sm sm:text-base text-slate-500 mt-4 max-w-md mx-auto leading-relaxed">
              Tự động nâng hạng thành viên dựa trên tần suất sử dụng dịch vụ của bạn.
            </p>
          </div>

          {/* Thiết kế phẳng hoàn toàn, bỏ các viền bao quanh thẻ để trang thanh thoát */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16 max-w-6xl mx-auto w-full">
            {[
              {
                tier: "Bronze",
                color: "#B08D57",
                rule: "Đặt cọc 10%",
                perk: "Tích lũy điểm thưởng cơ bản trên mỗi hóa đơn thanh toán.",
                icon: <path d="M12 15a5 5 0 100-10 5 5 0 000 10zM8.5 14L7 21l5-2 5 2-1.5-7" />,
              },
              {
                tier: "Silver",
                color: "#64748B",
                rule: "Đặt cọc 10%",
                perk: "Ưu tiên giữ lịch hẹn vào các khung giờ vàng cuối tuần.",
                icon: <path d="M12 15a5 5 0 100-10 5 5 0 000 10zM8.5 14L7 21l5-2 5 2-1.5-7" />,
              },
              {
                tier: "Gold",
                color: "#D97706",
                rule: "Miễn cọc lịch hẹn 🤩",
                perk: "Đổi điểm tích lũy lấy các phần quà chăm sóc xe chuyên sâu miễn phí.",
                note: "Huỷ lịch trễ nhiều lần sẽ tạm áp dụng lại cọc.",
                icon: <path d="M4 4h3l1.5 6M4 4H2m2 0l2.2 11a2 2 0 002 1.6h7.6a2 2 0 002-1.6L18 9H6.4M9 20a1 1 0 102 0 1 1 0 00-2 0zm7 0a1 1 0 102 0 1 1 0 00-2 0z" />,
              },
              {
                tier: "Platinum",
                color: "#0FB6C4",
                rule: "Miễn cọc + Ưu tiên 👑",
                perk: "Bố trí cố định 01 kỹ thuật viên có tay nghề cao phụ trách riêng xe bạn.",
                note: "Ưu tiên xử lý khẩn cấp không cần chờ xếp lịch.",
                icon: <path d="M3 8l4-4 5 4 5-4 4 4-2 10H5L3 8zM8 18h8" />,
              },
            ].map((m) => (
              <div key={m.tier} className="flex flex-col items-center text-center space-y-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-2 shadow-sm"
                  style={{ background: "#F8FAFC", color: m.color, border: "1px solid #E2E8F0" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    {m.icon}
                  </svg>
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: m.color }}>
                  {m.tier}
                </div>
                <h4 className="text-xl font-bold text-[#0F172A] tracking-tight">{m.rule}</h4>
                <p className="text-sm text-slate-550 leading-relaxed max-w-[210px]">{m.perk}</p>
                {m.note && (
                  <p className="text-[10px] text-slate-400 mt-2 italic leading-normal border-t border-slate-200/60 pt-3 max-w-[200px] w-full">
                    {m.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Đánh giá khách hàng - Thiết kế phẳng sang trọng hoàn toàn không viền khung */}
      <section className="bg-[#0F172A] py-32 relative overflow-hidden w-full">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
        <div className="page-center">
          <div className="flex flex-col items-center text-center mb-20 w-full">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#4CEBF5] bg-[#4CEBF5]/10 px-4 py-1.5 rounded-full mb-4">
              Ý kiến khách hàng
            </div>
            <h3 className="text-3xl sm:text-4xl lg:text-[2.8rem] font-black text-white tracking-tight text-balance leading-tight">
              Khách hàng nói gì về chúng tôi
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 max-w-5xl mx-auto w-full">
            {[
              {
                q: "Đặt lịch buổi sáng, trưa quay lại xe đã sạch bong — không phải gọi điện xác nhận lại lần nào, hệ thống IoT tự làm mọi thứ.",
                n: "Minh Anh",
                r: "Thành viên hạng Gold",
              },
              {
                q: "Tiến trình rửa xe cập nhật liên tục trên điện thoại nên tôi chủ động thời gian lấy xe cực kỳ tiện lợi.",
                n: "Quốc Bảo",
                r: "Thành viên hạng Silver",
              },
              {
                q: "Gói rửa tại nhà cực kỳ tiện lợi cho lịch trình bận rộn của tôi. Đội kỹ thuật làm rất kỹ, chuyên nghiệp.",
                n: "Thu Hà",
                r: "Thành viên hạng Platinum",
              },
            ].map((t) => (
              <div key={t.n} className="flex flex-col items-center text-center space-y-4">
                <span className="text-5xl text-[#0FB6C4] font-serif leading-none select-none">“</span>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed -mt-4 italic max-w-xs">
                  {t.q}
                </p>
                <div className="pt-2">
                  <div className="text-sm font-extrabold text-white">{t.n}</div>
                  <div className="text-[10px] font-bold text-[#4CEBF5] mt-1.5 uppercase tracking-widest">{t.r}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA cuối trang - Thiết kế FULL-WIDTH TRÀN VIỀN thực thụ (Không dùng khung hộp bao quanh) */}
      <section className="bg-gradient-to-r from-[#0F172A] via-[#0A8C97] to-[#0F172A] py-32 text-center relative overflow-hidden w-full">
        <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
        <div className="page-center relative z-10">
          <h3 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight text-balance">
            Xe bẩn không đợi được, lịch trống thì có.
          </h3>
          <p className="text-slate-350 max-w-md mx-auto mb-10 text-sm sm:text-base leading-relaxed">
            Đặt lịch hẹn chỉ trong 30 giây để nhận ưu đãi cọc và kiểm tra trạng thái rửa xe theo thời gian thực ngay hôm nay!
          </p>
          <Link
            to="/booking"
            className="inline-block px-10 py-4 text-base font-extrabold text-[#0F172A] bg-white hover:bg-slate-50 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 rounded-full"
          >
            Đặt lịch rửa ngay 🚀
          </Link>
        </div>
      </section>

      {/* Footer chuyên nghiệp hoàn thiện thiết kế */}
      <footer className="bg-[#0B0F19] text-slate-400 py-16 border-t border-slate-800 relative z-10 w-full">
        <div className="page-center grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl w-full">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 ring-2 ring-slate-700">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-lg font-black text-white tracking-tight">Moto Shine</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              Hệ thống rửa xe tự động thông minh hàng đầu. Đặt lịch nhanh chóng, chăm sóc tận tâm, công nghệ hiện đại.
            </p>
          </div>
          <div>
            <h5 className="text-xs font-black uppercase text-white tracking-widest mb-4">Liên kết nhanh</h5>
            <ul className="space-y-2 text-xs">
              <li><Link to="/" className="hover:text-[#0FB6C4] transition-colors">Trang chủ</Link></li>
              <li><a href="#services" className="hover:text-[#0FB6C4] transition-colors">Dịch vụ</a></li>
              <li><Link to="/booking" className="hover:text-[#0FB6C4] transition-colors">Đặt lịch rửa xe</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="text-xs font-black uppercase text-white tracking-widest mb-4">Hỗ trợ khách hàng</h5>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-[#0FB6C4] transition-colors">Hướng dẫn thanh toán</a></li>
              <li><a href="#" className="hover:text-[#0FB6C4] transition-colors">Chính sách thành viên</a></li>
              <li><a href="#" className="hover:text-[#0FB6C4] transition-colors">Quy trình khiếu nại</a></li>
            </ul>
          </div>

        </div>
        <div className="page-center mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-650 max-w-6xl w-full gap-4">
          <span>© {new Date().getFullYear()} Moto Shine. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-400 transition-colors">Điều khoản bảo mật</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Quy chế hoạt động</a>
          </div>
        </div>
      </footer>

      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes riseIn {
          0% { opacity: 0; transform: translateY(18px); }
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

        /* Xe rung nhẹ mô phỏng động cơ/vòi xịt trong cổng rửa */
        @keyframes carRumble {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-0.8px) translateX(0.4px); }
          75% { transform: translateY(0.8px) translateX(-0.4px); }
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

        /* màu bôi đen văn bản theo brand thay vì xanh mặc định của trình duyệt */
        ::selection { background: #0A8C97; color: #ffffff; }

        /* thanh cuộn mảnh, theo tông brand */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #0F172A; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 999px; }
        ::-webkit-scrollbar-thumb:hover { background: #0FB6C4; }

        /* focus rõ ràng, không dùng viền xanh mặc định thô của trình duyệt */
        a:focus-visible, button:focus-visible {
          outline: 2px solid #0FB6C4;
          outline-offset: 3px;
          border-radius: 6px;
        }

        /* gạch chân chạy động khi hover các link điều hướng */
        header nav a {
          position: relative;
        }
        header nav a:not(.text-\[\#0FB6C4\])::after {
          content: "";
          position: absolute;
          left: 0; right: 100%;
          bottom: -22px;
          height: 3px;
          background: #F58607;
          transition: right .25s ease;
          border-radius: 99px;
        }
        header nav a:not(.text-\[\#0FB6C4\]):hover::after { right: 0; }
      `}</style>
    </div>
  );
};

export default Home;