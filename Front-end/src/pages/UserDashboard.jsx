// Front-end/src/pages/UserDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import BookingDetails from "../components/BookingDetails";
import "./Dashboard.css";

const API_BASE = "http://localhost:5000/api";

export default function UserDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(45); // Điểm tích lũy (Figma layout)
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Lọc lịch sử giao dịch (Nhiệm vụ của Trọng - Task 7)
  const [historyFilter, setHistoryFilter] = useState("All");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    
    try {
      const decoded = jwtDecode(token);
      setCurrentUser(decoded);
      
      const name = decoded.name || decoded.username || "Nguyễn Hữu Khánh Duy";
      const phone = decoded.phone || "0912345678";
      setCustomerName(name);
      setCustomerPhone(phone);
      
      fetchLoyaltyPoints(token);
      fetchBookings(name, phone);
    } catch (err) {
      localStorage.removeItem("token");
      navigate("/login");
    }
  }, [navigate]);

  const fetchLoyaltyPoints = async (token) => {
    try {
      const res = await axios.get(`${API_BASE}/users/points`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLoyaltyPoints(res.data.points);
    } catch (err) {
      console.error("Không lấy được điểm", err);
    }
  };

  const fetchBookings = async (targetName, targetPhone) => {
    try {
      const res = await axios.get(`${API_BASE}/bookings`);
      const nameToFilter = targetName || customerName;
      const phoneToFilter = targetPhone || customerPhone;

      const userBookings = res.data.filter(b => 
        (phoneToFilter && b.customerPhone === phoneToFilter) || 
        (nameToFilter && b.customerName === nameToFilter)
      );
      setBookings(userBookings);
    } catch (err) {
      console.error("Không lấy được bookings", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleViewDetails = async (booking) => {
    try {
      const res = await axios.get(`${API_BASE}/bookings/${booking.id}`);
      setSelectedBooking(res.data);
    } catch (err) {
      console.error("Không lấy được chi tiết đặt lịch", err);
      setSelectedBooking(booking);
    }
  };

  // Định dạng hiển thị tiền VNĐ
  const formatPrice = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Lọc lịch sử (Nhiệm vụ của Trọng - Task 7)
  const getFilteredBookings = () => {
    let list = [...bookings];
    if (historyFilter === "Active") {
      list = list.filter(b => b.status === "Pending" || b.status === "Confirmed" || b.status === "In Service");
    } else if (historyFilter === "Completed") {
      list = list.filter(b => b.status === "Completed");
    } else if (historyFilter === "Cancelled") {
      list = list.filter(b => b.status === "Cancelled");
    }
    return list;
  };

  const upcomingBookings = bookings.filter(b => b.status === "Confirmed" || b.status === "In Service");
  const filteredHistory = getFilteredBookings();

  return (
    <div style={{ background: "var(--code-bg)", minHeight: "100vh" }}>
      
      {/* Navigation Header */}
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="#aa3bff" />
            <path d="M10 26 L18 10 L26 26" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M13 21 H23" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <h2 style={{ fontSize: "18px", color: "var(--text-h)" }}>AutoWash Pro</h2>
        </div>
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text)" }}>Trang chủ</span>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text)" }}>Đặt lịch</span>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text)" }}>Dịch vụ</span>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--accent)" }}>Thành viên</span>
          <button className="btn-logout" style={{ marginLeft: "10px" }} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* =================== USER PROFILE DASHBOARD VIEW (Nhiệm vụ của Trọng) =================== */}
      <div className="dashboard-container">
        <div className="dashboard-grid">
          
          {/* Cột trái: Profile, Loyalty Tier Card, Upcoming Bookings */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Profile Card & Gold Tier */}
            <div className="dashboard-card" style={{ gap: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", fontSize: "32px" }}>
                  👤
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <h3 style={{ margin: 0, fontSize: "18px", color: "var(--text-h)" }}>{customerName}</h3>
                  <span style={{ fontSize: "13px", color: "var(--text)" }}>SĐT: {customerPhone}</span>
                </div>
              </div>

              {/* Thẻ thành viên Hạng vàng (Figma Gold card) - Nhiệm vụ tích điểm/FSM của Trọng (Task 6) */}
              <div className="loyalty-card-gold">
                <div className="tier-header">
                  <span className="tier-title">Hạng Vàng (Gold)</span>
                  <span>👑 Member Card</span>
                </div>
                <div className="tier-points">{loyaltyPoints} ⭐</div>
                <div className="progress-container">
                  <div className="progress-label">
                    <span>Tới hạng Bạch Kim (Platinum)</span>
                    <span>{loyaltyPoints} / 500 điểm</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${Math.min((loyaltyPoints / 500) * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>

              <button className="btn-primary" style={{ padding: "14px", fontSize: "16px", borderRadius: "12px", background: "#aa3bff", cursor: "default" }}>
                ✨ ĐẶT LỊCH NGAY
              </button>
            </div>

            {/* Lịch rửa xe sắp tới (Task 7) */}
            <div className="dashboard-card">
              <h3 className="card-title">📅 Lịch rửa xe sắp tới</h3>
              {upcomingBookings.length === 0 ? (
                <p style={{ color: "var(--text)", fontSize: "14px", margin: "10px 0" }}>Bạn không có lịch rửa xe nào sắp tới.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {upcomingBookings.map((b) => (
                    <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--bg)", cursor: "pointer" }} onClick={() => handleViewDetails(b)}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontWeight: 700, color: "var(--text-h)", fontSize: "14px" }}>{b.id} - {b.servicePackage}</span>
                        <span style={{ fontSize: "12px", color: "var(--text)" }}>⌚ {new Date(b.scheduledTime).toLocaleString('vi-VN')}</span>
                      </div>
                      <span className={b.status === 'Confirmed' ? 'badge badge-confirmed' : 'badge badge-inservice'}>
                        {b.status === 'Confirmed' ? 'Đã xác nhận' : 'Đang rửa'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Cột phải: Lịch sử đặt lịch & Ưu đãi riêng */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Ưu đãi dành riêng cho bạn */}
            <div className="dashboard-card">
              <h3 className="card-title">🎁 Ưu đãi dành riêng cho bạn</h3>
              <div className="offers-list">
                <div className="offer-card">
                  <div className="offer-info">
                    <span className="offer-title">Giảm 15% gói Rửa Cao Cấp</span>
                    <span className="offer-desc">Áp dụng đến 15/06/2026 cho hạng Vàng trở lên</span>
                  </div>
                  <button className="btn-use-offer" style={{ cursor: "default" }}>Sử dụng</button>
                </div>
                <div className="offer-card">
                  <div className="offer-info">
                    <span className="offer-title">Rửa xe máy bọt tuyết chỉ 20K</span>
                    <span className="offer-desc">Khung giờ vàng 08:00 - 10:00 Thứ 3 hàng tuần</span>
                  </div>
                  <button className="btn-use-offer" style={{ cursor: "default" }}>Sử dụng</button>
                </div>
              </div>
            </div>

            {/* Lịch sử giao dịch gần đây (Task 7) */}
            <div className="dashboard-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", color: "var(--text-h)" }}>📖 Lịch sử giao dịch gần đây</h3>
                <select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)} style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "13px" }}>
                  <option value="All">Tất cả</option>
                  <option value="Active">Đang rửa</option>
                  <option value="Completed">Hoàn thành</option>
                  <option value="Cancelled">Đã hủy</option>
                </select>
              </div>

              <div className="table-wrapper">
                <table className="booking-table">
                  <thead>
                    <tr>
                      <th>Mã đặt</th>
                      <th>Dịch vụ</th>
                      <th>Thời gian hẹn</th>
                      <th>Chi phí</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty-state" style={{ padding: "20px" }}>Chưa có giao dịch nào</td>
                      </tr>
                    ) : (
                      filteredHistory.map((b) => (
                        <tr key={b.id} onClick={() => handleViewDetails(b)} style={{ cursor: "pointer" }}>
                          <td style={{ fontWeight: 600 }}>{b.id}</td>
                          <td>{b.servicePackage}</td>
                          <td>{new Date(b.scheduledTime).toLocaleDateString('vi-VN')}</td>
                          <td>{formatPrice(b.price)}</td>
                          <td>
                            <span className={
                              b.status === 'Completed' ? 'badge badge-completed' :
                              b.status === 'Cancelled' ? 'badge badge-cancelled' :
                              'badge badge-pending'
                            }>
                              {b.status === 'Completed' && 'Hoàn tất'}
                              {b.status === 'Cancelled' && 'Đã hủy'}
                              {b.status === 'Pending' && 'Chờ TT'}
                              {b.status === 'Confirmed' && 'Đã xác nhận'}
                              {b.status === 'In Service' && 'Đang rửa'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Modal chi tiết đặt lịch tiêu chuẩn (Task 7) */}
      {selectedBooking && (
        <BookingDetails 
          booking={selectedBooking} 
          onClose={() => {
            setSelectedBooking(null);
            fetchBookings();
          }}
          isAdmin={false}
        />
      )}

    </div>
  );
}
