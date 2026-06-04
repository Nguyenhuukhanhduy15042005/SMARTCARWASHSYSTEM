import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

export default function StaffDashboard() {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, completed: 0 });
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("LOGIN_USER");
    return saved ? JSON.parse(saved) : null;
  });

  const API_URL = "http://localhost:5000/api/bookings";

  // Dynamic import of premium Google Fonts & FontAwesome icons
  useEffect(() => {
    const linkFont = document.createElement("link");
    linkFont.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap";
    linkFont.rel = "stylesheet";
    document.head.appendChild(linkFont);

    const linkIcons = document.createElement("link");
    linkIcons.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    linkIcons.rel = "stylesheet";
    document.head.appendChild(linkIcons);

    // Inject CSS keyframes for rotation animations
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleSheet);
  }, []);

  // Fetch Booking lists
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Không thể tải danh sách đặt lịch.");
      const data = await res.json();
      setBookings(data);
      setFilteredBookings(data);
      calculateStats(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const total = data.length;
    const pending = data.filter(b => String(b.Status) === "1").length;
    const active = data.filter(b => String(b.Status) === "3" || String(b.Status) === "2").length;
    const completed = data.filter(b => String(b.Status) === "4").length;
    setStats({ total, pending, active, completed });
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Status Filter
  useEffect(() => {
    if (selectedStatus === "All") {
      setFilteredBookings(bookings);
    } else {
      setFilteredBookings(bookings.filter(b => String(b.Status) === selectedStatus));
    }
  }, [selectedStatus, bookings]);

  // Transition Handler
  const handleTransition = async (bookingId, nextStatus) => {
    try {
      const res = await fetch(`${API_URL}/${bookingId}/transition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nextStatus }),
      });

      if (!res.ok) throw new Error("Cập nhật trạng thái thất bại.");

      fetchBookings();
      if (selectedBooking && selectedBooking.BookingID === bookingId) {
        setSelectedBooking(prev => ({ ...prev, Status: nextStatus }));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const getStatusDetails = (status) => {
    const statusStr = String(status);
    switch (statusStr) {
      case "1":
        return { bg: "rgba(245, 158, 11, 0.1)", text: "Chờ duyệt", dotBg: "#f59e0b", shadow: "0 0 12px rgba(245, 158, 11, 0.3)" };
      case "2":
        return { bg: "rgba(59, 130, 246, 0.1)", text: "Đã nhận", dotBg: "#3b82f6", shadow: "0 0 12px rgba(59, 130, 246, 0.3)" };
      case "3":
        return { bg: "rgba(6, 182, 212, 0.1)", text: "Đang rửa", dotBg: "#06b6d4", shadow: "0 0 12px rgba(6, 182, 212, 0.3)" };
      case "4":
        return { bg: "rgba(16, 185, 129, 0.1)", text: "Hoàn tất", dotBg: "#10b981", shadow: "0 0 12px rgba(16, 185, 129, 0.3)" };
      case "5":
        return { bg: "rgba(239, 68, 68, 0.1)", text: "Đã hủy", dotBg: "#ef4444", shadow: "0 0 12px rgba(239, 68, 68, 0.3)" };
      default:
        return { bg: "rgba(107, 114, 128, 0.1)", text: status, dotBg: "#6b7280", shadow: "none" };
    }
  };

  return (
    <div className="portal-layout-container" style={{ ...styles.container, padding: 0 }}>
      <Sidebar />
      <div className="portal-main-content" style={{ display: "flex", flexDirection: "column", flex: 1, padding: "40px 20px", position: "relative" }}>
        {/* Background cyber-glow spheres */}
        <div style={styles.glowSphereLeft}></div>
        <div style={styles.glowSphereRight}></div>

        {/* Main glass card wrapper */}
        <div style={styles.dashboardCard}>
          <header style={styles.header}>
          <div>
            <div style={styles.logoBadge}><i className="fa-solid fa-users-gear"></i> Staff Workspace</div>
            <h1 style={styles.title}>Lịch Đặt Xe & Điều Phối</h1>
            <p style={styles.subtitle}>Không gian làm việc quản lý dịch vụ dành cho Nhân viên (Staff)</p>
          </div>
          <button style={styles.refreshBtn} onClick={fetchBookings}>
            <i className="fa-solid fa-arrows-rotate"></i> Làm mới dữ liệu
          </button>
        </header>

        {/* Dashboard KPI cards */}
        <section style={styles.statsGrid}>
          <div style={{ ...styles.statItem, borderLeft: "4px solid #6366f1" }}>
            <div style={styles.statIconWrapper}><i className="fa-solid fa-calendar-check" style={{ color: "#6366f1" }}></i></div>
            <div>
              <div style={styles.statValue}>{stats.total}</div>
              <div style={styles.statLabel}>Tổng lịch hôm nay</div>
            </div>
          </div>
          <div style={{ ...styles.statItem, borderLeft: "4px solid #f59e0b" }}>
            <div style={styles.statIconWrapper}><i className="fa-solid fa-hourglass-half" style={{ color: "#f59e0b" }}></i></div>
            <div>
              <div style={styles.statValue}>{stats.pending}</div>
              <div style={styles.statLabel}>Đang chờ duyệt</div>
            </div>
          </div>
          <div style={{ ...styles.statItem, borderLeft: "4px solid #06b6d4" }}>
            <div style={styles.statIconWrapper}><i className="fa-solid fa-screwdriver-wrench" style={{ color: "#06b6d4" }}></i></div>
            <div>
              <div style={styles.statValue}>{stats.active}</div>
              <div style={styles.statLabel}>Đang thực hiện</div>
            </div>
          </div>
          <div style={{ ...styles.statItem, borderLeft: "4px solid #10b981" }}>
            <div style={styles.statIconWrapper}><i className="fa-solid fa-check-double" style={{ color: "#10b981" }}></i></div>
            <div>
              <div style={styles.statValue}>{stats.completed}</div>
              <div style={styles.statLabel}>Đã hoàn thành</div>
            </div>
          </div>
        </section>

        {/* Filters and Search segment */}
        <div style={styles.filterSection}>
          <div style={styles.filterBar}>
            {["All", "1", "2", "3", "4", "5"].map(status => (
              <button
                key={status}
                style={{
                  ...styles.filterTab,
                  ...(selectedStatus === status ? styles.activeFilterTab : {})
                }}
                onClick={() => setSelectedStatus(status)}
              >
                {status === "All" && "Tất cả"}
                {status === "1" && "Chờ duyệt"}
                {status === "2" && "Đã nhận"}
                {status === "3" && "Đang rửa"}
                {status === "4" && "Hoàn tất"}
                {status === "5" && "Đã hủy"}
              </button>
            ))}
          </div>
        </div>

        {/* Data area */}
        {loading ? (
          <div style={styles.loader}>
            <div style={styles.spinner}></div>
            <p>Đang đồng bộ dữ liệu với SQL Server...</p>
          </div>
        ) : error ? (
          <div style={styles.errorCard}>
            <i className="fa-solid fa-circle-exclamation" style={{ fontSize: "24px", marginBottom: "10px" }}></i>
            <h3>Kết nối thất bại</h3>
            <p>{error}</p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Mã</th>
                  <th style={styles.th}>Khách hàng / SĐT</th>
                  <th style={styles.th}>Thông tin xe</th>
                  <th style={styles.th}>Thời gian đặt</th>
                  <th style={styles.th}>Trạng thái</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Thao tác điều phối</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => {
                  const badge = getStatusDetails(booking.Status);
                  return (
                    <tr key={booking.BookingID} style={styles.tr}>
                      <td style={styles.td}>
                        <span style={styles.idBadge}>#{booking.BookingID}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.customerName}>{booking.CustomerName || "Khách vãng lai"}</div>
                        <div style={styles.customerPhone}>
                          <i className="fa-solid fa-phone" style={{ fontSize: "10px", marginRight: "4px" }}></i>
                          {booking.Phone || "Không có SĐT"}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.licensePlate}>{booking.LicensePlate || "Chưa có biển"}</div>
                        <div style={styles.vehicleType}>
                          <i className="fa-solid fa-car" style={{ fontSize: "10px", marginRight: "4px" }}></i>
                          {booking.VehicleType || "Xe hơi"}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.bookingDate}>
                          {new Date(booking.BookingDate).toLocaleDateString("vi-VN")}
                        </div>
                        <div style={styles.bookingTime}>
                          <i className="fa-regular fa-clock" style={{ fontSize: "10px", marginRight: "4px" }}></i>
                          {new Date(booking.BookingDate).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.text}`,
                          boxShadow: badge.shadow
                        }}>
                          <span style={{ ...styles.statusDot, backgroundColor: badge.dotBg }}></span>
                          {badge.text}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionGroup}>
                          <button style={styles.viewBtn} onClick={() => setSelectedBooking(booking)} title="Xem chi tiết">
                            <i className="fa-solid fa-eye"></i> Chi tiết
                          </button>
                          
                          {/* FSM Actions */}
                          {String(booking.Status) === "1" && (
                            <button style={styles.btnConfirm} onClick={() => handleTransition(booking.BookingID, 2)}>
                              <i className="fa-solid fa-circle-check"></i> Nhận lịch
                            </button>
                          )}
                          {String(booking.Status) === "2" && (
                            <button style={styles.btnStart} onClick={() => handleTransition(booking.BookingID, 3)}>
                              <i className="fa-solid fa-play"></i> Bắt đầu rửa
                            </button>
                          )}
                          {String(booking.Status) === "3" && (
                            <button style={styles.btnComplete} onClick={() => handleTransition(booking.BookingID, 4)}>
                              <i className="fa-solid fa-flag-checkered"></i> Hoàn thành
                            </button>
                          )}
                          {(String(booking.Status) === "1" || String(booking.Status) === "2") && (
                            <button style={styles.btnCancel} onClick={() => handleTransition(booking.BookingID, 5)}>
                              <i className="fa-solid fa-ban"></i> Hủy
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan="6" style={styles.noData}>
                      <i className="fa-regular fa-folder-open" style={{ fontSize: "40px", color: "#4b5563", marginBottom: "15px", display: "block" }}></i>
                      Không tìm thấy lịch đặt xe nào ở trạng thái này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL GLASS MODAL */}
      {selectedBooking && (
        <div style={styles.modalOverlay} onClick={() => setSelectedBooking(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.idBadge}>#{selectedBooking.BookingID}</span>
                <h2 style={{ margin: "5px 0 0 0", color: "#fff", fontSize: "20px" }}>Thông Tin Đặt Lịch Chi Tiết</h2>
              </div>
              <button style={styles.closeBtn} onClick={() => setSelectedBooking(null)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.modalGrid}>
                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>Khách hàng</label>
                  <div style={styles.modalValue}>{selectedBooking.CustomerName || "Khách vãng lai"}</div>
                </div>
                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>Số điện thoại</label>
                  <div style={styles.modalValue}>{selectedBooking.Phone || "Không cung cấp"}</div>
                </div>
                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>Biển số xe</label>
                  <div style={{ ...styles.modalValue, color: "#3b82f6", fontWeight: "700" }}>{selectedBooking.LicensePlate || "N/A"}</div>
                </div>
                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>Dòng xe / Loại xe</label>
                  <div style={styles.modalValue}>{selectedBooking.VehicleType || "Xe hơi"}</div>
                </div>
                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>Thời gian đặt lịch</label>
                  <div style={styles.modalValue}>
                    {new Date(selectedBooking.BookingDate).toLocaleString("vi-VN", { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>Trạng thái hiện tại</label>
                  <div style={{ marginTop: "5px" }}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: getStatusDetails(selectedBooking.Status).bg,
                      color: getStatusDetails(selectedBooking.Status).text,
                      border: `1px solid ${getStatusDetails(selectedBooking.Status).text}`
                    }}>
                      <span style={{ ...styles.statusDot, backgroundColor: getStatusDetails(selectedBooking.Status).dotBg }}></span>
                      {getStatusDetails(selectedBooking.Status).text}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price Details section */}
              <div style={styles.priceContainer}>
                <div style={styles.priceRow}>
                  <span>Giá dịch vụ gốc:</span>
                  <span>{(selectedBooking.TotalPrice || 0).toLocaleString("vi-VN")} đ</span>
                </div>
                <div style={{ ...styles.priceRow, color: "#10b981", fontWeight: "600", fontSize: "18px", borderTop: "1px solid #2d2d34", paddingTop: "10px", marginTop: "10px" }}>
                  <span>Tổng thanh toán:</span>
                  <span>{(selectedBooking.FinalPrice || selectedBooking.TotalPrice || 0).toLocaleString("vi-VN")} đ</span>
                </div>
              </div>

              {selectedBooking.Notes && (
                <div style={{ marginTop: "15px" }}>
                  <label style={styles.modalLabel}>Ghi chú khách hàng</label>
                  <div style={styles.notesBox}>"{selectedBooking.Notes}"</div>
                </div>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.modalCloseBtn} onClick={() => setSelectedBooking(null)}>Đóng thông tin</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// ========================================================
// PREMIUM UI CSS SYSTEM (Pure Javascript Objects)
// ========================================================
const styles = {
  container: {
    backgroundColor: "#030712",
    backgroundImage: "radial-gradient(at 0% 0%, rgba(17, 24, 39, 0.8) 0, transparent 50%), radial-gradient(at 50% 0%, rgba(99, 102, 241, 0.05) 0, transparent 50%)",
    color: "#f3f4f6",
    minHeight: "100vh",
    padding: "40px 20px",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    position: "relative",
    overflow: "hidden"
  },
  navbar: {
    maxWidth: "1280px",
    margin: "0 auto 25px auto",
    backgroundColor: "rgba(17, 24, 39, 0.6)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "16px",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    padding: "15px 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
    zIndex: 2,
    position: "relative"
  },
  navLogo: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  logoImg: {
    height: "38px",
    width: "38px",
    objectFit: "cover",
    borderRadius: "50%",
    border: "1px solid rgba(255, 255, 255, 0.15)"
  },
  navLinks: {
    display: "flex",
    gap: "10px"
  },
  navLink: {
    backgroundColor: "transparent",
    border: "none",
    color: "#9ca3af",
    padding: "10px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  activeNavLink: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    color: "#818cf8"
  },
  navUser: {
    display: "flex",
    alignItems: "center",
    gap: "15px"
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#818cf8"
  },
  userInfo: {
    display: "flex",
    flexDirection: "column"
  },
  userName: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#ffffff"
  },
  userRole: {
    fontSize: "10px",
    color: "#9ca3af",
    marginTop: "2px"
  },
  logoutBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    color: "#ef4444",
    padding: "8px 14px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "rgba(239, 68, 68, 0.2)",
      boxShadow: "0 0 10px rgba(239, 68, 68, 0.2)"
    }
  },
  glowSphereLeft: {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0) 70%)",
    top: "10%",
    left: "-10%",
    zIndex: 0,
    pointerEvents: "none"
  },
  glowSphereRight: {
    position: "absolute",
    width: "450px",
    height: "450px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(6, 182, 212, 0.06) 0%, rgba(6, 182, 212, 0) 70%)",
    bottom: "10%",
    right: "-10%",
    zIndex: 0,
    pointerEvents: "none"
  },
  dashboardCard: {
    maxWidth: "1280px",
    margin: "0 auto",
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "24px",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    padding: "40px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    position: "relative",
    zIndex: 1
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "35px",
    flexWrap: "wrap",
    gap: "20px"
  },
  logoBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    color: "#818cf8",
    padding: "6px 12px",
    borderRadius: "30px",
    fontSize: "12px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginBottom: "12px"
  },
  title: {
    fontSize: "32px",
    fontWeight: "800",
    color: "#ffffff",
    margin: 0,
    letterSpacing: "-0.5px"
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: "15px",
    margin: "8px 0 0 0"
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
    boxShadow: "0 4px 14px 0 rgba(99, 102, 241, 0.35)",
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    ":hover": {
      backgroundColor: "#4f46e5",
      boxShadow: "0 6px 20px 0 rgba(99, 102, 241, 0.45)"
    }
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "20px",
    marginBottom: "35px"
  },
  statItem: {
    backgroundColor: "rgba(31, 41, 55, 0.3)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    borderRadius: "16px",
    padding: "24px",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)"
  },
  statIconWrapper: {
    width: "50px",
    height: "50px",
    borderRadius: "12px",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "20px",
    border: "1px solid rgba(255, 255, 255, 0.05)"
  },
  statValue: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#ffffff",
    lineHeight: 1
  },
  statLabel: {
    color: "#9ca3af",
    fontSize: "13px",
    marginTop: "6px",
    fontWeight: "500"
  },
  filterSection: {
    marginBottom: "25px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
    paddingBottom: "15px"
  },
  filterBar: {
    display: "flex",
    gap: "10px",
    overflowX: "auto"
  },
  filterTab: {
    backgroundColor: "transparent",
    border: "1px solid transparent",
    color: "#9ca3af",
    padding: "10px 20px",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    whiteSpace: "nowrap"
  },
  activeFilterTab: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    color: "#818cf8",
    borderColor: "rgba(99, 102, 241, 0.2)"
  },
  tableWrapper: {
    backgroundColor: "rgba(17, 24, 39, 0.2)",
    borderRadius: "16px",
    overflow: "hidden",
    border: "1px solid rgba(255, 255, 255, 0.05)"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left"
  },
  thRow: {
    backgroundColor: "rgba(31, 41, 55, 0.4)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)"
  },
  th: {
    padding: "18px 24px",
    color: "#9ca3af",
    fontSize: "13px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "1px"
  },
  tr: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
    transition: "background-color 0.2s ease"
  },
  td: {
    padding: "20px 24px",
    fontSize: "14px",
    verticalAlign: "middle"
  },
  idBadge: {
    fontFamily: "monospace",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    color: "#ffffff",
    padding: "4px 8px",
    borderRadius: "6px",
    fontWeight: "600",
    border: "1px solid rgba(255, 255, 255, 0.1)"
  },
  customerName: {
    fontWeight: "600",
    color: "#ffffff",
    fontSize: "15px"
  },
  customerPhone: {
    color: "#9ca3af",
    fontSize: "13px",
    marginTop: "4px",
    display: "flex",
    alignItems: "center"
  },
  licensePlate: {
    fontWeight: "700",
    color: "#60a5fa",
    fontSize: "15px"
  },
  vehicleType: {
    color: "#9ca3af",
    fontSize: "13px",
    marginTop: "4px",
    display: "flex",
    alignItems: "center"
  },
  bookingDate: {
    color: "#ffffff",
    fontWeight: "500"
  },
  bookingTime: {
    color: "#9ca3af",
    fontSize: "13px",
    marginTop: "4px",
    display: "flex",
    alignItems: "center"
  },
  badge: {
    padding: "6px 14px",
    borderRadius: "30px",
    fontSize: "12px",
    fontWeight: "700",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px"
  },
  statusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    display: "inline-block"
  },
  actionGroup: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
    alignItems: "center"
  },
  viewBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    color: "#f3f4f6",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.2s ease"
  },
  btnConfirm: {
    backgroundColor: "#2563eb",
    border: "none",
    color: "#ffffff",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.2s"
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
    transition: "all 0.2s"
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
    transition: "all 0.2s"
  },
  btnCancel: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#f87171",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.2s"
  },
  noData: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#9ca3af",
    fontSize: "15px"
  },
  loader: {
    textAlign: "center",
    padding: "60px",
    color: "#9ca3af"
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid rgba(99, 102, 241, 0.2)",
    borderTop: "3px solid #6366f1",
    borderRadius: "50%",
    margin: "0 auto 15px auto",
    animation: "spin 1s linear infinite"
  },
  errorCard: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    color: "#f87171",
    padding: "30px",
    borderRadius: "16px",
    textAlign: "center",
    maxWidth: "400px",
    margin: "40px auto"
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(3, 7, 18, 0.8)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: "#111827",
    backgroundImage: "radial-gradient(at 0% 0%, rgba(31, 41, 55, 0.5) 0, transparent 60%)",
    borderRadius: "20px",
    width: "550px",
    maxWidth: "95%",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)"
  },
  modalHeader: {
    padding: "24px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#9ca3af",
    fontSize: "20px",
    cursor: "pointer"
  },
  modalBody: {
    padding: "24px",
    maxHeight: "70vh",
    overflowY: "auto"
  },
  modalGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px"
  },
  modalField: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  modalLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  modalValue: {
    fontSize: "15px",
    color: "#ffffff",
    fontWeight: "500"
  },
  priceContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: "12px",
    padding: "16px",
    marginTop: "20px",
    border: "1px solid rgba(255, 255, 255, 0.04)"
  },
  priceRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    color: "#9ca3af"
  },
  notesBox: {
    backgroundColor: "rgba(245, 158, 11, 0.05)",
    borderLeft: "3px solid #f59e0b",
    padding: "12px",
    borderRadius: "0 8px 8px 0",
    color: "#f59e0b",
    fontSize: "14px",
    fontStyle: "italic",
    marginTop: "6px"
  },
  modalFooter: {
    padding: "18px 24px",
    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
    display: "flex",
    justifyContent: "flex-end"
  },
  modalCloseBtn: {
    backgroundColor: "#1f2937",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    color: "#ffffff",
    padding: "10px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600"
  }
};
