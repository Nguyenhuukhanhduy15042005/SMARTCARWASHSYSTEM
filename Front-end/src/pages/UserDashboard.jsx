import React, { useState, useEffect } from "react";
import "./UserDashboard.css";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { Link, useNavigate } from "react-router-dom"; // Trọng thêm
import Sidebar from "../components/Sidebar";

const API_BASE = "/api";

export default function UserDashboard() {
  const navigate = useNavigate(); // Trọng thêm
  const [bookings, setBookings] = useState([]);
  const [paidBookingIds, setPaidBookingIds] = useState(new Set());
  const [paidBookingMethods, setPaidBookingMethods] = useState(new Map());
  const [profile, setProfile] = useState({ 
    UserID: 12, 
    FullName: "Khách hàng", 
    PhoneNumber: "", 
    Email: "", 
    CurrentPoints: 0, 
    AccumulatedPoints: 0, 
    TierName: "Standard", 
    DiscountRate: 0 
  });
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [toast, setToast] = useState(null);
  const [feedbackBooking, setFeedbackBooking] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");

  // Decode customer ID from localStorage token, fallback to ID 12 for direct testing
  const getCustomerId = () => {
    const token = localStorage.getItem("token");
    if (token && token !== "mock-token" && token !== "null" && token !== "undefined") {
      try {
        const decoded = jwtDecode(token);
        return decoded.id || decoded.userId || 12;
      } catch (err) {
        console.error("Error decoding token:", err);
      }
    }
    return 12; // Fallback customer ID with rich data
  };

  useEffect(() => {
    const linkFont = document.createElement("link");
    linkFont.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap";
    linkFont.rel = "stylesheet";
    document.head.appendChild(linkFont);

    const linkIcons = document.createElement("link");
    linkIcons.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    linkIcons.rel = "stylesheet";
    document.head.appendChild(linkIcons);

    fetchData();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    const userId = getCustomerId();
    const token = localStorage.getItem("token") || "mock-token";
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // 1. Fetch user profile
      const profileRes = await axios.get(`${API_BASE}/users/profile?userId=${userId}`, { headers });
      const rawProfile = profileRes.data;
      if (rawProfile) {
        setProfile({
          UserID: rawProfile.UserID !== undefined ? rawProfile.UserID : (rawProfile.userId || userId),
          FullName: rawProfile.FullName || rawProfile.fullName || rawProfile.message || "Khách hàng",
          PhoneNumber: rawProfile.PhoneNumber || rawProfile.phoneNumber || "",
          Email: rawProfile.Email || rawProfile.email || "",
          CurrentPoints: rawProfile.CurrentPoints !== undefined ? rawProfile.CurrentPoints : (rawProfile.currentPoints || 0),
          AccumulatedPoints: rawProfile.AccumulatedPoints !== undefined ? rawProfile.AccumulatedPoints : (rawProfile.accumulatedPoints || 0),
          TierName: rawProfile.TierName || rawProfile.tierName || "Standard",
          DiscountRate: rawProfile.DiscountRate !== undefined ? rawProfile.DiscountRate : (rawProfile.discountRate || 0)
        });
      }

      // 2. Fetch customer bookings
      const bookingsRes = await axios.get(`${API_BASE}/bookings?customerId=${userId}`, { headers });
      const rawBookings = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
      const normalizedBookings = rawBookings.map(b => {
        // Safe date-time parsing for old structures
        let dateStr = b.date || "";
        let timeStr = b.time || "";
        if (!dateStr && b.BookingDate) {
          const d = new Date(b.BookingDate);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
          
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          timeStr = `${hours}:${minutes}`;
        }
        return {
          id: b.id !== undefined ? b.id : b.BookingID,
          customerName: b.customerName || b.CustomerName,
          phone: b.phone || b.CustomerPhone,
          vehicleType: b.vehicleType || b.VehicleType,
          licensePlate: b.licensePlate || b.LicensePlate,
          price: b.price !== undefined ? b.price : (b.FinalPrice || b.TotalPrice || 0),
          status: b.status !== undefined ? b.status : b.Status,
          date: dateStr,
          time: timeStr,
          servicePackage: b.servicePackage || b.ServiceName || "N/A"
        };
      });
      setBookings(normalizedBookings);

      // Lấy danh sách BookingID đã thanh toán
      try {
        const paymentsRes = await axios.get(`${API_BASE}/payments/history?limit=100`, { headers });
        const paymentsData = paymentsRes.data?.data || [];
        const paidIds = new Set(paymentsData.map(p => p.BookingID));
        const methodMap = new Map(paymentsData.map(p => [p.BookingID, p.Method]));
        setPaidBookingIds(paidIds);
        setPaidBookingMethods(methodMap);
      } catch (e) {
        // Không chặn luồng chính nếu lấy payment history lỗi
      }
    } catch (err) {
      console.error("Failed to connect to database API:", err);
      const errMsg = err.response?.data?.message || err.message;
      showToast(`Không thể kết nối CSDL: ${errMsg}. Vui lòng chạy Server!`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Customer cancels their booking (Status = 5)
  const handleCancelBooking = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đặt lịch rửa xe này không?")) {
      return;
    }

    const token = localStorage.getItem("token") || "mock-token";
    const headers = { Authorization: `Bearer ${token}` };

    try {
      await axios.post(`${API_BASE}/bookings/${id}/transition`, { nextStatus: 5 }, { headers }); // Trọng thêm: Đổi từ status thành nextStatus để khớp với backend
      showToast("Đã hủy lịch đặt xe thành công!", "success");
      
      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking({ ...selectedBooking, status: 5 });
      }
      
      fetchData(); // Refresh list
    } catch (err) {
      console.error("Failed to cancel booking:", err);
      const errMsg = err.response?.data?.message || err.message;
      showToast(`Không thể hủy lịch: ${errMsg}`, "error");
    }
  };

  // Customer deletes completed/cancelled booking permanently
  const handleDeleteBooking = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn lịch đặt xe này khỏi lịch sử không? Hành động này không thể hoàn tác!")) {
      return;
    }

    const token = localStorage.getItem("token") || "mock-token";
    const headers = { Authorization: `Bearer ${token}` };

    try {
      await axios.delete(`${API_BASE}/bookings/${id}`, { headers });
      showToast("Xóa lịch đặt xe thành công!", "success");
      
      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking(null);
      }
      
      fetchData(); // Refresh list
    } catch (err) {
      console.error("Failed to delete booking:", err);
      const errMsg = err.response?.data?.message || err.message;
      showToast(`Không thể xóa: ${errMsg}`, "error");
    }
  };

  const handleSubmitFeedback = async () => {
  if (!feedbackBooking) return;

  if (!feedbackRating || feedbackRating < 1 || feedbackRating > 5) {
    showToast("Vui lòng chọn số sao từ 1 đến 5.", "error");
    return;
  }

  if (!feedbackComment.trim()) {
    showToast("Vui lòng nhập nội dung đánh giá.", "error");
    return;
  }

  const token = localStorage.getItem("token") || "mock-token";
  const headers = { Authorization: `Bearer ${token}` };

  try {
    await axios.post(
      `${API_BASE}/feedbacks`,
      {
        bookingId: feedbackBooking.id,
        rating: feedbackRating,
        comment: feedbackComment.trim(),
      },
      { headers }
    );

    showToast("Gửi đánh giá thành công! Cảm ơn bạn đã phản hồi.", "success");
    setFeedbackBooking(null);
    setFeedbackRating(5);
    setFeedbackComment("");
  } catch (err) {
    console.error("Failed to submit feedback:", err);
    const errMsg = err.response?.data?.message || err.message;
    showToast(`Không thể gửi đánh giá: ${errMsg}`, "error");
  }
};

  const getStatusPill = (status, bookingId) => {
    if (status === 2 && paidBookingIds.has(bookingId)) {
      if (paidBookingMethods.get(bookingId) === "cash") {
        return <span className="status-pill status-deposit" style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", border: "1px solid rgba(249,115,22,0.3)" }}><i className="fa-solid fa-coins"></i> Đã đặt cọc</span>;
      }
      return <span className="status-pill status-paid" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}><i className="fa-solid fa-circle-check"></i> Đã thanh toán</span>;
    }
    switch (status) {
      case 1: return <span className="status-pill status-pending" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}><i className="fa-regular fa-clock"></i> Chờ cọc/thanh toán</span>;
      case 2: return <span className="status-pill status-confirmed"><i className="fa-solid fa-check"></i> Đã xác nhận</span>;
      case 3: return <span className="status-pill status-inservice"><i className="fa-solid fa-arrows-spin fa-spin"></i> Đang rửa</span>;
      case 4: return <span className="status-pill status-completed"><i className="fa-regular fa-circle-check"></i> Hoàn thành</span>;
      case 5: return <span className="status-pill status-cancelled"><i className="fa-regular fa-circle-xmark"></i> Đã hủy</span>;
      default: return <span className="status-pill">{status}</span>;
    }
  };

  const getVehicleIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "xe máy":
      case "motorcycle":
      case "bike":
      case "moto":
        return <i className="fa-solid fa-motorcycle"></i>;
      default:
        return <i className="fa-solid fa-car"></i>;
    }
  };

  const getTierClass = (tier) => {
    switch (tier?.toLowerCase()) {
      case "platinum": return "tier-platinum";
      case "gold": return "tier-gold";
      case "silver": return "tier-silver";
      default: return "tier-standard";
    }
  };

  const goToPayment = (booking) => { // Trọng thêm
    navigate("/payments", {
      state: {
        booking: {
          BookingID:   booking.id,
          ServiceName: booking.servicePackage,
          Date:        booking.date,
          Time:        booking.time,
          TotalPrice:  booking.price,
          LicensePlate: booking.licensePlate,
        }
      }
    });
  };

  // Filter bookings based on active status tab
  const filteredBookings = bookings.filter(b => {
    if (selectedStatus === "All") return true;
    if (selectedStatus === "Active") return b.status === 1 || b.status === 2 || b.status === 3;
    if (selectedStatus === "Completed") return b.status === 4;
    if (selectedStatus === "Cancelled") return b.status === 5;
    return true;
  });

  // Calculate metrics
  const activeCount = bookings.filter(b => b.status === 1 || b.status === 2 || b.status === 3).length;
  const completedCount = bookings.filter(b => b.status === 4).length;
  const totalSpend = bookings.filter(b => b.status === 4).reduce((acc, b) => acc + (b.price || 0), 0);

  // Fix: Nếu API trả CurrentPoints/AccumulatedPoints = 0 nhưng có đơn hoàn thành,
  // tự tính từ bookings (1.000đ = 1 điểm)
  const computedPoints = bookings
    .filter(b => b.status === 4)
    .reduce((sum, b) => sum + Math.floor((b.price || 0) / 1000), 0);
  const displayCurrentPoints = profile.CurrentPoints > 0 ? profile.CurrentPoints : computedPoints;
  const displayAccumulatedPoints = profile.AccumulatedPoints > 0 ? profile.AccumulatedPoints : computedPoints;

  return (
    <div className="portal-layout-container">
      <Sidebar />

      {/* Main Wrapper - Trọng thêm */}
      <main className="portal-main-content">
        <section className="welcome-section">
          <h1>Xin Chào, {profile.FullName}!</h1>
          <p>Chào mừng quay trở lại. Theo dõi trạng thái đặt lịch và hạng thành viên của bạn.</p>
        </section>

        {/* Profile Card grid */}
        <section className="user-profile-grid">
          {/* Card 1: Membership Glowing Card */}
          <div className={`membership-card-glow ${getTierClass(profile.TierName)}`}>
            <div className="card-top">
              <span className="card-label">Thẻ Thành Viên</span>
              <div className="card-logo">
                <i className="fa-solid fa-gem"></i> MOTO SHINE
              </div>
            </div>
            <div className="card-middle">
              <div className="points-display">
                <span className="points-label">Điểm tích lũy hiện tại</span>
                <span className="points-value">
                  {displayCurrentPoints} <span>PTS</span>
                </span>
              </div>
            </div>
            <div className="card-bottom">
              <div className="member-info">
                <h4>{profile.FullName}</h4>
                <p>ID tài khoản: #{profile.UserID}</p>
              </div>
              <span className="member-tier-badge">{profile.TierName}</span>
            </div>
          </div>

          {/* Card 2: Profile details */}
          <div className="user-profile-details">
            <h3>Thông Tin Tài Khoản</h3>
            <div className="profile-fields-list">
              <div className="profile-field-row">
                <span>Số điện thoại:</span>
                <strong>
                  {!profile.PhoneNumber || profile.PhoneNumber.startsWith("G-") ? (
                    <Link
                      to="/profile"
                      style={{ color: "var(--color-danger)", fontWeight: "bold", textDecoration: "underline", cursor: "pointer" }}
                      title="Click để cập nhật số điện thoại"
                    >
                      Cần cập nhật số điện thoại
                    </Link>
                  ) : (
                    profile.PhoneNumber
                  )}
                </strong>
              </div>
              <div className="profile-field-row">
                <span>Email liên hệ:</span>
                <strong>{profile.Email || "Chưa cập nhật"}</strong>
              </div>
              <div className="profile-field-row">
                <span>Tổng tích lũy:</span>
                <strong>{displayAccumulatedPoints} PTS</strong>
              </div>
              <div className="profile-field-row">
                <span>Hạng ưu đãi:</span>
                <strong style={{ color: "var(--color-accent)" }}>
                  {profile.TierName} (Giảm {profile.DiscountRate > 1 ? profile.DiscountRate : Math.round(profile.DiscountRate * 100)}%)
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* Metrics Row */}
        <section className="spend-metrics-row">
          <div className="user-metric-card metric-spend">
            <div className="user-metric-icon">
              <i className="fa-solid fa-wallet"></i>
            </div>
            <div className="user-metric-details">
              <span>Đã chi tiêu (Hoàn tất)</span>
              <h4>{totalSpend.toLocaleString("vi-VN")} đ</h4>
            </div>
          </div>

          <div className="user-metric-card metric-active-count">
            <div className="user-metric-icon">
              <i className="fa-solid fa-spinner"></i>
            </div>
            <div className="user-metric-details">
              <span>Đơn đặt lịch đang chạy</span>
              <h4>{activeCount} đơn</h4>
            </div>
          </div>

          <div className="user-metric-card metric-completed-count">
            <div className="user-metric-icon">
              <i className="fa-regular fa-circle-check"></i>
            </div>
            <div className="user-metric-details">
              <span>Rửa xe hoàn thành</span>
              <h4>{completedCount} lần</h4>
            </div>
          </div>
        </section>

        {/* Section Divider */}
        <div className="section-divider-title">
          <h2>Quản Lý Lịch Hẹn & Lịch Sử</h2>
          <div className="divider-line"></div>
        </div>

        {/* Filters Tabs Bar */}
        <section className="user-filters-bar">
          <div className="user-status-tabs">
            <button className={`admin-tab ${selectedStatus === "All" ? "active" : ""}`} onClick={() => setSelectedStatus("All")}>
              Tất cả ({bookings.length})
            </button>
            <button className={`admin-tab ${selectedStatus === "Active" ? "active" : ""}`} onClick={() => setSelectedStatus("Active")}>
              Đang hoạt động ({activeCount})
            </button>
            <button className={`admin-tab ${selectedStatus === "Completed" ? "active" : ""}`} onClick={() => setSelectedStatus("Completed")}>
              Đã hoàn thành ({completedCount})
            </button>
            <button className={`admin-tab ${selectedStatus === "Cancelled" ? "active" : ""}`} onClick={() => setSelectedStatus("Cancelled")}>
              Đã hủy ({bookings.filter(b => b.status === 5).length})
            </button>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button className="btn-book-nav" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8", border: "1px solid rgba(99, 102, 241, 0.3)" }} onClick={() => navigate("/payments/history")}>
              <i className="fa-solid fa-receipt"></i> Lịch sử thanh toán
            </button>
            <a href="/booking" className="btn-book-nav">
              <i className="fa-solid fa-calendar-plus"></i> Đặt lịch rửa xe mới
            </a>
          </div>
        </section>

        {/* Bookings Table list */}
        <section className="user-table-card">
          <div className="user-table-header">
            <h2>Lịch Sử & Tiến Trình Đặt Xe</h2>
            <button className="refresh-btn" title="Làm mới" onClick={fetchData}>
              <i className="fa-solid fa-rotate-right"></i>
            </button>
          </div>

          {loading ? (
            <div className="admin-loading-spinner">
              <div className="spinner"></div>
              <span>Đang tải lịch sử đơn hàng...</span>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="admin-empty-state">
              <i className="fa-regular fa-folder-open"></i>
              <p>Bạn chưa có đơn đặt lịch rửa xe nào trong bộ lọc này.</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Mã Đơn</th>
                    <th>Biển Số Xe</th>
                    <th>Gói Dịch Vụ</th>
                    <th>Thời Gian</th>
                    <th>Chi Phí</th>
                    <th>Trạng Thái</th>
                    <th>Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 700 }}>#{b.id}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "var(--color-accent)" }}>{getVehicleIcon(b.vehicleType)}</span>
                          {/* Trọng thêm: Thêm style inline để ép trình duyệt nhận màu động, tránh bị cache CSS cũ làm mất chữ biển số xe */}
                          <span className="vehicle-badge" style={{ color: "var(--text-primary)", borderColor: "var(--border)", backgroundColor: "rgba(148, 163, 184, 0.15)" }}>
                            {b.licensePlate}
                          </span>
                        </div>
                      </td>
                      <td>{b.servicePackage}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 600 }}>{b.time}</span>
                          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{b.date}</span>
                        </div>
                      </td>
                      {/* Trọng thêm: Thay đổi color từ white sang var(--text-primary) để tránh mất chữ khi đổi giao diện sáng */}
                      <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{b.price?.toLocaleString("vi-VN")} đ</td>
                      <td>{getStatusPill(b.status, b.id)}</td>
                      <td>
                        <div className="table-actions">
                          {/* ✅ Nút thanh toán — chỉ hiện khi status=1 */}
                          {b.status === 1 && (
                            <button className="action-icon-btn" title="Thanh toán"
                              style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", border: "1px solid rgba(249,115,22,0.3)" }}
                              onClick={() => goToPayment(b)}>
                              <i className="fa-solid fa-credit-card"></i>
                            </button>
                          )}
                          {/* ✅ Nút xem lịch sử thanh toán — khi đã thanh toán hoặc hoàn thành */}
                          {(b.status === 2 || b.status === 4) && (
                            <button className="action-icon-btn" title="Lịch sử thanh toán"
                              style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}
                              onClick={() => navigate("/payments/history")}>
                              <i className="fa-solid fa-receipt"></i>
                            </button>
                          )}
                          {(b.status === 1 || b.status === 2) && (
                            <button className="action-icon-btn btn-user-cancel" title="Hủy lịch đặt" onClick={() => handleCancelBooking(b.id)}>
                              <i className="fa-solid fa-ban"></i>
                            </button>
                          )}
                          {b.status === 4 && (
                            <button className="action-icon-btn btn-details" title="Đánh giá dịch vụ" onClick={() => setFeedbackBooking(b)}>
                              <i className="fa-solid fa-star"></i>
                            </button>
                          )}
                          {(b.status === 4 || b.status === 5) && (
                            <button className="action-icon-btn btn-user-delete" title="Xóa lịch sử" onClick={() => handleDeleteBooking(b.id)}>
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          )}
                          <button className="action-icon-btn btn-details" title="Chi tiết đơn" onClick={() => setSelectedBooking(b)}>
                            <i className="fa-solid fa-circle-info"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="admin-modal-overlay" onClick={() => setSelectedBooking(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Chi Tiết Lịch Đặt Xe #{selectedBooking.id}</h3>
              <button className="close-modal-btn" onClick={() => setSelectedBooking(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="admin-modal-body">
              {/* Progress Flow */}
              <div className="modal-timeline">
                <div className={`timeline-step ${selectedBooking.status >= 2 ? (selectedBooking.status === 5 ? "" : "completed") : ""} ${(selectedBooking.status === 1 || selectedBooking.status === 2) ? "active" : ""}`}>
                  <div className="timeline-node">1</div>
                  <div className="timeline-label">Xác nhận</div>
                </div>
                <div className={`timeline-step ${selectedBooking.status >= 3 ? (selectedBooking.status === 5 ? "" : "completed") : ""} ${selectedBooking.status === 3 ? "active" : ""}`}>
                  <div className="timeline-node">2</div>
                  <div className="timeline-label">Đang rửa</div>
                </div>
                <div className={`timeline-step ${selectedBooking.status === 4 ? "completed active" : ""} ${selectedBooking.status === 5 ? "active" : ""}`}>
                  <div className="timeline-node" style={{ backgroundColor: selectedBooking.status === 5 ? "var(--color-danger)" : "" }}>
                    {selectedBooking.status === 5 ? <i className="fa-solid fa-xmark"></i> : "3"}
                  </div>
                  <div className="timeline-label">{selectedBooking.status === 5 ? "Đã hủy" : "Hoàn thành"}</div>
                </div>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid var(--border-color)", margin: "24px 0" }} />

              <div className="modal-section">
                <h4 className="modal-section-title">Thông tin lịch rửa xe</h4>
                <div className="modal-grid">
                  <div className="modal-field">
                    <label>Biển số xe</label>
                    <span className="vehicle-badge">{selectedBooking.licensePlate}</span>
                  </div>
                  <div className="modal-field">
                    <label>Loại phương tiện</label>
                    <span>{selectedBooking.vehicleType}</span>
                  </div>
                  <div className="modal-field" style={{ gridColumn: "span 2" }}>
                    <label>Dịch vụ lựa chọn</label>
                    <span>{selectedBooking.servicePackage}</span>
                  </div>
                  <div className="modal-field">
                    <label>Thời gian đặt</label>
                    <span>{selectedBooking.time} ({selectedBooking.date})</span>
                  </div>
                  <div className="modal-field">
                    <label>Tổng chi phí</label>
                    <span style={{ color: "var(--color-success)" }}>{selectedBooking.price?.toLocaleString("vi-VN")} đ</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "30px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                {/* ✅ Nút thanh toán trong modal */}
                {selectedBooking.status === 1 && (
                  <button
                    style={{ background: "#f97316", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
                    onClick={() => { setSelectedBooking(null); goToPayment(selectedBooking); }}>
                    <i className="fa-solid fa-credit-card" style={{ marginRight: "6px" }}></i> Thanh toán ngay
                  </button>
                )}
                {(selectedBooking.status === 1 || selectedBooking.status === 2) && (
                  <button className="action-icon-btn btn-user-cancel" style={{ width: "auto", padding: "8px 16px", borderRadius: "8px", fontSize: "14px" }} onClick={() => handleCancelBooking(selectedBooking.id)}>
                    <i className="fa-solid fa-ban" style={{ marginRight: "6px" }}></i> Yêu cầu hủy lịch này
                  </button>
                )}
                {(selectedBooking.status === 4 || selectedBooking.status === 5) && (
                  <button className="action-icon-btn btn-user-delete" style={{ width: "auto", padding: "8px 16px", borderRadius: "8px", fontSize: "14px" }} onClick={() => handleDeleteBooking(selectedBooking.id)}>
                    <i className="fa-solid fa-trash-can" style={{ marginRight: "6px" }}></i> Xóa khỏi lịch sử
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {feedbackBooking && (
  <div className="admin-modal-overlay" onClick={() => setFeedbackBooking(null)}>
    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
      <div className="admin-modal-header">
        <h3>Đánh giá dịch vụ #{feedbackBooking.id}</h3>
        <button className="close-modal-btn" onClick={() => setFeedbackBooking(null)}>
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="admin-modal-body">
        <div className="modal-section">
          <h4 className="modal-section-title">Dịch vụ đã sử dụng</h4>
          <div className="modal-grid">
            <div className="modal-field" style={{ gridColumn: "span 2" }}>
              <label>Gói dịch vụ</label>
              <span>{feedbackBooking.servicePackage}</span>
            </div>
            <div className="modal-field">
              <label>Biển số xe</label>
              <span className="vehicle-badge">{feedbackBooking.licensePlate}</span>
            </div>
            <div className="modal-field">
              <label>Ngày sử dụng</label>
              <span>{feedbackBooking.date}</span>
            </div>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border-color)", margin: "24px 0" }} />

        <div className="modal-section">
          <h4 className="modal-section-title">Bạn đánh giá dịch vụ thế nào?</h4>

          <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFeedbackRating(star)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: star <= feedbackRating ? "#f59e0b" : "#64748b",
                  fontSize: "28px",
                  cursor: "pointer",
                }}
              >
                <i className="fa-solid fa-star"></i>
              </button>
            ))}
          </div>

          <textarea
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            placeholder="Nhập cảm nhận của bạn về dịch vụ..."
            rows={5}
            maxLength={1000}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "14px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              color: "white",
              outline: "none",
              resize: "vertical",
            }}
          />

          <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button className="action-icon-btn btn-details" style={{ width: "auto", padding: "10px 16px" }} onClick={() => setFeedbackBooking(null)}>
              Hủy
            </button>
            <button className="action-icon-btn btn-user-cancel" style={{ width: "auto", padding: "10px 16px", background: "var(--color-success)" }} onClick={handleSubmitFeedback}>
              <i className="fa-solid fa-paper-plane" style={{ marginRight: "6px" }}></i>
              Gửi đánh giá
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Banner Alert Toast */}
      {toast && (
        <div className={`admin-toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}>
          <i className={toast.type === "error" ? "fa-solid fa-triangle-exclamation" : "fa-regular fa-circle-check"}></i>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
