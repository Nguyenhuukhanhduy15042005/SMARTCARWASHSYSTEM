import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./MemberHeader.css";

// Trọng thêm: Thành phần Header dùng chung cho phần Member Portal
export default function MemberHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <header className="user-header">
      <div className="user-header-brand">
        <img src="/logo.png" alt="Moto Shine Logo" className="header-logo-img" />
        <span>Moto Shine</span>
      </div>
      <div className="user-header-profile">
        <Link to="/dashboard" className={`nav-link ${currentPath === "/dashboard" ? "active" : ""}`}>
          Thành viên
        </Link>
        <Link to="/booking" className={`nav-link ${currentPath === "/booking" ? "active" : ""}`}>
          Đặt Lịch Ngay
        </Link>
        <Link to="/vehicles" className={`nav-link ${currentPath === "/vehicles" ? "active" : ""}`}>
          Xe của tôi
        </Link>
        <Link to="/reward-redemption" className={`nav-link ${currentPath === "/reward-redemption" ? "active" : ""}`}>
          Đổi điểm thưởng
        </Link>
        <Link to="/loyalty" className={`nav-link ${currentPath === "/loyalty" ? "active" : ""}`}>
          Lịch sử tích điểm
        </Link>
        <Link to="/profile" className={`nav-link ${currentPath === "/profile" ? "active" : ""}`}>
          Hồ sơ cá nhân
        </Link>
        <div className="user-header-actions">
          <button className="btn-logout" onClick={handleLogout}>
            <i className="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}
