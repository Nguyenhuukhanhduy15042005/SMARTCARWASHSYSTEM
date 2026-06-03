import React, { useState, useEffect } from "react";

export default function UserDashboard() {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Mock customer ID for demonstration (usually derived from decoded login token)
  const [customerId, setCustomerId] = useState(1); 
  const [customerName, setCustomerName] = useState("Nguyễn Văn A");
  const [points, setPoints] = useState(85); // Mock loyalty points

  const API_URL = `http://localhost:5000/api/bookings/customer/${customerId}`;

  useEffect(() => {
    // Dynamic import of Google Fonts and FontAwesome
    const linkFont = document.createElement("link");
    linkFont.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap";
    linkFont.rel = "stylesheet";
    document.head.appendChild(linkFont);

    const linkIcons = document.createElement("link");
    linkIcons.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    linkIcons.rel = "stylesheet";
    document.head.appendChild(linkIcons);

    // Inject CSS keyframes for rotation and blinking animations
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
    `;
    document.head.appendChild(styleSheet);
  }, []);

  const fetchUserBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Không thể tải lịch sử đặt xe.");
      const data = await res.json();
      setBookings(data);
      if (data.length > 0) {
        setCustomerName(data[0].CustomerName || "Nguyễn Văn A");
      }
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserBookings();
  }, [customerId]);

  const getStatusDetails = (status) => {
    switch (status) {
      case "Pending": return { text: "Chờ duyệt", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", icon: "fa-solid fa-hourglass-start" };
      case "Confirmed": return { text: "Đã nhận lịch", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", icon: "fa-solid fa-circle-check" };
      case "In Service": return { text: "Đang rửa xe", color: "#06b6d4", bg: "rgba(6, 182, 212, 0.1)", icon: "fa-solid fa-soap" };
      case "Completed": return { text: "Hoàn tất", color: "#10b981", bg: "rgba(16, 185, 129, 0.1)", icon: "fa-solid fa-circle-check" };
      case "Cancelled": return { text: "Đã hủy", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", icon: "fa-solid fa-circle-xmark" };
      default: return { text: status, color: "#9ca3af", bg: "rgba(156, 163, 175, 0.1)", icon: "fa-solid fa-circle-question" };
    }
  };

  // Helper to determine active step in visual timeline
  const getTimelineStep = (status) => {
    switch (status) {
      case "Pending": return 0;
      case "Confirmed": return 1;
      case "In Service": return 2;
      case "Completed": return 3;
      default: return -1;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.glowSphereLeft}></div>
      <div style={styles.glowSphereRight}></div>

      <div style={styles.dashboardCard}>
        {/* Header Section */}
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Xin chào, {customerName}! 👋</h1>
            <p style={styles.subtitle}>Chào mừng bạn quay lại! Dưới đây là thông tin ưu đãi & lịch sử đặt dịch vụ của bạn.</p>
          </div>
          <button style={styles.refreshBtn} onClick={fetchUserBookings}>
            <i className="fa-solid fa-arrows-rotate"></i> Làm mới lịch sử
          </button>
        </header>

        {/* Top Cards: Loyalty and Info */}
        <section style={styles.infoSection}>
          {/* Member Card */}
          <div style={styles.loyaltyCard}>
            <div style={styles.cardHeader}>
              <span style={styles.cardBrand}>AUTOWASH MEMBER</span>
              <span style={styles.cardTier}>SILVER TIER</span>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.pointsTitle}>TÍCH ĐIỂM THÀNH VIÊN</div>
              <div style={styles.pointsValue}>
                {points} <span style={{ fontSize: "16px", color: "#93c5fd" }}>points</span>
              </div>
              <div style={styles.progressBarWrapper}>
                <div style={{ ...styles.progressBar, width: `${(points / 100) * 100}%` }}></div>
              </div>
              <div style={styles.progressInfo}>Còn 15 points nữa để thăng hạng GOLD TIER</div>
            </div>
          </div>

          {/* Quick Notice Card */}
          <div style={styles.noticeCard}>
            <h3><i className="fa-solid fa-gift" style={{ color: "#f59e0b" }}></i> Ưu đãi đặc quyền của bạn</h3>
            <ul style={styles.noticeList}>
              <li>Giảm giá 10% cho tất cả dịch vụ rửa xe gói cao cấp.</li>
              <li>Miễn phí 1 chai nước suối khi check-in tại quầy chờ.</li>
              <li>Được ưu tiên phục vụ trước trong khung giờ vàng (17:00 - 19:00).</li>
            </ul>
          </div>
        </section>

        {/* Booking History Section */}
        <h2 style={styles.sectionTitle}>Lịch Đặt Rửa Xe Của Bạn</h2>

        {loading ? (
          <div style={styles.loader}>
            <div style={styles.spinner}></div>
            <p>Đang liên kết dữ liệu đặt lịch...</p>
          </div>
        ) : error ? (
          <div style={styles.errorCard}>
            <i className="fa-solid fa-circle-exclamation" style={{ fontSize: "24px", marginBottom: "10px" }}></i>
            <h3>Đồng bộ thất bại</h3>
            <p>{error}</p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Mã Lịch</th>
                  <th style={styles.th}>Biển Số Xe</th>
                  <th style={styles.th}>Loại Xe</th>
                  <th style={styles.th}>Thời Gian</th>
                  <th style={styles.th}>Trạng Thái</th>
                  <th style={styles.th} style={{ textAlign: "right" }}>Theo Dõi</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const details = getStatusDetails(booking.Status);
                  return (
                    <tr key={booking.BookingID} style={styles.tr}>
                      <td style={styles.td}>
                        <span style={styles.idBadge}>#{booking.BookingID}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.licensePlate}>{booking.LicensePlate}</span>
                      </td>
                      <td style={styles.td}>
                        <i className="fa-solid fa-car" style={{ marginRight: "6px", color: "#9ca3af" }}></i>
                        {booking.VehicleType || "Sedan"}
                      </td>
                      <td style={styles.td}>
                        <div>{new Date(booking.BookingDate).toLocaleDateString("vi-VN")}</div>
                        <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "3px" }}>
                          {new Date(booking.BookingDate).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor: details.bg,
                          color: details.color,
                          border: `1px solid ${details.color}`
                        }}>
                          <i className={details.icon} style={{ marginRight: "6px" }}></i>
                          {details.text}
                        </span>
                      </td>
                      <td style={styles.td} style={{ textAlign: "right" }}>
                        <button style={styles.trackBtn} onClick={() => setSelectedBooking(booking)}>
                          <i className="fa-solid fa-route"></i> Tiến độ
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan="6" style={styles.noData}>
                      <i className="fa-regular fa-calendar-times" style={{ fontSize: "40px", color: "#4b5563", marginBottom: "15px", display: "block" }}></i>
                      Bạn chưa đặt lịch rửa xe nào. Hãy tạo lịch đầu tiên!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TRACKING TIMELINE MODAL */}
      {selectedBooking && (
        <div style={styles.modalOverlay} onClick={() => setSelectedBooking(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.idBadge}>#{selectedBooking.BookingID}</span>
                <h2 style={{ margin: "5px 0 0 0", color: "#fff", fontSize: "18px" }}>Theo Dõi Tiến Trình Rửa Xe</h2>
              </div>
              <button style={styles.closeBtn} onClick={() => setSelectedBooking(null)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              {/* Dynamic Timeline Progression Graphic */}
              {selectedBooking.Status === "Cancelled" ? (
                <div style={styles.cancelledBox}>
                  <i className="fa-solid fa-circle-xmark" style={{ fontSize: "32px", marginBottom: "10px" }}></i>
                  <h3>LỊCH ĐẶT ĐÃ BỊ HỦY</h3>
                  <p>Lịch đặt rửa xe này đã bị hủy. Vui lòng liên hệ với quầy hỗ trợ nếu có thắc mắc.</p>
                </div>
              ) : (
                <div style={styles.timelineContainer}>
                  {/* Step 1: Pending */}
                  <div style={styles.timelineItem}>
                    <div style={{
                      ...styles.timelineDot,
                      backgroundColor: getTimelineStep(selectedBooking.Status) >= 0 ? "#10b981" : "#374151",
                      boxShadow: getTimelineStep(selectedBooking.Status) >= 0 ? "0 0 10px #10b981" : "none"
                    }}>
                      <i className="fa-solid fa-calendar-plus" style={{ fontSize: "12px", color: "#fff" }}></i>
                    </div>
                    <div style={styles.timelineContent}>
                      <h4 style={{ margin: 0, color: getTimelineStep(selectedBooking.Status) >= 0 ? "#fff" : "#9ca3af" }}>Bước 1: Đã Đặt Lịch</h4>
                      <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#9ca3af" }}>Yêu cầu đặt lịch của bạn đã gửi lên hệ thống và đang chờ phê duyệt.</p>
                    </div>
                  </div>

                  {/* Step 2: Confirmed */}
                  <div style={styles.timelineItem}>
                    <div style={{
                      ...styles.timelineDot,
                      backgroundColor: getTimelineStep(selectedBooking.Status) >= 1 ? "#10b981" : "#374151",
                      boxShadow: getTimelineStep(selectedBooking.Status) >= 1 ? "0 0 10px #10b981" : "none"
                    }}>
                      <i className="fa-solid fa-thumbs-up" style={{ fontSize: "12px", color: "#fff" }}></i>
                    </div>
                    <div style={styles.timelineContent}>
                      <h4 style={{ margin: 0, color: getTimelineStep(selectedBooking.Status) >= 1 ? "#fff" : "#9ca3af" }}>Bước 2: Đã Xác Nhận</h4>
                      <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#9ca3af" }}>Lịch đã duyệt. Hãy mang xe đến đúng giờ hẹn để được phục vụ tốt nhất.</p>
                    </div>
                  </div>

                  {/* Step 3: In Service */}
                  <div style={styles.timelineItem}>
                    <div style={{
                      ...styles.timelineDot,
                      backgroundColor: getTimelineStep(selectedBooking.Status) >= 2 ? "#06b6d4" : "#374151",
                      boxShadow: getTimelineStep(selectedBooking.Status) === 2 ? "0 0 12px #06b6d4" : getTimelineStep(selectedBooking.Status) > 2 ? "0 0 10px #10b981" : "none",
                      background: getTimelineStep(selectedBooking.Status) === 2 ? "radial-gradient(circle, #06b6d4, #0891b2)" : getTimelineStep(selectedBooking.Status) > 2 ? "#10b981" : "#374151"
                    }}>
                      <i className="fa-solid fa-soap" style={{ fontSize: "12px", color: "#fff" }}></i>
                    </div>
                    <div style={styles.timelineContent}>
                      <h4 style={{ margin: 0, color: getTimelineStep(selectedBooking.Status) >= 2 ? "#fff" : "#9ca3af" }}>
                        Bước 3: Đang Rửa Xe {selectedBooking.Status === "In Service" && <span style={styles.blinkingText}>(Đang xử lý...)</span>}
                      </h4>
                      <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#9ca3af" }}>Kỹ thuật viên đang thực hiện vệ sinh và chăm sóc xe của bạn.</p>
                    </div>
                  </div>

                  {/* Step 4: Completed */}
                  <div style={{ ...styles.timelineItem, borderLeft: "none" }}>
                    <div style={{
                      ...styles.timelineDot,
                      backgroundColor: getTimelineStep(selectedBooking.Status) >= 3 ? "#10b981" : "#374151",
                      boxShadow: getTimelineStep(selectedBooking.Status) >= 3 ? "0 0 10px #10b981" : "none"
                    }}>
                      <i className="fa-solid fa-square-poll-horizontal" style={{ fontSize: "12px", color: "#fff" }}></i>
                    </div>
                    <div style={styles.timelineContent}>
                      <h4 style={{ margin: 0, color: getTimelineStep(selectedBooking.Status) >= 3 ? "#fff" : "#9ca3af" }}>Bước 4: Hoàn Thành</h4>
                      <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#9ca3af" }}>Xe đã rửa sạch bóng! Bạn có thể nhận lại xe và thanh toán tiền.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Booking Info Box */}
              <div style={styles.infoBox}>
                <div style={styles.infoLine}><strong>Dòng xe:</strong> {selectedBooking.VehicleType || "Xe hơi"}</div>
                <div style={styles.infoLine}><strong>Biển số:</strong> <span style={{ color: "#3b82f6", fontWeight: "700" }}>{selectedBooking.LicensePlate}</span></div>
                <div style={styles.infoLine}><strong>Tổng tiền:</strong> {((selectedBooking.FinalPrice || selectedBooking.TotalPrice || 0)).toLocaleString("vi-VN")} đ</div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.modalCloseBtn} onClick={() => setSelectedBooking(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================================
// STYLES SYSTEM
// ========================================================
const styles = {
  container: {
    backgroundColor: "#080710",
    backgroundImage: "radial-gradient(at 0% 0%, rgba(15, 23, 42, 0.9) 0, transparent 50%), radial-gradient(at 100% 0%, rgba(99, 102, 241, 0.05) 0, transparent 40%)",
    color: "#f3f4f6",
    minHeight: "100vh",
    padding: "50px 20px",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    position: "relative",
    overflow: "hidden"
  },
  glowSphereLeft: {
    position: "absolute",
    width: "350px",
    height: "350px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, rgba(99, 102, 241, 0) 70%)",
    top: "5%",
    left: "-5%",
    zIndex: 0,
    pointerEvents: "none"
  },
  glowSphereRight: {
    position: "absolute",
    width: "350px",
    height: "350px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(245, 158, 11, 0.03) 0%, rgba(245, 158, 11, 0) 70%)",
    bottom: "5%",
    right: "-5%",
    zIndex: 0,
    pointerEvents: "none"
  },
  dashboardCard: {
    maxWidth: "1100px",
    margin: "0 auto",
    backgroundColor: "rgba(17, 24, 39, 0.5)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "24px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    padding: "35px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    position: "relative",
    zIndex: 1
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    flexWrap: "wrap",
    gap: "20px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    paddingBottom: "20px"
  },
  title: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#ffffff",
    margin: 0
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: "14px",
    margin: "6px 0 0 0"
  },
  refreshBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    color: "#ffffff",
    padding: "10px 18px",
    borderRadius: "10px",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  infoSection: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "25px",
    marginBottom: "35px"
  },
  loyaltyCard: {
    background: "linear-gradient(135deg, #1e1b4b 0%, #311042 100%)",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px"
  },
  cardBrand: {
    fontSize: "12px",
    fontWeight: "800",
    color: "#a5b4fc",
    letterSpacing: "2px"
  },
  cardTier: {
    fontSize: "11px",
    fontWeight: "700",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: "4px 8px",
    borderRadius: "6px",
    color: "#ffffff"
  },
  cardBody: {},
  pointsTitle: {
    fontSize: "11px",
    color: "#9ca3af",
    letterSpacing: "1px",
    fontWeight: "600"
  },
  pointsValue: {
    fontSize: "36px",
    fontWeight: "800",
    color: "#ffffff",
    margin: "5px 0"
  },
  progressBarWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    height: "6px",
    borderRadius: "3px",
    overflow: "hidden",
    margin: "12px 0 8px 0"
  },
  progressBar: {
    backgroundColor: "#6366f1",
    height: "100%",
    borderRadius: "3px",
    boxShadow: "0 0 8px #6366f1"
  },
  progressInfo: {
    fontSize: "12px",
    color: "#9ca3af"
  },
  noticeCard: {
    backgroundColor: "rgba(31, 41, 55, 0.25)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    borderRadius: "16px",
    padding: "24px"
  },
  noticeList: {
    margin: "12px 0 0 0",
    paddingLeft: "20px",
    color: "#9ca3af",
    fontSize: "13px",
    lineHeight: "1.8"
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "8px"
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
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
  },
  th: {
    padding: "16px 20px",
    color: "#9ca3af",
    fontSize: "12px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  tr: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
    transition: "background-color 0.2s"
  },
  td: {
    padding: "18px 20px",
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
    border: "1px solid rgba(255, 255, 255, 0.08)"
  },
  licensePlate: {
    fontWeight: "700",
    color: "#3b82f6"
  },
  badge: {
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "700",
    display: "inline-flex",
    alignItems: "center"
  },
  trackBtn: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    border: "1px solid rgba(99, 102, 241, 0.2)",
    color: "#818cf8",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.2s"
  },
  noData: {
    textAlign: "center",
    padding: "50px 20px",
    color: "#9ca3af"
  },
  loader: {
    textAlign: "center",
    padding: "50px",
    color: "#9ca3af"
  },
  spinner: {
    width: "35px",
    height: "35px",
    border: "3px solid rgba(99, 102, 241, 0.2)",
    borderTop: "3px solid #6366f1",
    borderRadius: "50%",
    margin: "0 auto 15px auto",
    animation: "spin 1s linear infinite"
  },
  errorCard: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    border: "1px solid rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    padding: "30px",
    borderRadius: "16px",
    textAlign: "center",
    maxWidth: "400px",
    margin: "30px auto"
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(3, 7, 18, 0.8)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: "#0f172a",
    borderRadius: "20px",
    width: "480px",
    maxWidth: "90%",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)"
  },
  modalHeader: {
    padding: "20px 24px",
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
    padding: "24px"
  },
  cancelledBox: {
    textAlign: "center",
    color: "#ef4444",
    padding: "20px 0"
  },
  timelineContainer: {
    display: "flex",
    flexDirection: "column",
    position: "relative"
  },
  timelineItem: {
    display: "flex",
    position: "relative",
    paddingLeft: "35px",
    paddingBottom: "25px",
    borderLeft: "2px solid #1e293b"
  },
  timelineDot: {
    position: "absolute",
    left: "-11px",
    top: "0px",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
    border: "2px solid #0f172a"
  },
  timelineContent: {
    top: "-3px",
    position: "relative"
  },
  blinkingText: {
    fontSize: "11px",
    color: "#06b6d4",
    animation: "blink 1.5s linear infinite",
    marginLeft: "5px",
    fontWeight: "700"
  },
  infoBox: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: "12px",
    padding: "16px",
    marginTop: "20px",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  infoLine: {
    fontSize: "13px",
    color: "#cbd5e1"
  },
  modalFooter: {
    padding: "16px 24px",
    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
    display: "flex",
    justifyContent: "flex-end"
  },
  modalCloseBtn: {
    backgroundColor: "#1e293b",
    border: "none",
    color: "#ffffff",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600"
  }
};
