import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const API_BASE = "http://127.0.0.1:5000/api";

const getCustomerId = () => {
  const token = localStorage.getItem("token") || localStorage.getItem("TOKEN");
  if (token && token !== "mock-token" && token !== "null" && token !== "undefined") {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.id || payload.userId || null;
    } catch (_) {}
  }
  try {
    const saved = JSON.parse(localStorage.getItem("LOGIN_USER") || "null");
    return saved?.UserID || saved?.userId || saved?.user?.UserID || null;
  } catch (_) {}
  return null;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token") || localStorage.getItem("TOKEN") || "";
  return { Authorization: `Bearer ${token}` };
};

const TYPE_CONFIG = {
  CONFIRMATION: { icon: "fa-calendar-check", color: "#6366f1", bg: "rgba(99,102,241,0.12)", label: "Xác nhận" },
  REMINDER:     { icon: "fa-bell",           color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Nhắc nhở" },
  PAYMENT:      { icon: "fa-credit-card",    color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "Thanh toán" },
  LOYALTY:      { icon: "fa-star",           color: "#ec4899", bg: "rgba(236,72,153,0.12)", label: "Điểm thưởng" },
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

const css = `
.notif-bell-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.notif-bell-btn {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #cbd5e1;
  font-size: 16px;
  transition: all 0.2s ease;
  position: relative;
}

.notif-bell-btn:hover {
  background: rgba(99,102,241,0.15);
  border-color: rgba(99,102,241,0.4);
  color: #a5b4fc;
}

.notif-bell-btn.has-unread {
  color: #a5b4fc;
  border-color: rgba(99,102,241,0.35);
  background: rgba(99,102,241,0.1);
}

.notif-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  min-width: 18px;
  height: 18px;
  border-radius: 99px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid var(--bg-primary, #0f172a);
  animation: notif-pop 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
}

@keyframes notif-pop {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.notif-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 380px;
  background: #1e293b;
  border: 1px solid rgba(99,102,241,0.2);
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03);
  z-index: 9999;
  overflow: hidden;
  animation: notif-slide 0.2s cubic-bezier(0.34,1.1,0.64,1) both;
}

@keyframes notif-slide {
  from { opacity: 0; transform: translateY(-8px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.notif-header h3 {
  font-size: 15px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.notif-header h3 i {
  color: #6366f1;
  font-size: 14px;
}

.notif-mark-all {
  background: none;
  border: none;
  color: #6366f1;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.15s;
  font-family: inherit;
}

.notif-mark-all:hover {
  background: rgba(99,102,241,0.12);
}

.notif-list {
  max-height: 360px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(99,102,241,0.3) transparent;
}

.notif-list::-webkit-scrollbar { width: 4px; }
.notif-list::-webkit-scrollbar-track { background: transparent; }
.notif-list::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 99px; }

.notif-item {
  display: flex;
  gap: 12px;
  padding: 14px 20px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  position: relative;
}

.notif-item:last-child { border-bottom: none; }

.notif-item:hover { background: rgba(255,255,255,0.03); }

.notif-item.unread { background: rgba(99,102,241,0.05); }
.notif-item.unread:hover { background: rgba(99,102,241,0.08); }

.notif-unread-dot {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #6366f1;
  flex-shrink: 0;
}

.notif-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}

.notif-content { flex: 1; min-width: 0; padding-right: 14px; }

.notif-title {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notif-msg {
  font-size: 12px;
  color: #94a3b8;
  margin: 0 0 5px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notif-time {
  font-size: 11px;
  color: #475569;
  font-weight: 500;
}

.notif-type-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 99px;
  margin-bottom: 4px;
}

.notif-empty {
  text-align: center;
  padding: 48px 24px;
  color: #475569;
}

.notif-empty i { font-size: 36px; margin-bottom: 10px; display: block; color: #334155; }
.notif-empty p { margin: 0; font-size: 13px; }

.notif-footer {
  padding: 12px 20px;
  border-top: 1px solid rgba(255,255,255,0.06);
  text-align: center;
}

.notif-footer button {
  background: none;
  border: none;
  color: #6366f1;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.15s;
}

.notif-footer button:hover { background: rgba(99,102,241,0.1); }

.notif-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  gap: 10px;
  color: #64748b;
  font-size: 13px;
}

.notif-spin {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(99,102,241,0.2);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
`;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.IsRead).length;

  const fetchNotifications = useCallback(async () => {
    const userId = getCustomerId();
    if (!userId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/notifications?userId=${userId}`, {
        headers: getAuthHeaders(),
      });
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Inject styles
    const style = document.createElement("style");
    style.innerHTML = css;
    document.head.appendChild(style);
    const icons = document.createElement("link");
    icons.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    icons.rel = "stylesheet";
    document.head.appendChild(icons);
    return () => { style.remove(); };
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll mỗi 60s
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAsRead = async (notifId) => {
    try {
      await axios.patch(`${API_BASE}/notifications/${notifId}/read`, {}, {
        headers: getAuthHeaders(),
      });
      setNotifications(prev =>
        prev.map(n => n.NotificationID === notifId ? { ...n, IsRead: true } : n)
      );
    } catch (err) {
      console.error("Mark read failed:", err);
    }
  };

  const markAllAsRead = async () => {
    const userId = getCustomerId();
    if (!userId) return;
    try {
      await axios.patch(`${API_BASE}/notifications/read-all?userId=${userId}`, {}, {
        headers: getAuthHeaders(),
      });
      setNotifications(prev => prev.map(n => ({ ...n, IsRead: true })));
    } catch (err) {
      console.error("Mark all read failed:", err);
    }
  };

  const handleItemClick = (notif) => {
    if (!notif.IsRead) markAsRead(notif.NotificationID);
  };

  return (
    <div className="notif-bell-wrapper" ref={wrapperRef}>
      <button
        className={`notif-bell-btn ${unreadCount > 0 ? "has-unread" : ""}`}
        onClick={() => setOpen(prev => !prev)}
        title="Thông báo"
      >
        <i className="fa-solid fa-bell"></i>
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          {/* Header */}
          <div className="notif-header">
            <h3>
              <i className="fa-solid fa-bell"></i>
              Thông báo
              {unreadCount > 0 && (
                <span style={{
                  background: "rgba(99,102,241,0.15)",
                  color: "#a5b4fc",
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "99px",
                  fontWeight: 700,
                }}>
                  {unreadCount} mới
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button className="notif-mark-all" onClick={markAllAsRead}>
                Đọc tất cả
              </button>
            )}
          </div>

          {/* Body */}
          <div className="notif-list">
            {loading ? (
              <div className="notif-loading">
                <div className="notif-spin"></div>
                Đang tải...
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <i className="fa-regular fa-bell-slash"></i>
                <p>Chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const cfg = TYPE_CONFIG[notif.Type] || TYPE_CONFIG.CONFIRMATION;
                return (
                  <div
                    key={notif.NotificationID}
                    className={`notif-item ${!notif.IsRead ? "unread" : ""}`}
                    onClick={() => handleItemClick(notif)}
                  >
                    <div
                      className="notif-icon-wrap"
                      style={{ background: cfg.bg, color: cfg.color }}
                    >
                      <i className={`fa-solid ${cfg.icon}`}></i>
                    </div>
                    <div className="notif-content">
                      <div
                        className="notif-type-tag"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </div>
                      <p className="notif-title">{notif.Title}</p>
                      <p className="notif-msg">{notif.Message}</p>
                      <span className="notif-time">
                        <i className="fa-regular fa-clock" style={{ marginRight: 4 }}></i>
                        {timeAgo(notif.CreatedDate)}
                      </span>
                    </div>
                    {!notif.IsRead && <div className="notif-unread-dot"></div>}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="notif-footer">
              <button onClick={fetchNotifications}>
                <i className="fa-solid fa-rotate-right" style={{ marginRight: 6 }}></i>
                Làm mới
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
