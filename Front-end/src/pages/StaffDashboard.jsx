// Front-end/src/pages/StaffDashboard.jsx
import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

export default function StaffDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    completed: 0,
  });
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("LOGIN_USER");
    return saved ? JSON.parse(saved) : null;
  });

  // --- FILTER STATES ---
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [vehicleFilter, setVehicleFilter] = useState("All"); // Đã thêm bộ lọc loại xe
  const [dateFilter, setDateFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  const API_URL = "http://localhost:5000/api/bookings";

  // Debounce effect
  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedKeyword(keyword), 500);
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

    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      .staff-filter-input { width: 100%; height: 42px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary); outline: none; }
    `;
    document.head.appendChild(styleSheet);
  }, []);

  // Fetch when filters change
  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedStatus,
    debouncedKeyword,
    dateFilter,
    paymentFilter,
    vehicleFilter,
  ]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || "mock-token";

      const params = new URLSearchParams();
      if (debouncedKeyword) params.append("keyword", debouncedKeyword);
      if (selectedStatus !== "All") params.append("status", selectedStatus);
      if (dateFilter) params.append("date", dateFilter);
      if (paymentFilter) params.append("paymentStatus", paymentFilter);

      const res = await fetch(`${API_URL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không thể tải danh sách đặt lịch.");
      const data = await res.json();

      // Bỏ các lịch đặt chưa cọc/thanh toán (Status = 1)
      let validData = data.filter((b) => String(b.Status) !== "1");

      // Lọc local cho loại xe
      if (vehicleFilter !== "All") {
        validData = validData.filter((b) => b.VehicleType === vehicleFilter);
      }

      const statusPriority = { 2: 1, 3: 2, 4: 3, 5: 4 };
      validData.sort((a, b) => {
        const pA = statusPriority[String(a.Status)] || 99;
        const pB = statusPriority[String(b.Status)] || 99;
        if (pA !== pB) return pA - pB;
        return new Date(b.BookingDate) - new Date(a.BookingDate);
      });

      setBookings(validData);
      calculateStats(validData);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const total = data.length;
    const pending = data.filter((b) => String(b.Status) === "1").length;
    const active = data.filter(
      (b) => String(b.Status) === "3" || String(b.Status) === "2",
    ).length;
    const completed = data.filter((b) => String(b.Status) === "4").length;
    setStats({ total, pending, active, completed });
  };

  const handleResetFilters = () => {
    setKeyword("");
    setDebouncedKeyword("");
    setSelectedStatus("All");
    setVehicleFilter("All");
    setDateFilter("");
    setPaymentFilter("");
  };

  const handleTransition = async (bookingId, nextStatus) => {
    if (Number(nextStatus) === 4) {
      try {
        const freshRes = await fetch(`${API_URL}/${bookingId}`);
        if (freshRes.ok) {
          const freshBooking = await freshRes.json();
          const paid = Number(
            freshBooking.PaidAmount || freshBooking.paidAmount || 0,
          );
          const price = Number(
            freshBooking.FinalPrice ||
              freshBooking.TotalPrice ||
              freshBooking.price ||
              0,
          );
          const remaining = price - paid;
          if (remaining > 0) {
            if (
              !window.confirm(
                `ĐƠN HÀNG CHƯA THANH TOÁN ĐỦ!\n👉 CẦN THU THÊM TIỀN MẶT: ${remaining.toLocaleString("vi-VN")} đ\nBạn xác nhận ĐÃ THU ĐỦ và muốn HOÀN THÀNH?`,
              )
            )
              return;
          } else {
            if (
              !window.confirm(
                "Đơn hàng đã thanh toán đủ online. Xác nhận hoàn tất đơn hàng?",
              )
            )
              return;
          }
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

    try {
      const res = await fetch(`${API_URL}/${bookingId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStatus }),
      });
      if (!res.ok) throw new Error("Cập nhật trạng thái thất bại.");
      fetchBookings();
      if (selectedBooking && selectedBooking.BookingID === bookingId) {
        setSelectedBooking((prev) => ({ ...prev, Status: nextStatus }));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const getStatusDetails = (status) => {
    switch (String(status)) {
      case "1":
        return {
          bg: "rgba(245, 158, 11, 0.1)",
          text: "Chờ duyệt",
          dotBg: "#f59e0b",
          shadow: "0 0 12px rgba(245, 158, 11, 0.3)",
        };
      case "2":
        return {
          bg: "rgba(59, 130, 246, 0.1)",
          text: "Đã nhận",
          dotBg: "#3b82f6",
          shadow: "0 0 12px rgba(59, 130, 246, 0.3)",
        };
      case "3":
        return {
          bg: "rgba(6, 182, 212, 0.1)",
          text: "Đang rửa",
          dotBg: "#06b6d4",
          shadow: "0 0 12px rgba(6, 182, 212, 0.3)",
        };
      case "4":
        return {
          bg: "rgba(16, 185, 129, 0.1)",
          text: "Hoàn tất",
          dotBg: "#10b981",
          shadow: "0 0 12px rgba(16, 185, 129, 0.3)",
        };
      case "5":
        return {
          bg: "rgba(239, 68, 68, 0.1)",
          text: "Đã hủy",
          dotBg: "#ef4444",
          shadow: "0 0 12px rgba(239, 68, 68, 0.3)",
        };
      default:
        return {
          bg: "rgba(107, 114, 128, 0.1)",
          text: status,
          dotBg: "#6b7280",
          shadow: "none",
        };
    }
  };

  return (
    <div
      className="portal-layout-container"
      style={{ ...styles.container, padding: 0 }}
    >
      <Sidebar />
      <div
        className="portal-main-content"
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "40px 20px",
          position: "relative",
        }}
      >
        <div style={styles.glowSphereLeft}></div>
        <div style={styles.glowSphereRight}></div>

        <div style={styles.dashboardCard}>
          <header style={styles.header}>
            <div>
              <div style={styles.logoBadge}>
                <i className="fa-solid fa-users-gear"></i> Staff Workspace
              </div>
              <h1 style={styles.title}>Lịch Đặt Xe & Điều Phối</h1>
              <p style={styles.subtitle}>
                Không gian làm việc quản lý dịch vụ dành cho Nhân viên (Staff)
              </p>
            </div>
            <button style={styles.refreshBtn} onClick={fetchBookings}>
              <i className="fa-solid fa-arrows-rotate"></i> Làm mới dữ liệu
            </button>
          </header>

          <section style={styles.statsGrid}>
            <div
              style={{ ...styles.statItem, borderLeft: "4px solid #6366f1" }}
            >
              <div style={styles.statIconWrapper}>
                <i
                  className="fa-solid fa-calendar-check"
                  style={{ color: "#6366f1" }}
                ></i>
              </div>
              <div>
                <div style={styles.statValue}>{stats.total}</div>
                <div style={styles.statLabel}>Tổng lịch</div>
              </div>
            </div>
            <div
              style={{ ...styles.statItem, borderLeft: "4px solid #06b6d4" }}
            >
              <div style={styles.statIconWrapper}>
                <i
                  className="fa-solid fa-screwdriver-wrench"
                  style={{ color: "#06b6d4" }}
                ></i>
              </div>
              <div>
                <div style={styles.statValue}>{stats.active}</div>
                <div style={styles.statLabel}>Đang thực hiện</div>
              </div>
            </div>
            <div
              style={{ ...styles.statItem, borderLeft: "4px solid #10b981" }}
            >
              <div style={styles.statIconWrapper}>
                <i
                  className="fa-solid fa-check-double"
                  style={{ color: "#10b981" }}
                ></i>
              </div>
              <div>
                <div style={styles.statValue}>{stats.completed}</div>
                <div style={styles.statLabel}>Đã hoàn thành</div>
              </div>
            </div>
          </section>

          {/* TOOLBAR TÌM KIẾM CỦA STAFF */}
          <section
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              background: "var(--bg-secondary)",
              padding: "16px",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              marginBottom: "24px",
            }}
          >
            <div style={{ flex: 2, minWidth: "220px", position: "relative" }}>
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
                className="staff-filter-input"
                style={{ paddingLeft: "40px" }}
                placeholder="Tên, SĐT, Biển số, Mã đơn..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <div style={{ flex: 1, minWidth: "150px" }}>
              <select
                className="staff-filter-input"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="All">Trạng thái: Tất cả</option>
                <option value="2">Đã nhận</option>
                <option value="3">Đang rửa</option>
                <option value="4">Hoàn tất</option>
                <option value="5">Đã hủy</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: "150px" }}>
              <select
                className="staff-filter-input"
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
              >
                <option value="All">Loại xe: Tất cả</option>
                <option value="CAR">Ô tô</option>
                <option value="BIKE">Xe máy</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: "150px" }}>
              <input
                type="date"
                className="staff-filter-input"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <div style={{ flex: 1, minWidth: "150px" }}>
              <select
                className="staff-filter-input"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <option value="">Thanh toán: Tất cả</option>
                <option value="paid">Đã thanh toán</option>
                <option value="unpaid">Chưa thanh toán</option>
              </select>
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
              <i className="fa-solid fa-rotate-left"></i>
            </button>
          </section>

          {loading ? (
            <div style={styles.loader}>
              <div style={styles.spinner}></div>
              <p>Đang đồng bộ dữ liệu...</p>
            </div>
          ) : error ? (
            <div style={styles.errorCard}>
              <i className="fa-solid fa-circle-exclamation"></i>
              <h3>Kết nối thất bại</h3>
              <p>{error}</p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Mã</th>
                    <th style={styles.th}>Khách hàng</th>
                    <th style={styles.th}>Thông tin xe</th>
                    <th style={styles.th}>Thời gian</th>
                    <th style={styles.th}>Thanh toán</th>
                    <th style={styles.th}>Trạng thái</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => {
                    const badge = getStatusDetails(booking.Status);
                    return (
                      <tr key={booking.BookingID} style={styles.tr}>
                        <td style={styles.td}>
                          <span style={styles.idBadge}>
                            #{booking.BookingID}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.customerName}>
                            {booking.CustomerName || "Khách vãng lai"}
                          </div>
                          <div style={styles.customerPhone}>
                            <i
                              className="fa-solid fa-phone"
                              style={{ fontSize: "10px", marginRight: "4px" }}
                            ></i>
                            {booking.Phone || "Không có SĐT"}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.licensePlate}>
                            {booking.LicensePlate}
                          </div>
                          <div style={styles.vehicleType}>
                            <i
                              className="fa-solid fa-car"
                              style={{ fontSize: "10px", marginRight: "4px" }}
                            ></i>
                            {booking.VehicleType}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.bookingDate}>
                            {new Date(booking.BookingDate).toLocaleDateString(
                              "vi-VN",
                            )}
                          </div>
                          <div style={styles.bookingTime}>
                            <i
                              className="fa-regular fa-clock"
                              style={{ fontSize: "10px", marginRight: "4px" }}
                            ></i>
                            {new Date(booking.BookingDate).toLocaleTimeString(
                              "vi-VN",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div
                            style={{
                              fontWeight: 700,
                              color: "var(--text-primary)",
                            }}
                          >
                            {(
                              booking.FinalPrice ||
                              booking.TotalPrice ||
                              0
                            ).toLocaleString("vi-VN")}{" "}
                            đ
                          </div>
                          {(() => {
                            const paid = booking.PaidAmount || 0;
                            const price =
                              booking.FinalPrice || booking.TotalPrice || 0;
                            if (Number(booking.Status) === 4)
                              return (
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "#10b981",
                                    marginTop: "4px",
                                  }}
                                >
                                  <i className="fa-solid fa-circle-check"></i>{" "}
                                  Đã thu đủ
                                </div>
                              );
                            if (Number(booking.Status) === 5) return null;
                            if (paid > 0) {
                              if (paid >= price)
                                return (
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "#10b981",
                                      marginTop: "4px",
                                    }}
                                  >
                                    <i className="fa-solid fa-credit-card"></i>{" "}
                                    Đã trả (Online)
                                  </div>
                                );
                              return (
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "#f59e0b",
                                    marginTop: "4px",
                                    lineHeight: "1.3",
                                  }}
                                >
                                  <span style={{ display: "block" }}>
                                    Cọc: {paid.toLocaleString("vi-VN")}đ
                                  </span>
                                  <span style={{ fontWeight: "bold" }}>
                                    Còn:{" "}
                                    {(price - paid).toLocaleString("vi-VN")}đ
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "var(--text-secondary)",
                                  marginTop: "4px",
                                }}
                              >
                                Thu sau tại quầy
                              </div>
                            );
                          })()}
                        </td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.badge,
                              backgroundColor: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.text}`,
                              boxShadow: badge.shadow,
                            }}
                          >
                            <span
                              style={{
                                ...styles.statusDot,
                                backgroundColor: badge.dotBg,
                              }}
                            ></span>
                            {badge.text}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actionGroup}>
                            <button
                              style={styles.viewBtn}
                              onClick={() => setSelectedBooking(booking)}
                              title="Chi tiết"
                            >
                              <i className="fa-solid fa-eye"></i>
                            </button>
                            {String(booking.Status) === "2" && (
                              <button
                                style={styles.btnStart}
                                onClick={() =>
                                  handleTransition(booking.BookingID, 3)
                                }
                              >
                                <i className="fa-solid fa-play"></i> Rửa
                              </button>
                            )}
                            {String(booking.Status) === "3" && (
                              <button
                                style={styles.btnComplete}
                                onClick={() =>
                                  handleTransition(booking.BookingID, 4)
                                }
                              >
                                <i className="fa-solid fa-flag-checkered"></i>{" "}
                                Xong
                              </button>
                            )}
                            {(String(booking.Status) === "1" ||
                              String(booking.Status) === "2") && (
                              <button
                                style={styles.btnCancel}
                                onClick={() =>
                                  handleTransition(booking.BookingID, 5)
                                }
                              >
                                <i className="fa-solid fa-ban"></i> Hủy
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan="7" style={styles.noData}>
                        <i
                          className="fa-regular fa-folder-open"
                          style={{
                            fontSize: "40px",
                            marginBottom: "15px",
                            display: "block",
                          }}
                        ></i>
                        Trống
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal chi tiết */}
        {selectedBooking && (
          <div
            style={styles.modalOverlay}
            onClick={() => setSelectedBooking(null)}
          >
            <div
              style={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <div>
                  <span style={styles.idBadge}>
                    #{selectedBooking.BookingID}
                  </span>
                  <h2
                    style={{
                      margin: "5px 0 0 0",
                      color: "#fff",
                      fontSize: "20px",
                    }}
                  >
                    Thông Tin Đặt Lịch
                  </h2>
                </div>
                <button
                  style={styles.closeBtn}
                  onClick={() => setSelectedBooking(null)}
                >
                  ✕
                </button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.modalGrid}>
                  <div style={styles.modalField}>
                    <label style={styles.modalLabel}>Khách hàng</label>
                    <div style={styles.modalValue}>
                      {selectedBooking.CustomerName}
                    </div>
                  </div>
                  <div style={styles.modalField}>
                    <label style={styles.modalLabel}>Biển số xe</label>
                    <div
                      style={{
                        ...styles.modalValue,
                        color: "#3b82f6",
                        fontWeight: "700",
                      }}
                    >
                      {selectedBooking.LicensePlate}
                    </div>
                  </div>
                  <div style={styles.modalField}>
                    <label style={styles.modalLabel}>Dịch vụ</label>
                    <div style={styles.modalValue}>
                      {selectedBooking.servicePackage}
                    </div>
                  </div>
                  <div style={styles.modalField}>
                    <label style={styles.modalLabel}>Tổng thanh toán</label>
                    <div
                      style={{
                        ...styles.modalValue,
                        color: "var(--color-success)",
                      }}
                    >
                      {(
                        selectedBooking.FinalPrice ||
                        selectedBooking.TotalPrice ||
                        0
                      ).toLocaleString("vi-VN")}{" "}
                      đ
                    </div>
                  </div>
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button
                  style={styles.modalCloseBtn}
                  onClick={() => setSelectedBooking(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── STYLES ────────────────
const styles = {
  container: {
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
    minHeight: "100vh",
    padding: "40px 20px",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  glowSphereLeft: {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
    top: "10%",
    left: "-10%",
    zIndex: 0,
    pointerEvents: "none",
  },
  glowSphereRight: {
    position: "absolute",
    width: "450px",
    height: "450px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)",
    bottom: "10%",
    right: "-10%",
    zIndex: 0,
    pointerEvents: "none",
  },
  dashboardCard: {
    maxWidth: "100%",
    background: "var(--bg-card)",
    borderRadius: "24px",
    border: "1px solid var(--border)",
    padding: "40px",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)",
    position: "relative",
    zIndex: 1,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "35px",
    flexWrap: "wrap",
    gap: "20px",
  },
  logoBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "rgba(99,102,241,0.15)",
    color: "#818cf8",
    padding: "6px 12px",
    borderRadius: "30px",
    fontSize: "12px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginBottom: "12px",
  },
  title: {
    fontSize: "32px",
    fontWeight: "800",
    color: "var(--text-primary)",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "15px",
    margin: "8px 0 0 0",
  },
  refreshBtn: {
    backgroundColor: "#6366f1",
    border: "none",
    color: "#ffffff",
    padding: "12px 20px",
    borderRadius: "12px",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 4px 14px 0 rgba(99,102,241,0.35)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "20px",
    marginBottom: "25px",
  },
  statItem: {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "24px",
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  statIconWrapper: {
    width: "50px",
    height: "50px",
    borderRadius: "12px",
    background: "var(--bg-primary)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "20px",
    border: "1px solid var(--border)",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: "800",
    color: "var(--text-primary)",
    lineHeight: 1,
  },
  statLabel: {
    color: "var(--text-secondary)",
    fontSize: "13px",
    marginTop: "6px",
    fontWeight: "500",
  },
  tableWrapper: {
    background: "var(--bg-secondary)",
    borderRadius: "16px",
    overflow: "hidden",
    border: "1px solid var(--border)",
  },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  thRow: {
    background: "var(--bg-primary)",
    borderBottom: "1px solid var(--border)",
  },
  th: {
    padding: "18px 24px",
    color: "var(--text-secondary)",
    fontSize: "13px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  tr: { borderBottom: "1px solid var(--border)" },
  td: { padding: "20px 24px", fontSize: "14px", verticalAlign: "middle" },
  idBadge: {
    fontFamily: "monospace",
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
    padding: "4px 8px",
    borderRadius: "6px",
    fontWeight: "600",
    border: "1px solid var(--border)",
  },
  customerName: {
    fontWeight: "600",
    color: "var(--text-primary)",
    fontSize: "15px",
  },
  customerPhone: {
    color: "var(--text-secondary)",
    fontSize: "13px",
    marginTop: "4px",
    display: "flex",
    alignItems: "center",
  },
  licensePlate: { fontWeight: "700", color: "#60a5fa", fontSize: "15px" },
  vehicleType: {
    color: "var(--text-secondary)",
    fontSize: "13px",
    marginTop: "4px",
    display: "flex",
    alignItems: "center",
  },
  bookingDate: { color: "var(--text-primary)", fontWeight: "500" },
  bookingTime: {
    color: "var(--text-secondary)",
    fontSize: "13px",
    marginTop: "4px",
    display: "flex",
    alignItems: "center",
  },
  badge: {
    padding: "6px 14px",
    borderRadius: "30px",
    fontSize: "12px",
    fontWeight: "700",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  statusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    display: "inline-block",
  },
  actionGroup: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  viewBtn: {
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },
  btnStart: {
    backgroundColor: "#06b6d4",
    border: "none",
    color: "#ffffff",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },
  btnComplete: {
    backgroundColor: "#10b981",
    border: "none",
    color: "#ffffff",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },
  btnCancel: {
    backgroundColor: "rgba(239,68,68,0.15)",
    border: "1px solid rgba(239,68,68,0.3)",
    color: "#f87171",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },
  noData: {
    textAlign: "center",
    padding: "60px 20px",
    color: "var(--text-secondary)",
    fontSize: "15px",
  },
  loader: {
    textAlign: "center",
    padding: "60px",
    color: "var(--text-secondary)",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid rgba(99,102,241,0.2)",
    borderTop: "3px solid #6366f1",
    borderRadius: "50%",
    margin: "0 auto 15px auto",
    animation: "spin 1s linear infinite",
  },
  errorCard: {
    backgroundColor: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)",
    color: "#f87171",
    padding: "30px",
    borderRadius: "16px",
    textAlign: "center",
    maxWidth: "400px",
    margin: "40px auto",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(8px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    background: "var(--bg-card)",
    borderRadius: "20px",
    width: "500px",
    maxWidth: "95%",
    border: "1px solid var(--border)",
    overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
  },
  modalHeader: {
    padding: "24px",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    fontSize: "20px",
    cursor: "pointer",
  },
  modalBody: { padding: "24px", maxHeight: "70vh", overflowY: "auto" },
  modalGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
  modalField: { display: "flex", flexDirection: "column", gap: "6px" },
  modalLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
  },
  modalValue: {
    fontSize: "15px",
    color: "var(--text-primary)",
    fontWeight: "500",
  },
  modalFooter: {
    padding: "18px 24px",
    borderTop: "1px solid var(--border)",
    display: "flex",
    justifyContent: "flex-end",
  },
  modalCloseBtn: {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    padding: "10px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
  },
};
