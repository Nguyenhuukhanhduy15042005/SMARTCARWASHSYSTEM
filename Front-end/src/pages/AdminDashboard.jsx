import React, { useState, useEffect } from "react";
import "./AdminDashboard.css";
import axios from "axios";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://127.0.0.1:5000/api/bookings/admin";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, completed: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("LOGIN_USER");
    return saved ? JSON.parse(saved) : null;
  });

  // Load Google Fonts & FontAwesome icons dynamically
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

  // Show auto-dismiss toast alerts
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Main fetch function targeting SQL server API directly
  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token") || "mock-token";
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // 1. Fetch Stats
      const statsRes = await axios.get(`${API_BASE}/dashboard/stats`, { headers });
      // 2. Fetch Bookings
      const bookingsRes = await axios.get(`${API_BASE}/all`, { headers });

      const apiStats = statsRes.data;
      const apiBookings = bookingsRes.data;

      const list = Array.isArray(apiBookings) ? apiBookings : (apiBookings.data || []);
      
      setBookings(list);
      setStats({
        total: apiStats.total || list.length,
        pending: apiStats.pending || list.filter(b => b.status === 1).length,
        active: apiStats.active || list.filter(b => b.status === 3).length,
        completed: apiStats.completed || list.filter(b => b.status === 4).length,
        revenue: apiStats.revenue || list.reduce((acc, curr) => curr.status === 4 ? acc + (curr.price || 0) : acc, 0)
      });
    } catch (err) {
      console.error("Backend API connection failed:", err);
      const errMsg = err.response?.data?.message || err.message;
      showToast(`Không thể kết nối đến cơ sở dữ liệu: ${errMsg}. Vui lòng kiểm tra Server!`, "error");
      setBookings([]);
      setStats({ total: 0, pending: 0, active: 0, completed: 0, revenue: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Status transitions triggering live API PUT requests
  const handleStatusUpdate = async (id, newStatus) => {
    const token = localStorage.getItem("token") || "mock-token";
    const headers = { Authorization: `Bearer ${token}` };

    // When completing (status 4), fetch fresh data from server to get accurate payment info
    if (Number(newStatus) === 4) {
      try {
        const freshRes = await axios.get(`${API_BASE}/${id}`, { headers });
        const freshBooking = freshRes.data;
        const paid = Number(freshBooking.paidAmount || freshBooking.PaidAmount || 0);
        const price = Number(freshBooking.price || freshBooking.FinalPrice || freshBooking.TotalPrice || 0);
        const remaining = price - paid;

        if (remaining > 0) {
          const confirmMsg = `ĐƠN HÀNG CHƯA THANH TOÁN ĐỦ!\n\n` +
            `- Tổng chi phí: ${price.toLocaleString("vi-VN")} đ\n` +
            `- Đã cọc trước: ${paid.toLocaleString("vi-VN")} đ\n` +
            `👉 CẦN THU THÊM TIỀN MẶT: ${remaining.toLocaleString("vi-VN")} đ\n\n` +
            `Vui lòng thu đủ ${remaining.toLocaleString("vi-VN")} đ từ khách hàng trước khi bấm xác nhận.\n` +
            `Bạn xác nhận ĐÃ THU ĐỦ và muốn HOÀN THÀNH đơn hàng này?`;
          if (!window.confirm(confirmMsg)) {
            return;
          }
        } else {
          if (!window.confirm("Đơn hàng đã thanh toán đủ online. Xác nhận hoàn tất đơn hàng?")) {
            return;
          }
        }
      } catch (fetchErr) {
        console.error("Failed to fetch fresh booking data:", fetchErr);
        if (!window.confirm("Không thể kiểm tra thông tin thanh toán. Vẫn muốn hoàn thành đơn hàng?")) {
          return;
        }
      }
    }

    const statusMap = {
      1: "Chờ duyệt",
      2: "Đã xác nhận",
      3: "Đang làm dịch vụ",
      4: "Hoàn thành",
      5: "Đã hủy"
    };

    try {
      await axios.put(`${API_BASE}/${id}/status`, { status: newStatus }, { headers });
      showToast(`Cập nhật trạng thái thành [${statusMap[newStatus]}] thành công!`, "success");
      
      // Update local detailed modal if open
      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking({ ...selectedBooking, status: newStatus });
      }
      
      fetchData(); // Reload live database records
    } catch (err) {
      console.error("Failed to update status in DB:", err);
      const errMsg = err.response?.data?.message || err.message;
      showToast(`Lỗi cập nhật trạng thái trong CSDL: ${errMsg}`, "error");
    }
  };

  // Delete booking permanently from DB
  const handleDeleteBooking = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn lịch đặt xe này khỏi cơ sở dữ liệu?")) {
      return;
    }

    const token = localStorage.getItem("token") || "mock-token";
    const headers = { Authorization: `Bearer ${token}` };

    try {
      await axios.delete(`${API_BASE}/${id}`, { headers });
      showToast("Xóa lịch đặt xe thành công!", "success");
      
      // Close details modal if open on the deleted booking
      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking(null);
      }
      
      fetchData(); // Reload live database records
    } catch (err) {
      console.error("Failed to delete booking from DB:", err);
      const errMsg = err.response?.data?.message || err.message;
      showToast(`Lỗi xóa lịch đặt xe trong CSDL: ${errMsg}`, "error");
    }
  };

  // Mapping text status to pill colors
  const getStatusPill = (status) => {
    switch (status) {
      case 1: return <span className="status-pill status-pending"><i className="fa-regular fa-clock"></i> Chờ duyệt</span>;
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
        return <i className="fa-solid fa-motorcycle"></i>;
      default:
        return <i className="fa-solid fa-car"></i>;
    }
  };

  // Filtering list
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.licensePlate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.phone?.includes(searchQuery);

    const matchesStatus = 
      selectedStatus === "All" || 
      b.status.toString() === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="admin-dashboard-container portal-layout-container">
      <Sidebar />

      {/* Main Container */}
      <main className="admin-main-content portal-main-content">
        {/* Header */}
        <header className="admin-header">
          <div className="admin-header-title">
            <h1>Tổng Quan Quản Trị</h1>
            <p>Hệ thống Smart Car Wash System điều phối thời gian thực</p>
          </div>
          <div className="admin-header-actions">
            <div 
              className="admin-user-profile" 
              style={{ cursor: "pointer" }}
              onClick={() => window.location.href = "/profile"}
              title="Xem hồ sơ cá nhân"
            >
              <div className="admin-avatar">
                {currentUser?.fullName ? currentUser.fullName.substring(0, 2).toUpperCase() : "AD"}
              </div>
              <div className="admin-user-info">
                <span>{currentUser?.fullName || "Quản trị viên"}</span>
                <small>Role: Admin</small>
              </div>
            </div>
          </div>
        </header>

        {/* Metrics Section */}
        <section className="admin-metrics-grid">
          <div className="admin-metric-card metric-total">
            <div className="admin-metric-info">
              <h3>Tổng số lượng</h3>
              <p className="admin-metric-value">{stats.total}</p>
            </div>
            <div className="admin-metric-icon">
              <i className="fa-solid fa-list-check"></i>
            </div>
          </div>

          <div className="admin-metric-card metric-pending">
            <div className="admin-metric-info">
              <h3>Đang chờ duyệt</h3>
              <p className="admin-metric-value">{stats.pending}</p>
            </div>
            <div className="admin-metric-icon">
              <i className="fa-regular fa-clock"></i>
            </div>
          </div>

          <div className="admin-metric-card metric-active">
            <div className="admin-metric-info">
              <h3>Đang làm dịch vụ</h3>
              <p className="admin-metric-value">{stats.active}</p>
            </div>
            <div className="admin-metric-icon">
              <i className="fa-solid fa-arrows-spin"></i>
            </div>
          </div>

          <div className="admin-metric-card metric-completed">
            <div className="admin-metric-info">
              <h3>Hoàn thành</h3>
              <p className="admin-metric-value">{stats.completed}</p>
            </div>
            <div className="admin-metric-icon">
              <i className="fa-regular fa-circle-check"></i>
            </div>
          </div>

          <div className="admin-metric-card metric-revenue">
            <div className="admin-metric-info">
              <h3>Doanh thu hoàn tất</h3>
              <p className="admin-metric-value">{stats.revenue.toLocaleString("vi-VN")} đ</p>
            </div>
            <div className="admin-metric-icon">
              <i className="fa-solid fa-coins"></i>
            </div>
          </div>
        </section>

        {/* Search and Filters Bar */}
        <section className="admin-filters-bar">
          <div className="admin-search-wrapper">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              className="admin-search-input"
              placeholder="Tìm khách hàng, biển số xe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="admin-status-tabs">
            <button className={`admin-tab ${selectedStatus === "All" ? "active" : ""}`} onClick={() => setSelectedStatus("All")}>Tất cả</button>
            <button className={`admin-tab ${selectedStatus === "1" ? "active" : ""}`} onClick={() => setSelectedStatus("1")}>Chờ duyệt</button>
            <button className={`admin-tab ${selectedStatus === "2" ? "active" : ""}`} onClick={() => setSelectedStatus("2")}>Đã xác nhận</button>
            <button className={`admin-tab ${selectedStatus === "3" ? "active" : ""}`} onClick={() => setSelectedStatus("3")}>Đang làm</button>
            <button className={`admin-tab ${selectedStatus === "4" ? "active" : ""}`} onClick={() => setSelectedStatus("4")}>Hoàn tất</button>
            <button className={`admin-tab ${selectedStatus === "5" ? "active" : ""}`} onClick={() => setSelectedStatus("5")}>Đã hủy</button>
          </div>
        </section>

        {/* Table list card */}
        <section className="admin-table-card">
          <div className="admin-table-header">
            <h2>Danh Sách Lịch Đặt Xe</h2>
            <button className="refresh-btn" title="Làm mới" onClick={fetchData}>
              <i className="fa-solid fa-rotate-right"></i>
            </button>
          </div>

          {loading ? (
            <div className="admin-loading-spinner">
              <div className="spinner"></div>
              <span>Đang tải danh sách đặt lịch...</span>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="admin-empty-state">
              <i className="fa-regular fa-folder-open"></i>
              <p>Không tìm thấy bản ghi đặt lịch nào khớp với bộ lọc.</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Khách Hàng</th>
                    <th>Phương Tiện</th>
                    <th>Dịch Vụ</th>
                    <th>Thời Gian</th>
                    <th>Giá Cả</th>
                    <th>Trạng Thái</th>
                    <th>Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div className="customer-cell-info">
                          <span className="customer-name">{b.customerName}</span>
                          <span className="customer-phone">{b.phone}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "var(--color-accent)", fontSize: "16px" }}>{getVehicleIcon(b.vehicleType)}</span>
                          <div>
                            <span className="vehicle-badge">{b.licensePlate}</span>
                            <span className="vehicle-type-label">{b.vehicleType}</span>
                          </div>
                        </div>
                      </td>
                      <td>{b.servicePackage}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 600 }}>{b.time}</span>
                          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{b.date}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: "#fff" }}>
                        <div>{b.price?.toLocaleString("vi-VN")} đ</div>
                        {(() => {
                          const paid = b.paidAmount !== undefined ? b.paidAmount : (b.PaidAmount || 0);
                          const price = b.price || 0;
                          if (Number(b.status) === 4) {
                            return <div style={{ fontSize: "11px", color: "#10b981", marginTop: "4px", fontWeight: "normal" }}><i className="fa-solid fa-circle-check"></i> Đã thu đủ</div>;
                          }
                          if (Number(b.status) === 5) return null;
                          if (paid > 0) {
                            if (paid >= price) {
                              return <div style={{ fontSize: "11px", color: "#10b981", marginTop: "4px", fontWeight: "normal" }}><i className="fa-solid fa-credit-card"></i> Đã trả đủ (Online)</div>;
                            } else {
                              return (
                                <div style={{ fontSize: "11px", color: "#f59e0b", marginTop: "4px", fontWeight: "normal", lineHeight: "1.3" }}>
                                  <span style={{ display: "block", fontSize: "10px", color: "#9ca3af" }}>Đã cọc: {paid.toLocaleString("vi-VN")}đ</span>
                                  <span style={{ display: "block", fontWeight: "bold" }}>Còn lại: {(price - paid).toLocaleString("vi-VN")}đ</span>
                                </div>
                              );
                            }
                          }
                          return <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px", fontWeight: "normal" }}>Thu sau tại quầy</div>;
                        })()}
                      </td>
                      <td>{getStatusPill(b.status)}</td>
                      <td>
                        <div className="table-actions">
                          {b.status === 1 && (
                            <>
                              <button className="action-icon-btn btn-confirm" title="Xác nhận" onClick={() => handleStatusUpdate(b.id, 2)}>
                                <i className="fa-solid fa-circle-check"></i>
                              </button>
                              <button className="action-icon-btn btn-cancel" title="Hủy bỏ" onClick={() => handleStatusUpdate(b.id, 5)}>
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </>
                          )}
                          {b.status === 2 && (
                            <>
                              <button className="action-icon-btn btn-wash" title="Bắt đầu rửa" onClick={() => handleStatusUpdate(b.id, 3)}>
                                <i className="fa-solid fa-soap"></i>
                              </button>
                              <button className="action-icon-btn btn-cancel" title="Hủy bỏ" onClick={() => handleStatusUpdate(b.id, 5)}>
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </>
                          )}
                          {b.status === 3 && (
                            <button className="action-icon-btn btn-complete" title="Hoàn thành rửa" onClick={() => handleStatusUpdate(b.id, 4)}>
                              <i className="fa-solid fa-circle-check"></i>
                            </button>
                          )}
                          {(b.status === 4 || b.status === 5) && (
                            <button className="action-icon-btn btn-cancel" title="Xóa lịch đặt" onClick={() => handleDeleteBooking(b.id)}>
                              <i className="fa-regular fa-trash-can"></i>
                            </button>
                          )}
                          <button className="action-icon-btn btn-details" title="Chi tiết" onClick={() => setSelectedBooking(b)}>
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
                <div className={`timeline-step ${selectedBooking.status >= 1 ? (selectedBooking.status === 5 ? "" : "completed") : ""} ${selectedBooking.status === 1 ? "active" : ""}`}>
                  <div className="timeline-node">1</div>
                  <div className="timeline-label">Chờ duyệt</div>
                </div>
                <div className={`timeline-step ${selectedBooking.status >= 2 ? (selectedBooking.status === 5 ? "" : "completed") : ""} ${selectedBooking.status === 2 ? "active" : ""}`}>
                  <div className="timeline-node">2</div>
                  <div className="timeline-label">Xác nhận</div>
                </div>
                <div className={`timeline-step ${selectedBooking.status >= 3 ? (selectedBooking.status === 5 ? "" : "completed") : ""} ${selectedBooking.status === 3 ? "active" : ""}`}>
                  <div className="timeline-node">3</div>
                  <div className="timeline-label">Đang rửa</div>
                </div>
                <div className={`timeline-step ${selectedBooking.status === 4 ? "completed active" : ""} ${selectedBooking.status === 5 ? "active" : ""}`}>
                  <div className="timeline-node" style={{ backgroundColor: selectedBooking.status === 5 ? "var(--color-danger)" : "" }}>
                    {selectedBooking.status === 5 ? <i className="fa-solid fa-xmark"></i> : "4"}
                  </div>
                  <div className="timeline-label">{selectedBooking.status === 5 ? "Đã hủy" : "Hoàn thành"}</div>
                </div>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid var(--border-color)", margin: "24px 0" }} />

              <div className="modal-section">
                <h4 className="modal-section-title">Thông tin khách hàng</h4>
                <div className="modal-grid">
                  <div className="modal-field">
                    <label>Họ và tên</label>
                    <span>{selectedBooking.customerName}</span>
                  </div>
                  <div className="modal-field">
                    <label>Số điện thoại</label>
                    <span>{selectedBooking.phone}</span>
                  </div>
                </div>
              </div>

              <div className="modal-section">
                <h4 className="modal-section-title">Thông tin dịch vụ & Phương tiện</h4>
                <div className="modal-grid">
                  <div className="modal-field">
                    <label>Biển số xe</label>
                    <span className="vehicle-badge">{selectedBooking.licensePlate}</span>
                  </div>
                  <div className="modal-field">
                    <label>Loại xe</label>
                    <span>{selectedBooking.vehicleType}</span>
                  </div>
                  <div className="modal-field" style={{ gridColumn: "span 2" }}>
                    <label>Gói dịch vụ rửa xe</label>
                    <span>{selectedBooking.servicePackage}</span>
                  </div>
                  <div className="modal-field">
                    <label>Thời gian đặt lịch</label>
                    <span>{selectedBooking.time} ({selectedBooking.date})</span>
                  </div>
                  <div className="modal-field">
                    <label>Tổng chi phí</label>
                    <span style={{ color: "var(--color-success)" }}>{selectedBooking.price?.toLocaleString("vi-VN")} đ</span>
                  </div>
                  {(() => {
                    const paid = selectedBooking.paidAmount !== undefined ? selectedBooking.paidAmount : (selectedBooking.PaidAmount || 0);
                    const price = selectedBooking.price || 0;
                    if (paid > 0) {
                      return (
                        <>
                          <div className="modal-field">
                            <label>Đã cọc trước</label>
                            <span style={{ color: "#f59e0b" }}>{paid.toLocaleString("vi-VN")} đ ({selectedBooking.paymentMethod || "VNPay"})</span>
                          </div>
                          <div className="modal-field">
                            <label>Cần thu còn lại</label>
                            <span style={{ color: Number(selectedBooking.status) === 4 ? "#10b981" : "#ef4444", fontWeight: "bold" }}>
                              {Number(selectedBooking.status) === 4 ? "0 đ (Đã thu đủ)" : `${(price - paid).toLocaleString("vi-VN")} đ`}
                            </span>
                          </div>
                        </>
                      );
                    } else if (Number(selectedBooking.status) === 4) {
                      return (
                        <div className="modal-field">
                          <label>Tình trạng thu tiền</label>
                          <span style={{ color: "#10b981", fontWeight: "bold" }}>Đã thu đủ 100% tại quầy</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {selectedBooking.status !== 4 && selectedBooking.status !== 5 && (
                <div style={{ marginTop: "30px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  {selectedBooking.status === 1 && (
                    <button className="action-icon-btn btn-confirm" style={{ width: "auto", padding: "8px 16px", borderRadius: "8px", fontSize: "14px" }} onClick={() => handleStatusUpdate(selectedBooking.id, 2)}>
                      <i className="fa-solid fa-circle-check" style={{ marginRight: "6px" }}></i> Xác nhận đặt lịch
                    </button>
                  )}
                  {selectedBooking.status === 2 && (
                    <button className="action-icon-btn btn-wash" style={{ width: "auto", padding: "8px 16px", borderRadius: "8px", fontSize: "14px" }} onClick={() => handleStatusUpdate(selectedBooking.id, 3)}>
                      <i className="fa-solid fa-soap" style={{ marginRight: "6px" }}></i> Bắt đầu rửa xe
                    </button>
                  )}
                  {selectedBooking.status === 3 && (
                    <button className="action-icon-btn btn-complete" style={{ width: "auto", padding: "8px 16px", borderRadius: "8px", fontSize: "14px" }} onClick={() => handleStatusUpdate(selectedBooking.id, 4)}>
                      <i className="fa-solid fa-circle-check" style={{ marginRight: "6px" }}></i> Hoàn tất dịch vụ
                    </button>
                  )}
                  {selectedBooking.status < 3 && (
                    <button className="action-icon-btn btn-cancel" style={{ width: "auto", padding: "8px 16px", borderRadius: "8px", fontSize: "14px" }} onClick={() => handleStatusUpdate(selectedBooking.id, 5)}>
                      <i className="fa-solid fa-xmark" style={{ marginRight: "6px" }}></i> Hủy đặt lịch
                    </button>
                  )}
                </div>
              )}
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