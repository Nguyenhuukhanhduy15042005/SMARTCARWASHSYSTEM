// Front-end/src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import BookingDetails from "../components/BookingDetails";
import "./Dashboard.css";

const API_BASE = "http://localhost:5000/api";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  
  // States cho danh sách & bộ lọc
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Chi tiết booking được chọn
  const [selectedBooking, setSelectedBooking] = useState(null);
  const selectedBookingRef = React.useRef(null);
  selectedBookingRef.current = selectedBooking;
  
  // Trạng thái thông báo
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    
    try {
      const decoded = jwtDecode(token);
      if (decoded.role !== "admin") {
        navigate("/unauthorized");
        return;
      }
      setCurrentUser(decoded);
      fetchBookings();
    } catch (err) {
      localStorage.removeItem("token");
      navigate("/login");
    }
  }, [navigate]);

  // Cập nhật tự động mỗi 10 giây và tải lại dữ liệu khi bộ lọc thay đổi
  useEffect(() => {
    fetchBookings(); // Tải dữ liệu ngay lập tức khi bộ lọc thay đổi
    const interval = setInterval(() => {
      fetchBookings();
    }, 10000);
    return () => clearInterval(interval);
  }, [statusFilter, startDate, endDate, searchQuery]);

  const fetchBookings = async () => {
    try {
      const params = {};
      if (statusFilter !== "All") params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (searchQuery) params.search = searchQuery;

      const res = await axios.get(`${API_BASE}/bookings`, { params });
      setBookings(res.data);
      
      // Đồng bộ thông tin booking đang mở chi tiết (nếu có) bằng ref để tránh lỗi closure
      if (selectedBookingRef.current) {
        const updated = res.data.find(b => b.id === selectedBookingRef.current.id);
        if (updated) setSelectedBooking(updated);
      }
    } catch (err) {
      console.error("Không lấy được danh sách đặt lịch", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Lấy chi tiết lịch đặt kèm lịch sử hoạt động từ API
  const handleViewDetails = async (booking) => {
    try {
      const res = await axios.get(`${API_BASE}/bookings/${booking.id}`);
      setSelectedBooking(res.data);
    } catch (err) {
      console.error("Không lấy được chi tiết đặt lịch", err);
      setSelectedBooking(booking);
    }
  };

  // Điều phối chuyển đổi trạng thái (State Machine - Task 6)
  const handleTransition = async (bookingId, action, note) => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await axios.post(`${API_BASE}/bookings/${bookingId}/transition`, { action, note });
      setSuccessMsg(`Cập nhật trạng thái booking ${bookingId} thành công!`);
      
      // Lấy chi tiết đặt lịch mới nhất để cập nhật modal
      const updatedRes = await axios.get(`${API_BASE}/bookings/${bookingId}`);
      setSelectedBooking(updatedRes.data);
      fetchBookings();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Lỗi chuyển đổi trạng thái");
    }
  };

  // Tính toán các chỉ số thống kê (KPIs)
  const getKPIs = () => {
    const counts = {
      total: bookings.length,
      pending: bookings.filter(b => b.status === "Pending").length,
      confirmed: bookings.filter(b => b.status === "Confirmed").length,
      inservice: bookings.filter(b => b.status === "In Service").length,
      completed: bookings.filter(b => b.status === "Completed").length,
      cancelled: bookings.filter(b => b.status === "Cancelled").length
    };
    return counts;
  };

  const kpis = getKPIs();

  // Định dạng hiển thị tiền VNĐ
  const formatPrice = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div style={{ background: "var(--code-bg)", minHeight: "100svh" }}>
      {/* Navigation Header */}
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="#aa3bff" />
            <path d="M10 26 L18 10 L26 26" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M13 21 H23" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <h2>AutoWash Pro</h2>
          <span className="user-tag" style={{ background: "#fee2e2", color: "#dc2626", borderColor: "#fca5a5" }}>Nhân Viên Vận Hành</span>
        </div>
        <div className="nav-user">
          <span style={{ fontWeight: 600, color: "var(--text-h)" }}>
            🛠️ Admin Console
          </span>
          <button className="btn-logout" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </nav>

      <div className="dashboard-container">
        {/* KPI Statistics */}
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "var(--accent-bg)" }}>📊</div>
            <div className="stat-info">
              <span className="stat-value">{kpis.total}</span>
              <span className="stat-label">Tổng lượt đặt</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#fef3c7" }}>⏳</div>
            <div className="stat-info">
              <span className="stat-value" style={{ color: "#d97706" }}>{kpis.pending}</span>
              <span className="stat-label">Chờ thanh toán</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#dbeafe" }}>✅</div>
            <div className="stat-info">
              <span className="stat-value" style={{ color: "#2563eb" }}>{kpis.confirmed}</span>
              <span className="stat-label">Đã xác nhận</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#f3e8ff" }}>🚗</div>
            <div className="stat-info">
              <span className="stat-value" style={{ color: "#7c3aed" }}>{kpis.inservice}</span>
              <span className="stat-label">Đang rửa xe</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#d1fae5" }}>🏁</div>
            <div className="stat-info">
              <span className="stat-value" style={{ color: "#059669" }}>{kpis.completed}</span>
              <span className="stat-label">Đã hoàn tất</span>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && <div className="badge badge-cancelled" style={{ padding: "12px", width: "100%", boxSizing: "border-box", borderRadius: "8px" }}>⚠️ {errorMsg}</div>}
        {successMsg && <div className="badge badge-completed" style={{ padding: "12px", width: "100%", boxSizing: "border-box", borderRadius: "8px" }}>🎉 {successMsg}</div>}

        {/* Bảng quản trị chính */}
        <div className="dashboard-card" style={{ gap: "16px" }}>
          <h3 className="card-title">📋 Quản lý lịch rửa xe toàn trạm</h3>

          {/* Thanh lọc & tìm kiếm nâng cao */}
          <div className="filters-bar">
            {/* Search */}
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Tìm tên, SĐT hoặc mã đặt lịch..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
              />
            </div>

            {/* Trạng thái */}
            <div className="filter-item">
              <label>Trạng thái</label>
              <select value={statusFilter} onChange={(e) => {
                setStatusFilter(e.target.value);
              }}>
                <option value="All">Tất cả</option>
                <option value="Pending">Chờ thanh toán</option>
                <option value="Confirmed">Đã xác nhận</option>
                <option value="In Service">Đang rửa xe</option>
                <option value="Completed">Hoàn tất</option>
                <option value="Cancelled">Đã hủy</option>
              </select>
            </div>

            {/* Từ ngày */}
            <div className="filter-item">
              <label>Từ ngày</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => {
                  setStartDate(e.target.value);
                }}
              />
            </div>

            {/* Đến ngày */}
            <div className="filter-item">
              <label>Đến ngày</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => {
                  setEndDate(e.target.value);
                }}
              />
            </div>

            {/* Nút xóa lọc */}
            {(statusFilter !== "All" || startDate || endDate || searchQuery) && (
              <button 
                className="btn-logout" 
                style={{ alignSelf: "flex-end", padding: "6px 12px" }}
                onClick={() => {
                  setStatusFilter("All");
                  setStartDate("");
                  setEndDate("");
                  setSearchQuery("");
                }}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          {/* Bảng dữ liệu */}
          <div className="table-wrapper">
            <table className="booking-table">
              <thead>
                <tr>
                  <th>Mã đặt</th>
                  <th>Khách hàng</th>
                  <th>Số điện thoại</th>
                  <th>Ngày hẹn</th>
                  <th>Phương tiện</th>
                  <th>Khoang (Bay)</th>
                  <th>Chi phí</th>
                  <th>Trạng thái</th>
                  <th>Thanh toán</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="empty-state">
                      <span>📭 Không tìm thấy booking nào trong hệ thống.</span>
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td style={{ fontWeight: 600, color: "var(--text-h)" }}>{booking.id}</td>
                      <td style={{ fontWeight: 500, color: "var(--text-h)" }}>{booking.customerName}</td>
                      <td>{booking.customerPhone}</td>
                      <td>{new Date(booking.scheduledTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                      <td>{booking.vehicleType === 'CAR' ? '🚗 Ô tô' : '🏍️ Xe máy'}</td>
                      <td>
                        <span className="badge" style={{ background: "var(--code-bg)", color: "var(--text-h)" }}>
                          {booking.machineId ? `Bay ${booking.machineId}` : 'Chưa gán'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{formatPrice(booking.price)}</td>
                      <td>
                        <span className={
                          booking.status === 'Pending' ? 'badge badge-pending' :
                          booking.status === 'Confirmed' ? 'badge badge-confirmed' :
                          booking.status === 'In Service' ? 'badge badge-inservice' :
                          booking.status === 'Completed' ? 'badge badge-completed' :
                          'badge badge-cancelled'
                        }>
                          {booking.status === 'Pending' && 'Chờ thanh toán'}
                          {booking.status === 'Confirmed' && 'Đã xác nhận'}
                          {booking.status === 'In Service' && 'Đang rửa xe'}
                          {booking.status === 'Completed' && 'Hoàn thành'}
                          {booking.status === 'Cancelled' && 'Đã hủy'}
                        </span>
                      </td>
                      <td>
                        <span className={
                          booking.paymentStatus === 'Unpaid' ? 'badge badge-unpaid' :
                          booking.paymentStatus === 'Paid' ? 'badge badge-paid' :
                          'badge badge-refunded'
                        }>
                          {booking.paymentStatus === 'Unpaid' && 'Chưa'}
                          {booking.paymentStatus === 'Paid' && 'Đã thanh toán'}
                          {booking.paymentStatus === 'Refunded' && 'Đã hoàn tiền'}
                          {booking.paymentStatus === 'Cancelled' && 'Hủy'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-primary" 
                          style={{ padding: "6px 12px", fontSize: "13px" }}
                          onClick={() => handleViewDetails(booking)}
                        >
                          👁️ Chi tiết & Vận hành
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal chi tiết & kiểm soát trạng thái */}
      {selectedBooking && (
        <BookingDetails 
          booking={selectedBooking} 
          onClose={() => {
            setSelectedBooking(null);
            fetchBookings();
          }}
          isAdmin={true}
          onTransition={handleTransition}
        />
      )}
    </div>
  );
}
