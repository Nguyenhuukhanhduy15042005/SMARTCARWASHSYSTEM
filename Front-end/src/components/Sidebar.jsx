import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Sidebar.css";
import ThemePanel from "./ThemePanel";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();
  const currentPath = location.pathname;

  useEffect(() => {
    const linkFont = document.createElement("link");
    linkFont.href =
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap";
    linkFont.rel = "stylesheet";
    document.head.appendChild(linkFont);

    const linkIcons = document.createElement("link");
    linkIcons.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    linkIcons.rel = "stylesheet";
    document.head.appendChild(linkIcons);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const ROLE_MAP = { 1: "admin", 2: "staff", 3: "user" };
  const role = ROLE_MAP[currentUser?.roleId] || "user";
  const fullName = currentUser?.fullName || "Người dùng";
  const userInitials = fullName ? fullName.substring(0, 2).toUpperCase() : "US";

  const menuItems = [];

  if (role === "admin") {
    menuItems.push(
      {
        path: "/admin/dashboard",
        label: "Trang chủ",
        icon: "fa-solid fa-chart-line",
      },
      {
        path: "/admin/analytics",
        label: "Thống kê",
        icon: "fa-solid fa-chart-pie",
      },
      {
        path: "/admin/behavior-analytics",
        label: "Phân Tích Hành Vi",
        icon: "fa-solid fa-users-viewfinder",
      }, // <-- Thêm vào đây
      {
        path: "/admin/surveys",
        label: "Khảo sát",
        icon: "fa-solid fa-clipboard-list",
      },
      {
        path: "/timeslots",
        label: "Bàn làm việc",
        icon: "fa-solid fa-car-side",
      },
      {
        path: "/admin/members",
        label: "Khách hàng",
        icon: "fa-solid fa-users",
      },
      {
        path: "/admin/accounts",
        label: "Tài khoản",
        icon: "fa-solid fa-user-shield",
      },
      { path: "/admin/machines", label: "Máy móc", icon: "fa-solid fa-gears" },
      {
        path: "/admin/promotions",
        label: "Khuyến mãi",
        icon: "fa-solid fa-tags",
      },
      { path: "/admin/feedbacks", label: "Đánh giá", icon: "fa-solid fa-star" },
      { path: "/admin/refund-requests", label: "Hoàn tiền", icon: "fa-solid fa-money-bill-transfer" },
    );
  } else if (role === "staff") {
    menuItems.push(
      {
        path: "/staff/dashboard",
        label: "Trang chủ",
        icon: "fa-solid fa-chart-line",
      },
      {
        path: "/staff/behavior-analytics",
        label: "Phân Tích Hành Vi",
        icon: "fa-solid fa-users-viewfinder",
      }, // <-- THÊM DÒNG NÀY VÀO ĐÂY
      {
        path: "/staff/timeslots",
        label: "Bàn làm việc",
        icon: "fa-solid fa-car-side",
      },
      {
        path: "/staff/members",
        label: "Khách hàng",
        icon: "fa-solid fa-users",
      },
      { path: "/staff/machines", label: "Máy móc", icon: "fa-solid fa-gears" },
      {
        path: "/staff/promotions",
        label: "Khuyến mãi",
        icon: "fa-solid fa-tags",
      },
      { path: "/staff/feedbacks", label: "Đánh giá", icon: "fa-solid fa-star" },
      { path: "/staff/refund-requests", label: "Hoàn tiền", icon: "fa-solid fa-money-bill-transfer" },
    );
  } else {
    menuItems.push(
      {
        path: "/dashboard",
        label: "Trang chủ",
        icon: "fa-solid fa-chart-line",
      },
      {
        path: "/booking",
        label: "Đặt lịch",
        icon: "fa-regular fa-calendar-check",
      },
      { path: "/vehicles", label: "Xe của tôi", icon: "fa-solid fa-car" },
      {
        path: "/reward-redemption",
        label: "Đổi điểm thưởng",
        icon: "fa-solid fa-gift",
      },
      {
        path: "/loyalty",
        label: "Hạng & Lịch sử điểm",
        icon: "fa-solid fa-award",
      },
    );
  }

  menuItems.push(
    { path: "/profile", label: "Hồ sơ cá nhân", icon: "fa-solid fa-user-gear" },
    { path: "/settings", label: "Cài đặt", icon: "fa-solid fa-gear" },
  );

  return (
    <aside className="portal-sidebar">
      <Link to="/" className="portal-sidebar-brand">
        <img
          src="/logo.png"
          alt="Moto Shine Logo"
          className="sidebar-logo-img"
        />
        <span>Moto Shine</span>
      </Link>

      <Link
        to="/profile"
        className="sidebar-user-info"
        title="Xem hồ sơ cá nhân"
      >
        <div className="sidebar-avatar">{userInitials}</div>
        <div className="sidebar-user-details">
          <span className="sidebar-username">{fullName}</span>
          <span className="sidebar-userrole">
            {role === "admin"
              ? "Quản trị viên"
              : role === "staff"
                ? "Nhân viên"
                : "Thành viên"}
          </span>
        </div>
      </Link>

      <ul className="portal-sidebar-menu">
        {menuItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`portal-menu-item ${isActive ? "active" : ""}`}
              >
                <i className={item.icon}></i>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* ── Khu vực bottom: Giao diện → Đăng xuất ── */}
      <div className="portal-sidebar-bottom">
        <div
          style={{ padding: "0 12px", marginTop: "4px", marginBottom: "8px" }}
        >
          <ThemePanel />
        </div>

        <div className="portal-sidebar-footer">
          <button
            onClick={handleLogout}
            className="portal-menu-item portal-logout-btn-sidebar"
            style={{
              width: "100%",
              border: "none",
              background: "none",
              textAlign: "left",
            }}
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
