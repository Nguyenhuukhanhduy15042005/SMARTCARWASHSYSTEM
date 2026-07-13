// Front-end/src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import "./AdminDashboard.css";
import axios from "axios";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://127.0.0.1:5000/api/bookings/admin";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("LOGIN_USER");
    return saved ? JSON.parse(saved) : null;
  });

  // --- FILTER STATES ---
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [vehicleFilter, setVehicleFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  // Debounce Keyword
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 500);
    return () => clearTimeout(timerId);
  }, [keyword]);

  useEffect(() => {
    const linkFont = document.createElement("link");
    linkFont.href =
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap";
    linkFont.rel = "stylesheet";
    document.head.appendChild(linkFont);

    const linkIcons = document.createElement("link");
    linkIcons.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    linkIcons.rel = "stylesheet";
    document.head.appendChild(linkIcons);
  }, []);

  // Fetch when filters change
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword, statusFilter, vehicleFilter, dateFilter]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token") || "mock-token";
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // 1. Fetch Stats
      const statsRes = await axios.get(`${API_BASE}/dashboard/stats`, {
        headers,
      });

      // 2. Prepare params for bookings
      const params = {};
      if (debouncedKeyword) params.search = debouncedKeyword;
      if (statusFilter !== "All") params.status = statusFilter;
      if (vehicleFilter !== "All") params.vehicleType = vehicleFilter;
      if (dateFilter) {
        params.fromDate = `${dateFilter} 00:00:00`;
        params.toDate = `${dateFilter} 23:59:59`;
      }

      // 3. Fetch Bookings
      const bookingsRes = await axios.get(`${API_BASE}/all`, {
        headers,
        params,
      });

      const apiStats = statsRes.data;
      const apiBookings = bookingsRes.data;

      const list = Array.isArray(apiBookings)
        ? apiBookings
        : apiBookings.data || [];

      setBookings(list);
      setStats({
        total: apiStats.total || list.length,
        pending: apiStats.pending || list.filter((b) => b.status === 1).length,
        active: apiStats.active || list.filter((b) => b.status === 3).length,
        completed:
          apiStats.completed || list.filter((b) => b.status === 4).length,
        cancelled:
          apiStats.cancelled !== undefined
            ? apiStats.cancelled
            : list.filter((b) => b.status === 5).length,
        revenue:
          apiStats.revenue ||
          list.reduce(
            (acc, curr) => (curr.status === 4 ? acc + (curr.price || 0) : acc),
            0,
          ),
      });
    } catch (err) {
      console.error("Backend API connection failed:", err);
      showToast(`Lỗi tải dữ liệu. Vui lòng kiểm tra kết nối Server!`, "error");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setKeyword("");
    setDebouncedKeyword("");
    setStatusFilter("All");
    setVehicleFilter("All");
    setDateFilter("");
  };

  const handleStatusUpdate = async (id, newStatus) => {
    const token = localStorage.getItem("token") || "mock-token";
    const headers = { Authorization: `Bearer ${token}` };

    if (Number(newStatus) === 4) {
      try {
        const freshRes = await axios.get(`${API_BASE}/${id}`, { headers });
        const freshBooking = freshRes.data;
        const paid = Number(
          freshBooking.paidAmount || freshBooking.PaidAmount || 0,
        );
        const price = Number(
          freshBooking.price ||
            freshBooking.FinalPrice ||
            freshBooking.TotalPrice ||
            0,
        );
        const remaining = price - paid;

        if (remaining > 0) {
          const confirmMsg = `ĐƠN HÀNG CHƯA THANH TOÁN ĐỦ!\n\n- CẦN THU THÊM TIỀN MẶT: ${remaining.toLocaleString("vi-VN")} đ\n\nXác nhận ĐÃ THU ĐỦ và HOÀN THÀNH đơn hàng này?`;
          if (!window.confirm(confirmMsg)) return;
        } else {
          if (
            !window.confirm(
              "Đơn hàng đã thanh toán đủ online. Xác nhận hoàn tất đơn hàng?",
            )
          )
            return;
        }
      } catch (fetchErr) {
        if (
          !window.confirm(
            "Không thể kiểm tra thông tin thanh toán. Vẫn muốn hoàn thành đơn hàng?",
          )
        )
          return;
      }
    }

    const statusMap = {
      1: "Chờ duyệt",
      2: "Đã xác nhận",
      3: "Đang làm dịch vụ",
      4: "Hoàn thành",
      5: "Đã hủy",
    };

    try {
      await axios.put(
        `${API_BASE}/${id}/status`,
        { status: newStatus },
        { headers },
      );
      showToast(
        `Cập nhật trạng thái thành [${statusMap[newStatus]}] thành công!`,
        "success",
      );
      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking({ ...selectedBooking, status: newStatus });
      }
      fetchData();
    } catch (err) {
      showToast(
        `Lỗi cập nhật: ${err.response?.data?.message || err.message}`,
        "error",
      );
    }
  };

  const handleDeleteBooking = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn lịch đặt xe này?"))
      return;
    const token = localStorage.getItem("token") || "mock-token";
    try {
      await axios.delete(`${API_BASE}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Xóa lịch đặt xe thành công!", "success");
      if (selectedBooking && selectedBooking.id === id)
        setSelectedBooking(null);
      fetchData();
    } catch (err) {
      showToast(
        `Lỗi xóa: ${err.response?.data?.message || err.message}`,
        "error",
      );
    }
  };

  const getStatusPill = (status) => {
    switch (status) {
      case 1:
        return (
          <span className="status-pill status-pending">
            <i className="fa-regular fa-clock"></i> Chờ duyệt
          </span>
        );
      case 2:
        return (
          <span className="status-pill status-confirmed">
            <i className="fa-solid fa-check"></i> Đã xác nhận
          </span>
        );
      case 3:
        return (
          <span className="status-pill status-inservice">
            <i className="fa-solid fa-arrows-spin fa-spin"></i> Đang rửa
          </span>
        );
      case 4:
        return (
          <span className="status-pill status-completed">
            <i className="fa-regular fa-circle-check"></i> Hoàn thành
          </span>
        );
      case 5:
        return (
          <span className="status-pill status-cancelled">
            <i className="fa-regular fa-circle-xmark"></i> Đã hủy
          </span>
        );
      default:
        return <span className="status-pill">{status}</span>;
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

  return (
    <div className="admin-dashboard-container portal-layout-container">
      <Sidebar />
      <main className="admin-main-content portal-main-content">
        <header className="admin-header">
          <div className="admin-header-title">
            <h1>Tổng Quan Quản Trị</h1>
            <p>Hệ thống Smart Car Wash System điều phối thời gian thực</p>
          </div>
          <div className="admin-header-actions">
            <div
              className="admin-user-profile"
              style={{ cursor: "pointer" }}
              onClick={() => (window.location.href = "/profile")}
            >
              <div className="admin-avatar">
                {currentUser?.fullName
                  ? currentUser.fullName.substring(0, 2).toUpperCase()
                  : "AD"}
              </div>
              <div className="admin-user-info">
                <span>{currentUser?.fullName || "Quản trị viên"}</span>
                <small>Role: Admin</small>
              </div>
            </div>
          </div>
        </header>

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
          <div className="admin-metric-card metric-cancelled">
            <div className="admin-metric-info">
              <h3>Đã hủy</h3>
              <p className="admin-metric-value">{stats.cancelled}</p>
            </div>
            <div className="admin-metric-icon">
              <i className="fa-regular fa-circle-xmark"></i>
            </div>
          </div>
        </section>

        {/* BỘ LỌC TÌM KIẾM DÀNH CHO ADMIN */}
        <section
          className="admin-filter-toolbar"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            background: "var(--bg-card)",
            padding: "16px",
            borderRadius: "16px",
            border: "1px solid var(--border)",
            marginBottom: "24px",
          }}
        >
          <div
            className="filter-item"
            style={{ flex: 2, minWidth: "220px", position: "relative" }}
          >
            <i
              className="fa-solid fa-magnifying-glass"
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-secondary)",
              }}
            ></i>
            <input
              type="text"
              placeholder="Tìm tên khách, SĐT, biển số..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{
                width: "100%",
                height: "42px",
                paddingLeft: "40px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </div>
          <div className="filter-item" style={{ flex: 1, minWidth: "150px" }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: "100%",
                height: "42px",
                padding: "0 16px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            >
              <option value="All">Trạng thái: Tất cả</option>
              <option value="2">Đã xác nhận</option>
              <option value="3">Đang làm dịch vụ</option>
              <option value="4">Hoàn thành</option>
              <option value="5">Đã hủy</option>
            </select>
          </div>
          <div className="filter-item" style={{ flex: 1, minWidth: "150px" }}>
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              style={{
                width: "100%",
                height: "42px",
                padding: "0 16px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            >
              <option value="All">Loại xe: Tất cả</option>
              <option value="CAR">Ô tô</option>
              <option value="BIKE">Xe máy</option>
            </select>
          </div>
          <div className="filter-item" style={{ flex: 1, minWidth: "150px" }}>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                width: "100%",
                height: "42px",
                padding: "0 16px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </div>
          <button
            onClick={handleResetFilters}
            style={{
              height: "42px",
              padding: "0 20px",
              borderRadius: "10px",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            <i className="fa-solid fa-rotate-left"></i> Đặt lại
          </button>
        </section>

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
          ) : bookings.length === 0 ? (
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
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div className="customer-cell-info">
                          <span className="customer-name">
                            {b.customerName}
                          </span>
                          <span className="customer-phone">{b.phone}</span>
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{
                              color: "var(--color-accent)",
                              fontSize: "16px",
                            }}
                          >
                            {getVehicleIcon(b.vehicleType)}
                          </span>
                          <div>
                            <span className="vehicle-badge">
                              {b.licensePlate}
                            </span>
                            <span className="vehicle-type-label">
                              {b.vehicleType}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>{b.servicePackage}</td>
                      <td>
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span style={{ fontWeight: 600 }}>{b.time}</span>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {b.date}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: "#fff" }}>
                        <div>{b.price?.toLocaleString("vi-VN")} đ</div>
                        {(() => {
                          const paid =
                            b.paidAmount !== undefined
                              ? b.paidAmount
                              : b.PaidAmount || 0;
                          const price = b.price || 0;
                          if (Number(b.status) === 4)
                            return (
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#10b981",
                                  marginTop: "4px",
                                  fontWeight: "normal",
                                }}
                              >
                                <i className="fa-solid fa-circle-check"></i> Đã
                                thu đủ
                              </div>
                            );
                          if (Number(b.status) === 5) return null;
                          if (paid > 0) {
                            if (paid >= price)
                              return (
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "#10b981",
                                    marginTop: "4px",
                                    fontWeight: "normal",
                                  }}
                                >
                                  <i className="fa-solid fa-credit-card"></i> Đã
                                  trả đủ (Online)
                                </div>
                              );
                            return (
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#f59e0b",
                                  marginTop: "4px",
                                  fontWeight: "normal",
                                  lineHeight: "1.3",
                                }}
                              >
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: "10px",
                                    color: "#9ca3af",
                                  }}
                                >
                                  Đã cọc: {paid.toLocaleString("vi-VN")}đ
                                </span>
                                <span
                                  style={{
                                    display: "block",
                                    fontWeight: "bold",
                                  }}
                                >
                                  Còn lại:{" "}
                                  {(price - paid).toLocaleString("vi-VN")}đ
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#9ca3af",
                                marginTop: "4px",
                                fontWeight: "normal",
                              }}
                            >
                              Thu sau tại quầy
                            </div>
                          );
                        })()}
                      </td>
                      <td>{getStatusPill(b.status)}</td>
                      <td>
                        <div className="table-actions">
                          {b.status === 2 && (
                            <>
                              <button
                                className="action-icon-btn btn-wash"
                                title="Bắt đầu rửa"
                                onClick={() => handleStatusUpdate(b.id, 3)}
                              >
                                <i className="fa-solid fa-soap"></i>
                              </button>
                              <button
                                className="action-icon-btn btn-cancel"
                                title="Hủy bỏ"
                                onClick={() => handleStatusUpdate(b.id, 5)}
                              >
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </>
                          )}
                          {b.status === 3 && (
                            <button
                              className="action-icon-btn btn-complete"
                              title="Hoàn thành rửa"
                              onClick={() => handleStatusUpdate(b.id, 4)}
                            >
                              <i className="fa-solid fa-circle-check"></i>
                            </button>
                          )}
                          {(b.status === 4 || b.status === 5) && (
                            <button
                              className="action-icon-btn btn-cancel"
                              title="Xóa lịch đặt"
                              onClick={() => handleDeleteBooking(b.id)}
                            >
                              <i className="fa-regular fa-trash-can"></i>
                            </button>
                          )}
                          <button
                            className="action-icon-btn btn-details"
                            title="Chi tiết"
                            onClick={() => setSelectedBooking(b)}
                          >
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

      {selectedBooking && (
        <div
          className="admin-modal-overlay"
          onClick={() => setSelectedBooking(null)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Chi Tiết Lịch Đặt Xe #{selectedBooking.id}</h3>
              <button
                className="close-modal-btn"
                onClick={() => setSelectedBooking(null)}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="admin-modal-body">
              {/* Modal Body Content (Omitted unchanged HTML structure for brevity, keeps existing design) */}
              <div className="modal-timeline">
                <div
                  className={`timeline-step ${selectedBooking.status >= 2 ? (selectedBooking.status === 5 ? "" : "completed") : ""} ${selectedBooking.status === 2 ? "active" : ""}`}
                >
                  <div className="timeline-node">1</div>
                  <div className="timeline-label">Xác nhận</div>
                </div>
                <div
                  className={`timeline-step ${selectedBooking.status >= 3 ? (selectedBooking.status === 5 ? "" : "completed") : ""} ${selectedBooking.status === 3 ? "active" : ""}`}
                >
                  <div className="timeline-node">2</div>
                  <div className="timeline-label">Đang rửa</div>
                </div>
                <div
                  className={`timeline-step ${selectedBooking.status === 4 ? "completed active" : ""} ${selectedBooking.status === 5 ? "active" : ""}`}
                >
                  <div
                    className="timeline-node"
                    style={{
                      backgroundColor:
                        selectedBooking.status === 5
                          ? "var(--color-danger)"
                          : "",
                    }}
                  >
                    {selectedBooking.status === 5 ? (
                      <i className="fa-solid fa-xmark"></i>
                    ) : (
                      "3"
                    )}
                  </div>
                  <div className="timeline-label">
                    {selectedBooking.status === 5 ? "Đã hủy" : "Hoàn thành"}
                  </div>
                </div>
              </div>
              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid var(--border-color)",
                  margin: "24px 0",
                }}
              />
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
                <h4 className="modal-section-title">Thông tin dịch vụ</h4>
                <div className="modal-grid">
                  <div className="modal-field">
                    <label>Biển số xe</label>
                    <span className="vehicle-badge">
                      {selectedBooking.licensePlate}
                    </span>
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
                    <span>
                      {selectedBooking.time} ({selectedBooking.date})
                    </span>
                  </div>
                  <div className="modal-field">
                    <label>Giá dịch vụ gốc</label>
                    <span>
                      {(
                        selectedBooking.totalPrice ||
                        selectedBooking.price ||
                        0
                      ).toLocaleString("vi-VN")}{" "}
                      đ
                    </span>
                  </div>
                  <div className="modal-field">
                    <label>Tổng thanh toán</label>
                    <span
                      style={{
                        color: "var(--color-success)",
                        fontWeight: "bold",
                      }}
                    >
                      {selectedBooking.price?.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`admin-toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}
        >
          <i
            className={
              toast.type === "error"
                ? "fa-solid fa-triangle-exclamation"
                : "fa-regular fa-circle-check"
            }
          ></i>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
