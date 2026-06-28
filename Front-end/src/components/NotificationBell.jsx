import React, { useState, useEffect, useRef, useCallback } from "react";
import "./NotificationBell.css";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Lấy userId từ localStorage
  const getUserId = () => {
    try {
      const saved = localStorage.getItem("LOGIN_USER");
      const token = localStorage.getItem("TOKEN");
      if (!token) return null;
      // Decode JWT lấy userId
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload?.userId || payload?.id || payload?.UserID || null;
    } catch {
      return null;
    }
  };

  // Gọi API lấy danh sách thông báo
  const fetchNotifications = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/notifications?userId=${userId}`);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[NotificationBell] Lỗi lấy thông báo:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Gọi API đánh dấu đã đọc
  const markAsRead = async (notificationId) => {
    try {
      await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
        method: "PUT",
      });
      // Cập nhật state local ngay không cần fetch lại
      setNotifications((prev) =>
        prev.map((n) =>
          n.NotificationID === notificationId ? { ...n, IsRead: true } : n
        )
      );
    } catch (err) {
      console.error("[NotificationBell] Lỗi đánh dấu đã đọc:", err);
    }
  };

  // Đánh dấu tất cả đã đọc
  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.IsRead);
    await Promise.all(unread.map((n) => markAsRead(n.NotificationID)));
  };

  // Mở dropdown thì fetch mới nhất
  const toggleDropdown = () => {
    if (!open) fetchNotifications();
    setOpen((prev) => !prev);
  };

  // Click ra ngoài thì đóng dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-fetch khi mount (để badge hiện đúng số)
  useEffect(() => {
    fetchNotifications();
    // Polling mỗi 5 phút để đồng bộ với cron job backend
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.IsRead).length;

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return date.toLocaleDateString("vi-VN");
  };

  const getIcon = (type) => {
    switch (type) {
      case "REMINDER": return "fa-solid fa-clock";
      case "BOOKING":  return "fa-solid fa-calendar-check";
      case "PAYMENT":  return "fa-solid fa-credit-card";
      case "CANCEL":   return "fa-solid fa-circle-xmark";
      default:         return "fa-solid fa-bell";
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case "REMINDER": return "#f59e0b";
      case "BOOKING":  return "#3b82f6";
      case "PAYMENT":  return "#10b981";
      case "CANCEL":   return "#ef4444";
      default:         return "#8b5cf6";
    }
  };

  return (
    <div className="noti-bell-wrapper" ref={dropdownRef}>
      {/* Nút quả chuông */}
      <button
        className={`noti-bell-btn ${open ? "active" : ""}`}
        onClick={toggleDropdown}
        title="Thông báo"
        aria-label="Thông báo"
      >
        <i className="fa-solid fa-bell"></i>
        {unreadCount > 0 && (
          <span className="noti-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="noti-dropdown">
          {/* Header dropdown */}
          <div className="noti-dropdown-header">
            <span className="noti-dropdown-title">
              <i className="fa-solid fa-bell"></i> Thông báo
              {unreadCount > 0 && (
                <span className="noti-unread-chip">{unreadCount} chưa đọc</span>
              )}
            </span>
            {unreadCount > 0 && (
              <button className="noti-mark-all-btn" onClick={markAllAsRead}>
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {/* Danh sách thông báo */}
          <div className="noti-list">
            {loading ? (
              <div className="noti-empty">
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>Đang tải...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="noti-empty">
                <i className="fa-solid fa-bell-slash"></i>
                <span>Chưa có thông báo nào</span>
              </div>
            ) : (
              notifications.map((noti) => (
                <div
                  key={noti.NotificationID}
                  className={`noti-item ${!noti.IsRead ? "unread" : ""}`}
                  onClick={() => !noti.IsRead && markAsRead(noti.NotificationID)}
                >
                  {/* Icon loại thông báo */}
                  <div
                    className="noti-item-icon"
                    style={{ background: getIconColor(noti.Type) + "22", color: getIconColor(noti.Type) }}
                  >
                    <i className={getIcon(noti.Type)}></i>
                  </div>

                  {/* Nội dung */}
                  <div className="noti-item-content">
                    <p className="noti-item-title">{noti.Title}</p>
                    <p className="noti-item-message">{noti.Message}</p>
                    <span className="noti-item-time">
                      <i className="fa-regular fa-clock"></i>
                      {formatTime(noti.CreatedDate)}
                    </span>
                  </div>

                  {/* Chấm chưa đọc */}
                  {!noti.IsRead && <span className="noti-unread-dot"></span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
