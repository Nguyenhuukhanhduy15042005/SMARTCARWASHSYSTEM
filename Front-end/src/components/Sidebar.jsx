import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("LOGIN_USER");
    return saved ? JSON.parse(saved) : null;
  });

  // Dynamically load Plus Jakarta Sans and FontAwesome icons globally
  useEffect(() => {
    const linkFont = document.createElement("link");
    linkFont.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap";
    linkFont.rel = "stylesheet";
    document.head.appendChild(linkFont);

    const linkIcons = document.createElement("link");
    linkIcons.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    linkIcons.rel = "stylesheet";
    document.head.appendChild(linkIcons);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("TOKEN");
    localStorage.removeItem("token");
    localStorage.removeItem("LOGIN_USER");
    navigate("/login");
  };

  const role = currentUser?.role || "user";
  const fullName = currentUser?.fullName || "Người dùng";
  const userInitials = fullName ? fullName.substring(0, 2).toUpperCase() : "US";

  // Define menu items dynamically based on role
  const menuItems = [];

  if (role === "admin") {
    menuItems.push(
      { path: "/admin/dashboard", label: "Trang chủ", icon: "fa-solid fa-chart-line" },
      { path: "/timeslots", label: "Bàn làm việc", icon: "fa-solid fa-car-side" },
      { path: "/admin/members", label: "Khách hàng", icon: "fa-solid fa-users" }
    );
  } else if (role === "staff") {
    menuItems.push(
      { path: "/staff/dashboard", label: "Trang chủ", icon: "fa-solid fa-chart-line" },
      { path: "/timeslots", label: "Bàn làm việc", icon: "fa-solid fa-car-side" },
      { path: "/admin/members", label: "Khách hàng", icon: "fa-solid fa-users" }
    );
  } else {
    // Member / Normal User
    menuItems.push(
      { path: "/dashboard", label: "Trang chủ", icon: "fa-solid fa-chart-line" },
      { path: "/booking", label: "Đặt lịch", icon: "fa-regular fa-calendar-check" },
      { path: "/vehicles", label: "Xe của tôi", icon: "fa-solid fa-car" }
    );
  }

  // Profile link is shared across all roles
  menuItems.push({ path: "/profile", label: "Hồ sơ cá nhân", icon: "fa-solid fa-user-gear" });

  return (
    <>
      <div className="floating-logo-trigger" title="Mở menu điều hướng">
        <img src="/logo.png" alt="Moto Shine Logo" className="floating-logo-img" />
      </div>
      <aside className="admin-sidebar">
        {/* Brand header */}
        <Link to="/" className="admin-sidebar-brand">
          <img src="/logo.png" alt="Moto Shine Logo" className="sidebar-logo-img" />
          <span>Moto Shine</span>
        </Link>

      {/* User account details card */}
      <Link to="/profile" className="sidebar-user-info" title="Xem hồ sơ cá nhân">
        <div className="sidebar-avatar">{userInitials}</div>
        <div className="sidebar-user-details">
          <span className="sidebar-username">{fullName}</span>
          <span className="sidebar-userrole">
            {role === "admin" ? "Quản trị viên" : role === "staff" ? "Nhân viên" : "Thành viên"}
          </span>
        </div>
      </Link>

      {/* Menu items */}
      <ul className="admin-sidebar-menu">
        {menuItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <li key={item.path}>
              <Link to={item.path} className={`admin-menu-item ${isActive ? "active" : ""}`}>
                <i className={item.icon}></i>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Footer logout */}
      <div className="admin-sidebar-footer">
        <button onClick={handleLogout} className="admin-menu-item logout-btn-sidebar" style={{ width: "100%", border: "none", background: "none", textAlign: "left" }}>
          <i className="fa-solid fa-arrow-right-from-bracket"></i>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
    </>
  );
}
