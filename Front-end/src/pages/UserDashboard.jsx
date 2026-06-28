import React, { useState, useEffect } from "react";
import "./UserDashboard.css";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";

const API_BASE = "/api";

export default function UserDashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [paidBookingIds, setPaidBookingIds] = useState(new Set());
  const [paidBookingMethods, setPaidBookingMethods] = useState(new Map());
  const [profile, setProfile] = useState({ 
    UserID: 12, FullName: "Khách hàng", PhoneNumber: "", Email: "",
    CurrentPoints: 0, AccumulatedPoints: 0, TierName: "Standard", DiscountRate: 0 
  });
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [toast, setToast] = useState(null);
  const [feedbackBooking, setFeedbackBooking] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [cancelConfirm, setCancelConfirm] = useState(null);
  // cancelConfirm = { bookingId, paymentId, originalAmount }

  const getCustomerId = () => {
    const token = localStorage.getItem("token");
    if (token && token !== "mock-token" && token !== "null" && token !== "undefined") {
      try {
        const decoded = jwtDecode(token);
        return decoded.id || decoded.userId || 12;
      } catch (err) { console.error("Error decoding token:", err); }
    }
    return 12;
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
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    const userId = getCustomerId();
    const token = localStorage.getItem("token") || "mock-token";
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const profileRes = await axios.get(`${API_BASE}/users/profile?userId=${userId}`, { headers });
      const rawProfile = profileRes.data;
      if (rawProfile) {
        setProfile({
          UserID: rawProfile.UserID !== undefined ? rawProfile.UserID : (rawProfile.userId || userId),
          FullName: rawProfile.FullName || rawProfile.fullName || "Khách hàng",
          PhoneNumber: rawProfile.PhoneNumber || rawProfile.phoneNumber || "",
          Email: rawProfile.Email || rawProfile.email || "",
          CurrentPoints: rawProfile.CurrentPoints !== undefined ? rawProfile.CurrentPoints : (rawProfile.currentPoints || 0),
          AccumulatedPoints: rawProfile.AccumulatedPoints !== undefined ? rawProfile.AccumulatedPoints : (rawProfile.accumulatedPoints || 0),
          TierName: rawProfile.TierName || rawProfile.tierName || "Standard",
          DiscountRate: rawProfile.DiscountRate !== undefined ? rawProfile.DiscountRate : (rawProfile.discountRate || 0)
        });
      }

      const bookingsRes = await axios.get(`${API_BASE}/bookings?customerId=${userId}`, { headers });
      const rawBookings = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
      const normalizedBookings = rawBookings.map(b => {
        let dateStr = b.date || "";
        let timeStr = b.time || "";
        if (!dateStr && b.BookingDate) {
          const d = new Date(b.BookingDate);
          dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        }
        return {
          id: b.id !== undefined ? b.id : b.BookingID,
          customerName: b.customerName || b.CustomerName,
          phone: b.phone || b.CustomerPhone,
          vehicleType: b.vehicleType || b.VehicleType,
          licensePlate: b.licensePlate || b.LicensePlate,
          price: b.price !== undefined ? b.price : (b.FinalPrice || b.TotalPrice || 0),
          status: b.status !== undefined ? b.status : b.Status,
          date: dateStr, time: timeStr,
          servicePackage: b.servicePackage || b.ServiceName || "N/A",
          isHiddenByUser: b.IsHiddenByUser === true || b.IsHiddenByUser === 1 || b.isHiddenByUser === true
        };
      });
      setBookings(normalizedBookings);

      try {
        const paymentsRes = await axios.get(`${API_BASE}/payments/history?limit=100`, { headers });
        const paymentsData = paymentsRes.data?.data || [];
        setPaidBookingIds(new Set(paymentsData.map(p => p.BookingID)));
        setPaidBookingMethods(new Map(paymentsData.map(p => [p.BookingID, p.Method])));
      } catch (e) {}
    } catch (err) {
      showToast(`Không thể kết nối CSDL: ${err.response?.data?.message || err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Bước 1: Bấm hủy → hiện popup xác nhận đơn giản với bảng quy tắc ──────
  // KHÔNG tính cancelCount ở frontend vì sẽ sai (booking ẩn không được đếm)
  // Để backend tính chính xác khi bấm "Xác nhận hủy"
  const handleCancelBooking = async (bookingId) => {
    const token = localStorage.getItem("token") || "mock-token";
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const paymentsRes = await axios.get(`${API_BASE}/payments/history?limit=100`, { headers });
      const paymentsData = paymentsRes.data?.data || [];
      const payment = paymentsData.find(p => p.BookingID === bookingId);

      if (!payment) {
        // Chưa thanh toán → hủy trực tiếp
        if (window.confirm("Bạn có chắc chắn muốn hủy đặt lịch này không?")) {
          await axios.post(`${API_BASE}/bookings/${bookingId}/transition`, { nextStatus: 5 }, { headers });
          showToast("Đã hủy lịch đặt xe thành công!", "success");
          fetchData();
        }
        return;
      }

      // Có payment → hiện popup với bảng quy tắc, để backend tính % khi xác nhận
      setCancelConfirm({
        bookingId,
        paymentId: payment.PaymentID,
        originalAmount: payment.Amount || 0,
      });
    } catch (err) {
      showToast("Không thể kiểm tra thông tin hủy!", "error");
    }
  };

  // ── Bước 2: Xác nhận → gọi refund API → backend tính % chính xác ──────────
  const handleConfirmCancel = async () => {
    if (!cancelConfirm) return;
    const token = localStorage.getItem("token") || "mock-token";
    const headers = { Authorization: `Bearer ${token}` };

    try {
      if (cancelConfirm.paymentId) {
        const res = await axios.post(`${API_BASE}/payments/${cancelConfirm.paymentId}/refund`, {}, { headers });
        const data = res.data;
        const msg = data.refundAmount > 0
          ? `Đã hủy thành công! Hoàn tiền ${data.refundAmount.toLocaleString('vi-VN')}đ (${data.refundPercent}%).`
          : "Đã hủy thành công! Không có tiền hoàn lại do vi phạm chính sách hủy.";
        showToast(msg, data.refundAmount > 0 ? "success" : "error");
      } else {
        await axios.post(`${API_BASE}/bookings/${cancelConfirm.bookingId}/transition`, { nextStatus: 5 }, { headers });
        showToast("Đã hủy lịch đặt xe thành công!", "success");
      }

      setCancelConfirm(null);
      if (selectedBooking && selectedBooking.id === cancelConfirm.bookingId) setSelectedBooking(null);
      fetchData();
    } catch (err) {
      showToast(`Không thể hủy: ${err.response?.data?.message || err.message}`, "error");
      setCancelConfirm(null);
    }
  };

  const handleDeleteBooking = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn lịch đặt xe này khỏi lịch sử không?")) return;
    const token = localStorage.getItem("token") || "mock-token";
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await axios.delete(`${API_BASE}/bookings/${id}`, { headers });
      showToast("Xóa lịch đặt xe thành công!", "success");
      if (selectedBooking && selectedBooking.id === id) setSelectedBooking(null);
      fetchData();
    } catch (err) {
      showToast(`Không thể xóa: ${err.response?.data?.message || err.message}`, "error");
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackBooking) return;
    if (!feedbackRating || feedbackRating < 1 || feedbackRating > 5) { showToast("Vui lòng chọn số sao từ 1 đến 5.", "error"); return; }
    if (!feedbackComment.trim()) { showToast("Vui lòng nhập nội dung đánh giá.", "error"); return; }
    const token = localStorage.getItem("token") || "mock-token";
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await axios.post(`${API_BASE}/feedbacks`, { bookingId: feedbackBooking.id, rating: feedbackRating, comment: feedbackComment.trim() }, { headers });
      showToast("Gửi đánh giá thành công!", "success");
      setFeedbackBooking(null); setFeedbackRating(5); setFeedbackComment("");
    } catch (err) {
      showToast(`Không thể gửi đánh giá: ${err.response?.data?.message || err.message}`, "error");
    }
  };

  const getStatusPill = (status, bookingId) => {
    if (status === 2 && paidBookingIds.has(bookingId)) {
      if (paidBookingMethods.get(bookingId) === "cash")
        return <span className="status-pill status-deposit" style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", border: "1px solid rgba(249,115,22,0.3)" }}><i className="fa-solid fa-coins"></i> Đã đặt cọc</span>;
      return <span className="status-pill status-paid" style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)" }}><i className="fa-solid fa-circle-check"></i> Đã thanh toán</span>;
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
      case "xe máy": case "motorcycle": case "bike": case "moto": return <i className="fa-solid fa-motorcycle"></i>;
      default: return <i className="fa-solid fa-car"></i>;
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

  const goToPayment = (booking) => {
    navigate("/payments", {
      state: {
        booking: {
          BookingID: booking.id, ServiceName: booking.servicePackage,
          Date: booking.date, Time: booking.time,
          TotalPrice: booking.price, LicensePlate: booking.licensePlate,
        }
      }
    });
  };

  const filteredBookings = bookings.filter(b => {
    if (b.isHiddenByUser) return false;
    if (selectedStatus === "All") return true;
    if (selectedStatus === "Active") return b.status === 1 || b.status === 2 || b.status === 3;
    if (selectedStatus === "Completed") return b.status === 4;
    if (selectedStatus === "Cancelled") return b.status === 5;
    return true;
  });

  const activeCount = bookings.filter(b => b.status === 1 || b.status === 2 || b.status === 3).length;
  const completedCount = bookings.filter(b => b.status === 4).length;
  const totalSpend = bookings.filter(b => b.status === 4).reduce((acc, b) => acc + (b.price || 0), 0);
  const computedPoints = bookings.filter(b => b.status === 4).reduce((sum, b) => sum + Math.floor((b.price || 0) / 1000), 0);
  const displayCurrentPoints = profile.CurrentPoints > 0 ? profile.CurrentPoints : computedPoints;
  const displayAccumulatedPoints = profile.AccumulatedPoints > 0 ? profile.AccumulatedPoints : computedPoints;

  return (
    <div className="portal-layout-container">
      <Sidebar />
      <main className="portal-main-content">
        <section className="welcome-section" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1>Xin Chào, {profile.FullName}!</h1>
            <p>Chào mừng quay trở lại. Theo dõi trạng thái đặt lịch và hạng thành viên của bạn.</p>
          </div>
          <NotificationBell />
        </section>

        <section className="user-profile-grid">
          <div className={`membership-card-glow ${getTierClass(profile.TierName)}`}>
            <div className="card-top">
              <span className="card-label">Thẻ Thành Viên</span>
              <div className="card-logo"><i className="fa-solid fa-gem"></i> MOTO SHINE</div>
            </div>
            <div className="card-middle">
              <div className="points-display">
                <span className="points-label">Điểm tích lũy hiện tại</span>
                <span className="points-value">{displayCurrentPoints} <span>PTS</span></span>
              </div>
            </div>
            <div className="card-bottom">
              <div className="member-info"><h4>{profile.FullName}</h4><p>ID tài khoản: #{profile.UserID}</p></div>
              <span className="member-tier-badge">{profile.TierName}</span>
            </div>
          </div>

          <div className="user-profile-details">
            <h3>Thông Tin Tài Khoản</h3>
            <div className="profile-fields-list">
              <div className="profile-field-row">
                <span>Số điện thoại:</span>
                <strong>
                  {!profile.PhoneNumber || profile.PhoneNumber.startsWith("G-") ? (
                    <Link to="/profile" style={{ color: "var(--color-danger)", fontWeight: "bold", textDecoration: "underline" }}>Cần cập nhật số điện thoại</Link>
                  ) : profile.PhoneNumber}
                </strong>
              </div>
              <div className="profile-field-row"><span>Email liên hệ:</span><strong>{profile.Email || "Chưa cập nhật"}</strong></div>
              <div className="profile-field-row"><span>Tổng tích lũy:</span><strong>{displayAccumulatedPoints} PTS</strong></div>
              <div className="profile-field-row">
                <span>Hạng ưu đãi:</span>
                <strong style={{ color: "var(--color-accent)" }}>
                  {profile.TierName} (Giảm {profile.DiscountRate > 1 ? profile.DiscountRate : Math.round(profile.DiscountRate * 100)}%)
                </strong>
              </div>
            </div>
          </div>
        </section>

        <section className="spend-metrics-row">
          <div className="user-metric-card metric-spend">
            <div className="user-metric-icon"><i className="fa-solid fa-wallet"></i></div>
            <div className="user-metric-details"><span>Đã chi tiêu (Hoàn tất)</span><h4>{totalSpend.toLocaleString("vi-VN")} đ</h4></div>
          </div>
          <div className="user-metric-card metric-active-count">
            <div className="user-metric-icon"><i className="fa-solid fa-spinner"></i></div>
            <div className="user-metric-details"><span>Đơn đặt lịch đang chạy</span><h4>{activeCount} đơn</h4></div>
          </div>
          <div className="user-metric-card metric-completed-count">
            <div className="user-metric-icon"><i className="fa-regular fa-circle-check"></i></div>
            <div className="user-metric-details"><span>Rửa xe hoàn thành</span><h4>{completedCount} lần</h4></div>
          </div>
        </section>

        <div className="section-divider-title">
          <h2>Quản Lý Lịch Hẹn & Lịch Sử</h2>
          <div className="divider-line"></div>
        </div>

        <section className="user-filters-bar">
          <div className="user-status-tabs">
            <button className={`admin-tab ${selectedStatus === "All" ? "active" : ""}`} onClick={() => setSelectedStatus("All")}>Tất cả ({bookings.length})</button>
            <button className={`admin-tab ${selectedStatus === "Active" ? "active" : ""}`} onClick={() => setSelectedStatus("Active")}>Đang hoạt động ({activeCount})</button>
            <button className={`admin-tab ${selectedStatus === "Completed" ? "active" : ""}`} onClick={() => setSelectedStatus("Completed")}>Đã hoàn thành ({completedCount})</button>
            <button className={`admin-tab ${selectedStatus === "Cancelled" ? "active" : ""}`} onClick={() => setSelectedStatus("Cancelled")}>Đã hủy ({bookings.filter(b => b.status === 5).length})</button>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button className="btn-book-nav" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }} onClick={() => navigate("/payments/history")}>
              <i className="fa-solid fa-receipt"></i> Lịch sử thanh toán
            </button>
            <a href="/booking" className="btn-book-nav"><i className="fa-solid fa-calendar-plus"></i> Đặt lịch rửa xe mới</a>
          </div>
        </section>

        <section className="user-table-card">
          <div className="user-table-header">
            <h2>Lịch Sử & Tiến Trình Đặt Xe</h2>
            <button className="refresh-btn" title="Làm mới" onClick={fetchData}><i className="fa-solid fa-rotate-right"></i></button>
          </div>

          {loading ? (
            <div className="admin-loading-spinner"><div className="spinner"></div><span>Đang tải lịch sử đơn hàng...</span></div>
          ) : filteredBookings.length === 0 ? (
            <div className="admin-empty-state"><i className="fa-regular fa-folder-open"></i><p>Bạn chưa có đơn đặt lịch rửa xe nào trong bộ lọc này.</p></div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr><th>Mã Đơn</th><th>Biển Số Xe</th><th>Gói Dịch Vụ</th><th>Thời Gian</th><th>Chi Phí</th><th>Trạng Thái</th><th>Hành Động</th></tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 700 }}>#{b.id}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "var(--color-accent)" }}>{getVehicleIcon(b.vehicleType)}</span>
                          <span className="vehicle-badge" style={{ color: "var(--text-primary)", borderColor: "var(--border)", backgroundColor: "rgba(148,163,184,0.15)" }}>{b.licensePlate}</span>
                        </div>
                      </td>
                      <td>{b.servicePackage}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 600 }}>{b.time}</span>
                          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{b.date}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{b.price?.toLocaleString("vi-VN")} đ</td>
                      <td>{getStatusPill(b.status, b.id)}</td>
                      <td>
                        <div className="table-actions">
                          {b.status === 1 && (
                            <button className="action-icon-btn" title="Thanh toán"
                              style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", border: "1px solid rgba(249,115,22,0.3)" }}
                              onClick={() => goToPayment(b)}>
                              <i className="fa-solid fa-credit-card"></i>
                            </button>
                          )}
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

      {/* ── Popup xác nhận hủy — hiện bảng quy tắc, backend tính % chính xác ── */}
      {cancelConfirm && (
        <div className="admin-modal-overlay" onClick={() => setCancelConfirm(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="admin-modal-header">
              <h3>Xác nhận hủy đơn</h3>
              <button className="close-modal-btn" onClick={() => setCancelConfirm(null)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="admin-modal-body">

              <div style={{ padding: "14px", borderRadius: 10, marginBottom: 16,
                background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                  ⚠️ Số tiền hoàn lại phụ thuộc vào thời gian hủy và số lần hủy trong 30 ngày.
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Số tiền đã trả:</span>
                  <span style={{ fontWeight: 700 }}>{cancelConfirm.originalAmount.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>

              {/* Bảng quy tắc hoàn tiền */}
              <div style={{ padding: "14px", borderRadius: 10, marginBottom: 16,
                background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 700 }}>Quy tắc hoàn tiền:</p>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ color: "var(--text-secondary)" }}>
                      <th style={{ textAlign: "left", paddingBottom: 4 }}>Thời gian</th>
                      <th style={{ textAlign: "center" }}>Lần 1-2</th>
                      <th style={{ textAlign: "center" }}>Lần 3</th>
                      <th style={{ textAlign: "center" }}>Lần 4+</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ color: "var(--text-primary)", paddingTop: 4 }}>Trước 24h</td>
                      <td style={{ textAlign: "center", color: "#10b981", fontWeight: 700 }}>100%</td>
                      <td style={{ textAlign: "center", color: "#f59e0b", fontWeight: 700 }}>50%</td>
                      <td style={{ textAlign: "center", color: "#ef4444", fontWeight: 700 }}>0%</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--text-primary)", paddingTop: 4 }}>2 - 24h</td>
                      <td style={{ textAlign: "center", color: "#f59e0b", fontWeight: 700 }}>50%</td>
                      <td style={{ textAlign: "center", color: "#ef4444", fontWeight: 700 }}>0%</td>
                      <td style={{ textAlign: "center", color: "#ef4444", fontWeight: 700 }}>0%</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--text-primary)", paddingTop: 4 }}>Dưới 2h</td>
                      <td style={{ textAlign: "center", color: "#ef4444", fontWeight: 700 }}>0%</td>
                      <td style={{ textAlign: "center", color: "#ef4444", fontWeight: 700 }}>0%</td>
                      <td style={{ textAlign: "center", color: "#ef4444", fontWeight: 700 }}>0%</td>
                    </tr>
                  </tbody>
                </table>
                <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 8 }}>
                  * Đếm số lần hủy trong 30 ngày gần nhất
                </p>
              </div>

              <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 16,
                background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <span style={{ color: "#ef4444", fontSize: 13 }}>
                  ⚠️ Sau khi xác nhận, lịch sẽ bị hủy. Số tiền hoàn (nếu có) sẽ được thông báo ngay.
                </span>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setCancelConfirm(null)}
                  style={{ padding: "10px 20px", border: "1px solid var(--border)", borderRadius: 10,
                    background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 700 }}>
                  Quay lại
                </button>
                <button onClick={handleConfirmCancel}
                  style={{ padding: "10px 20px", border: "none", borderRadius: 10,
                    background: "#ef4444", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                  <i className="fa-solid fa-ban" style={{ marginRight: 6 }}></i>
                  Xác nhận hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="admin-modal-overlay" onClick={() => setSelectedBooking(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Chi Tiết Lịch Đặt Xe #{selectedBooking.id}</h3>
              <button className="close-modal-btn" onClick={() => setSelectedBooking(null)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="admin-modal-body">
              <div className="modal-timeline">
                <div className={`timeline-step ${selectedBooking.status >= 2 ? (selectedBooking.status === 5 ? "" : "completed") : ""} ${(selectedBooking.status === 1 || selectedBooking.status === 2) ? "active" : ""}`}>
                  <div className="timeline-node">1</div><div className="timeline-label">Xác nhận</div>
                </div>
                <div className={`timeline-step ${selectedBooking.status >= 3 ? (selectedBooking.status === 5 ? "" : "completed") : ""} ${selectedBooking.status === 3 ? "active" : ""}`}>
                  <div className="timeline-node">2</div><div className="timeline-label">Đang rửa</div>
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
                  <div className="modal-field"><label>Biển số xe</label><span className="vehicle-badge">{selectedBooking.licensePlate}</span></div>
                  <div className="modal-field"><label>Loại phương tiện</label><span>{selectedBooking.vehicleType}</span></div>
                  <div className="modal-field" style={{ gridColumn: "span 2" }}><label>Dịch vụ lựa chọn</label><span>{selectedBooking.servicePackage}</span></div>
                  <div className="modal-field"><label>Thời gian đặt</label><span>{selectedBooking.time} ({selectedBooking.date})</span></div>
                  <div className="modal-field"><label>Tổng chi phí</label><span style={{ color: "var(--color-success)" }}>{selectedBooking.price?.toLocaleString("vi-VN")} đ</span></div>
                </div>
              </div>
              <div style={{ marginTop: "30px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                {selectedBooking.status === 1 && (
                  <button style={{ background: "#f97316", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
                    onClick={() => { setSelectedBooking(null); goToPayment(selectedBooking); }}>
                    <i className="fa-solid fa-credit-card" style={{ marginRight: "6px" }}></i> Thanh toán ngay
                  </button>
                )}
                {(selectedBooking.status === 1 || selectedBooking.status === 2) && (
                  <button className="action-icon-btn btn-user-cancel"
                    style={{ width: "auto", padding: "8px 16px", borderRadius: "8px", fontSize: "14px" }}
                    onClick={() => { setSelectedBooking(null); handleCancelBooking(selectedBooking.id); }}>
                    <i className="fa-solid fa-ban" style={{ marginRight: "6px" }}></i> Yêu cầu hủy lịch này
                  </button>
                )}
                {(selectedBooking.status === 4 || selectedBooking.status === 5) && (
                  <button className="action-icon-btn btn-user-delete"
                    style={{ width: "auto", padding: "8px 16px", borderRadius: "8px", fontSize: "14px" }}
                    onClick={() => handleDeleteBooking(selectedBooking.id)}>
                    <i className="fa-solid fa-trash-can" style={{ marginRight: "6px" }}></i> Xóa khỏi lịch sử
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackBooking && (
        <div className="admin-modal-overlay" onClick={() => setFeedbackBooking(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Đánh giá dịch vụ #{feedbackBooking.id}</h3>
              <button className="close-modal-btn" onClick={() => setFeedbackBooking(null)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="admin-modal-body">
              <div className="modal-section">
                <h4 className="modal-section-title">Dịch vụ đã sử dụng</h4>
                <div className="modal-grid">
                  <div className="modal-field" style={{ gridColumn: "span 2" }}><label>Gói dịch vụ</label><span>{feedbackBooking.servicePackage}</span></div>
                  <div className="modal-field"><label>Biển số xe</label><span className="vehicle-badge">{feedbackBooking.licensePlate}</span></div>
                  <div className="modal-field"><label>Ngày sử dụng</label><span>{feedbackBooking.date}</span></div>
                </div>
              </div>
              <hr style={{ border: "none", borderTop: "1px solid var(--border-color)", margin: "24px 0" }} />
              <div className="modal-section">
                <h4 className="modal-section-title">Bạn đánh giá dịch vụ thế nào?</h4>
                <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
                  {[1,2,3,4,5].map((star) => (
                    <button key={star} type="button" onClick={() => setFeedbackRating(star)}
                      style={{ border: "none", background: "transparent", color: star <= feedbackRating ? "#f59e0b" : "#64748b", fontSize: "28px", cursor: "pointer" }}>
                      <i className="fa-solid fa-star"></i>
                    </button>
                  ))}
                </div>
                <textarea value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Nhập cảm nhận của bạn về dịch vụ..." rows={5} maxLength={1000}
                  style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "white", outline: "none", resize: "vertical" }}
                />
                <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button className="action-icon-btn btn-details" style={{ width: "auto", padding: "10px 16px" }} onClick={() => setFeedbackBooking(null)}>Hủy</button>
                  <button className="action-icon-btn" style={{ width: "auto", padding: "10px 16px", background: "var(--color-success)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }} onClick={handleSubmitFeedback}>
                    <i className="fa-solid fa-paper-plane" style={{ marginRight: "6px" }}></i> Gửi đánh giá
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`admin-toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}>
          <i className={toast.type === "error" ? "fa-solid fa-triangle-exclamation" : "fa-regular fa-circle-check"}></i>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}