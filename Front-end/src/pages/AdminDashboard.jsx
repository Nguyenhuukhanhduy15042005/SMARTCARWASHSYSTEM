import React, { useState, useEffect } from "react";
import "./AdminDashboard.css";
import axios from "axios";

const API_BASE = "http://127.0.0.1:5000/api/bookings/admin";

const MOCK_BOOKINGS = [
  { id: 101, customerName: "Nguyễn Văn A", phone: "0901234567", vehicleType: "SUV", licensePlate: "30A-123.45", servicePackage: "Rửa xe bọt tuyết & Hút bụi", time: "09:00", price: 150000, status: 1, date: "2026-06-03" },
  { id: 102, customerName: "Trần Thị B", phone: "0912345678", vehicleType: "Sedan", licensePlate: "29C-543.21", servicePackage: "Vệ sinh khoang máy chuyên sâu", time: "10:30", price: 350000, status: 2, date: "2026-06-03" },
  { id: 103, customerName: "Lê Hoàng C", phone: "0987654321", vehicleType: "Xe máy", licensePlate: "29A-999.99", servicePackage: "Rửa xe máy cơ bản", time: "11:15", price: 50000, status: 3, date: "2026-06-03" },
  { id: 104, customerName: "Phạm Minh D", phone: "0934567890", vehicleType: "SUV", licensePlate: "30E-888.88", servicePackage: "Dọn nội thất chi tiết", time: "13:00", price: 250000, status: 4, date: "2026-06-03" },
  { id: 105, customerName: "Vũ Tiến E", phone: "0977665544", vehicleType: "Sedan", licensePlate: "30F-111.11", servicePackage: "Rửa xe bọt tuyết", time: "14:30", price: 150000, status: 5, date: "2026-06-03" }
];

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, completed: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [toast, setToast] = useState(null);
  const [isSimulation, setIsSimulation] = useState(false);

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
    }, 3000);
  };

  // Main fetch function trying API with fallback to Mocks
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

      // Handle raw DB output arrays if formatted differently
      const list = Array.isArray(apiBookings) ? apiBookings : (apiBookings.data || []);
      
      setBookings(list);
      setStats({
        total: apiStats.total || list.length,
        pending: apiStats.pending || list.filter(b => b.status === 1).length,
        active: apiStats.active || list.filter(b => b.status === 3).length,
        completed: apiStats.completed || list.filter(b => b.status === 4).length,
        revenue: apiStats.revenue || list.reduce((acc, curr) => curr.status === 4 ? acc + (curr.price || 0) : acc, 0)
      });
      setIsSimulation(false);
    } catch (err) {
      console.warn("Backend API not reachable or authentication failed. Switching to Local Demo Mode.", err);
      // Fallback simulation mode
      setBookings(MOCK_BOOKINGS);
      calculateStats(MOCK_BOOKINGS);
      setIsSimulation(true);
      const errMsg = err.response?.data?.message || err.message;
      showToast(`Kết nối API thất bại: ${errMsg}. Chạy chế độ mô phỏng!`, "error");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (list) => {
    const total = list.length;
    const pending = list.filter(b => b.status === 1).length;
    const active = list.filter(b => b.status === 3).length;
    const completed = list.filter(b => b.status === 4).length;
    const revenue = list.reduce((acc, b) => b.status === 4 ? acc + b.price : acc, 0);
    setStats({ total, pending, active, completed, revenue });
  };

  // Status transitions
  const handleStatusUpdate = async (id, newStatus) => {
    const token = localStorage.getItem("token") || "mock-token";
    const headers = { Authorization: `Bearer ${token}` };

    const statusMap = {
      1: "Chờ duyệt",
      2: "Đã xác nhận",
      3: "Đang làm dịch vụ",
      4: "Hoàn thành",
      5: "Đã hủy"
    };

    if (isSimulation) {
      // Simulate state transition locally
      const updatedList = bookings.map(b => {
        if (b.id === id) {
          return { ...b, status: newStatus };
        }
        return b;
      });
      setBookings(updatedList);
      calculateStats(updatedList);
      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking({ ...selectedBooking, status: newStatus });
      }
      showToast(`Cập nhật trạng thái thành [${statusMap[newStatus]}] (Mô phỏng)!`, "success");
    } else {
      try {
        await axios.put(`${API_BASE}/${id}/status`, { status: newStatus }, { headers });
        showToast(`Cập nhật trạng thái thành [${statusMap[newStatus]}] thành công!`);
        fetchData(); // Reload live data
      } catch (err) {
        console.error("Failed to update status", err);
        // Fallback local update if API fails during session
        const updatedList = bookings.map(b => (b.id === id ? { ...b, status: newStatus } : b));
        setBookings(updatedList);
        calculateStats(updatedList);
        if (selectedBooking && selectedBooking.id === id) {
          setSelectedBooking({ ...selectedBooking, status: newStatus });
        }
        showToast(`Cập nhật trạng thái thất bại trên máy chủ. Đã cập nhật trên giao diện!`, "warning");
      }
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
    <div className="admin-dashboard-container">
      {/* Sidebar navigation */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <i className="fa-solid fa-soap"></i>
          <span>AutoWash Pro</span>
        </div>
        <ul className="admin-sidebar-menu">
          <li className="admin-menu-item active">
            <i className="fa-solid fa-chart-line"></i>
            <span>Dashboard</span>
          </li>
          <li className="admin-menu-item">
            <i className="fa-regular fa-calendar-check"></i>
            <span>Đặt lịch</span>
          </li>
          <li className="admin-menu-item">
            <i className="fa-solid fa-car-side"></i>
            <span>Bàn làm việc</span>
          </li>
          <li className="admin-menu-item">
            <i className="fa-solid fa-users"></i>
            <span>Khách hàng</span>
          </li>
          <li className="admin-menu-item">
            <i className="fa-solid fa-sliders"></i>
            <span>Cài đặt</span>
          </li>
        </ul>
        <div className="admin-sidebar-footer">
          <a href="/login" className="admin-menu-item" onClick={() => localStorage.clear()}>
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
            <span>Đăng xuất</span>
          </a>
        </div>
      </aside>

      {/* Main Container */}
      <main className="admin-main-content">
        {/* Header */}
        <header className="admin-header">
          <div className="admin-header-title">
            <h1>Tổng Quan Quản Trị</h1>
            <p>Hệ thống Smart Car Wash System điều phối thời gian thực</p>
          </div>
          <div className="admin-header-actions">
            {isSimulation && (
              <span style={{ fontSize: "12px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "4px 10px", borderRadius: "20px", fontWeight: 600 }}>
                <i className="fa-solid fa-triangle-exclamation"></i> Chế độ mô phỏng
              </span>
            )}
            <div className="admin-user-profile">
              <div className="admin-avatar">AD</div>
              <div className="admin-user-info">
                <span>Quản trị viên</span>
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
                      <td style={{ fontWeight: 700, color: "#fff" }}>{b.price?.toLocaleString("vi-VN")} đ</td>
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
