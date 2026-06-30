import React, { useState, useEffect, useRef, useCallback } from "react";
import "./NotificationBell.css";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef(null);

  // Lấy userId từ JWT trong localStorage
  const getUserId = () => {
    try {
      const token = localStorage.getItem("TOKEN");
      if (!token) return null;
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
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/notifications?userId=${userId}`
      );
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[NotificationBell] Lỗi lấy thông báo:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Đánh dấu một thông báo đã đọc
  const markAsRead = async (notificationId) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/notifications/${notificationId}/read`,
        { method: "PUT" }
      );
      if (!res.ok) throw new Error("HTTP " + res.status);
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
    if (unread.length === 0) return;
    setMarkingAll(true);
    try {
      await Promise.all(unread.map((n) => markAsRead(n.NotificationID)));
    } finally {
      setMarkingAll(false);
    }
  };

  // Toggle dropdown và fetch mới nhất khi mở
  const toggleDropdown = () => {
    if (!open) fetchNotifications();
    setOpen((prev) => !prev);
  };

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-fetch khi mount + polling 5 phút để đồng bộ cron job backend
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Lắng nghe sự kiện noti:refresh để cập nhật ngay lập tức
  // (bắn ra từ các trang đặt lịch / hủy lịch / thanh toán khi thao tác thành công)
  useEffect(() => {
    const handleRefresh = () => fetchNotifications();
    window.addEventListener("noti:refresh", handleRefresh);
    return () => window.removeEventListener("noti:refresh", handleRefresh);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.IsRead).length;

  // Format thời gian tiếng Việt
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
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  };

  // Icon theo loại thông báo
  const getIcon = (type) => {
    const icons = {
      REMINDER: "fa-solid fa-clock",
      BOOKING:  "fa-solid fa-calendar-check",
      PAYMENT:  "fa-solid fa-credit-card",
      CANCEL:   "fa-solid fa-circle-xmark",
      LOYALTY:  "fa-solid fa-star",
    };
    return icons[type] || "fa-solid fa-bell";
  };

  // Màu sắc theo loại thông báo (CSS class)
  const getTypeClass = (type) => {
    const classes = {
      REMINDER: "type-reminder",
      BOOKING:  "type-booking",
      PAYMENT:  "type-payment",
      CANCEL:   "type-cancel",
      LOYALTY:  "type-loyalty",
    };
    return classes[type] || "type-default";
  };

  return (
    <div className="noti-bell-wrapper" ref={dropdownRef}>
      {/* Nút chuông */}
      <button
        className={`noti-bell-btn${open ? " active" : ""}`}
        onClick={toggleDropdown}
        aria-label="Thông báo"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <i className="fa-solid fa-bell" aria-hidden="true"></i>
        {unreadCount > 0 && (
          <span className="noti-badge" aria-label={`${unreadCount} thông báo chưa đọc`}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="noti-dropdown" role="dialog" aria-label="Danh sách thông báo">
          {/* Header */}
          <div className="noti-dropdown-header">
            <div className="noti-header-left">
              <span className="noti-dropdown-title">Thông báo</span>
              {unreadCount > 0 && (
                <span className="noti-unread-chip">{unreadCount} chưa đọc</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                className="noti-mark-all-btn"
                onClick={markAllAsRead}
                disabled={markingAll}
                aria-label="Đánh dấu tất cả đã đọc"
              >
                {markingAll ? (
                  <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Đang xử lý...</>
                ) : (
                  <><i className="fa-solid fa-check-double" aria-hidden="true"></i> Đánh dấu tất cả</>
                )}
              </button>
            )}
          </div>

          {/* Danh sách */}
          <div className="noti-list" role="list">
            {loading ? (
              <div className="noti-empty">
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                <span>Đang tải thông báo...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="noti-empty">
                <i className="fa-solid fa-bell-slash" aria-hidden="true"></i>
                <span>Chưa có thông báo nào</span>
              </div>
            ) : (
              notifications.map((noti) => (
                <div
                  key={noti.NotificationID}
                  className={`noti-item${!noti.IsRead ? " unread" : ""}`}
                  onClick={() => !noti.IsRead && markAsRead(noti.NotificationID)}
                  role="listitem"
                  tabIndex={!noti.IsRead ? 0 : undefined}
                  onKeyDown={(e) => e.key === "Enter" && !noti.IsRead && markAsRead(noti.NotificationID)}
                  aria-label={`${noti.Title}${!noti.IsRead ? " - chưa đọc" : ""}`}
                >
                  <div className={`noti-item-icon ${getTypeClass(noti.Type)}`} aria-hidden="true">
                    <i className={getIcon(noti.Type)}></i>
                  </div>

                  <div className="noti-item-content">
                    <p className="noti-item-title">{noti.Title}</p>
                    <p className="noti-item-message">{noti.Message}</p>
                    <span className="noti-item-time">
                      <i className="fa-regular fa-clock" aria-hidden="true"></i>
                      {formatTime(noti.CreatedDate)}
                    </span>
                  </div>

                  {!noti.IsRead && (
                    <span className="noti-unread-dot" aria-hidden="true"></span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="noti-dropdown-footer">
              <button className="noti-refresh-btn" onClick={fetchNotifications} aria-label="Làm mới thông báo">
                <i className="fa-solid fa-rotate-right" aria-hidden="true"></i>
                Làm mới
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
