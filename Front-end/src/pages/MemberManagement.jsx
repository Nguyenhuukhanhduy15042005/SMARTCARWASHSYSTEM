import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://localhost:5000/api";

export default function MemberManagement() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [editForm, setEditForm] = useState({ currentPoints: 0, accumulatedPoints: 0, tierId: 1 });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("LOGIN_USER");
    return saved ? JSON.parse(saved) : null;
  });

  const token = localStorage.getItem("TOKEN") || localStorage.getItem("token") || "";

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Inject Fonts and Icons
  useEffect(() => {
    const linkFont = document.createElement("link");
    linkFont.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap";
    linkFont.rel = "stylesheet";
    document.head.appendChild(linkFont);

    const linkIcons = document.createElement("link");
    linkIcons.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    linkIcons.rel = "stylesheet";
    document.head.appendChild(linkIcons);
  }, []);

  const fetchTiers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/users/tiers`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! Status: ${res.status}`);
      }
      const data = await res.json();
      setTiers(data);
    } catch (err) {
      console.error("fetchTiers error:", err);
      showToast(`Không thể tải cấu hình hạng: ${err.message}`, "error");
    }
  }, [token]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/members`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.status === 403) {
        navigate("/unauthorized");
        return;
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! Status: ${res.status}`);
      }
      const data = await res.json();
      setMembers(data);
      setError("");
    } catch (err) {
      console.error("fetchMembers error:", err);
      setError(`Không thể kết nối đến cơ sở dữ liệu: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchTiers();
    fetchMembers();
  }, [token, fetchTiers, fetchMembers, navigate]);

  const handleEditClick = (member) => {
    setSelectedMember(member);
    setEditForm({
      currentPoints: member.currentPoints,
      accumulatedPoints: member.accumulatedPoints,
      tierId: member.tierId
    });
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/users/members/${selectedMember.id}/tier`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showToast("Cập nhật thông tin thành viên thành công!");
      setSelectedMember(null);
      fetchMembers();
    } catch (err) {
      showToast(err.message || "Cập nhật thất bại!", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Chỉ Admin mới được xóa hạng — reset về Bronze, điểm = 0
  const handleResetTier = async (member) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn XÓA hạng của "${member.name}"?\n\nHành động này sẽ:\n• Reset hạng về Bronze\n• Điểm hiện tại về 0\n• Điểm tích lũy về 0`
    );
    if (!confirmed) return;

    try {
      const bronzeTier = tiers.find(t => t.TierName?.toLowerCase() === 'bronze') || tiers[0];
      const res = await fetch(`${API_BASE}/users/members/${member.id}/tier`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          tierId: bronzeTier?.TierID ?? 1,
          currentPoints: 0,
          accumulatedPoints: 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(`Đã xóa hạng của ${member.name}, reset về Bronze!`);
      fetchMembers();
    } catch (err) {
      showToast(err.message || "Xóa hạng thất bại!", "error");
    }
  };

  const filteredMembers = members.filter(m => {
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q) ||
      (m.phone || "").includes(q)
    );
  });

  const getTierClass = (tierName) => {
    switch (tierName?.toLowerCase()) {
      case "platinum": return "tier-platinum";
      case "gold": return "tier-gold";
      case "silver": return "tier-silver";
      default: return "tier-bronze";
    }
  };

  return (
    <div className="portal-layout-container" style={{ ...styles.container, padding: 0 }}>
      <Sidebar />
      <div className="portal-main-content" style={{ display: "flex", flexDirection: "column", flex: 1, padding: "40px 20px", position: "relative" }}>
        <div style={styles.glowSphereLeft}></div>
        <div style={styles.glowSphereRight}></div>

        {/* Main glass card wrapper */}
        <div style={styles.dashboardCard}>
        <header style={styles.header}>
          <div>
            <div style={styles.logoBadge}><i className="fa-solid fa-id-card"></i> Loyalty Manager</div>
            <h1 style={styles.title}>Quản Lý Hạng Thành Viên</h1>
            <p style={styles.subtitle}>Xem điểm tích lũy, điều chỉnh cấp bậc hạng ưu đãi của thành viên</p>
          </div>
          <button style={styles.refreshBtn} onClick={fetchMembers}>
            <i className="fa-solid fa-arrows-rotate"></i> Làm mới dữ liệu
          </button>
        </header>

        {/* Stats */}
        <section style={styles.statsGrid}>
          <div style={{ ...styles.statItem, borderLeft: "4px solid #6366f1" }}>
            <div style={styles.statIconWrapper}><i className="fa-solid fa-users" style={{ color: "#6366f1" }}></i></div>
            <div>
              <div style={styles.statValue}>{members.length}</div>
              <div style={styles.statLabel}>Tổng số thành viên</div>
            </div>
          </div>
          <div style={{ ...styles.statItem, borderLeft: "4px solid #f59e0b" }}>
            <div style={styles.statIconWrapper}><i className="fa-solid fa-crown" style={{ color: "#f59e0b" }}></i></div>
            <div>
              <div style={styles.statValue}>{members.filter(m => m.tierName !== 'Bronze').length}</div>
              <div style={styles.statLabel}>Thành viên VIP (Silver+)</div>
            </div>
          </div>
          <div style={{ ...styles.statItem, borderLeft: "4px solid #10b981" }}>
            <div style={styles.statIconWrapper}><i className="fa-solid fa-coins" style={{ color: "#10b981" }}></i></div>
            <div>
              <div style={styles.statValue}>{members.reduce((acc, m) => acc + m.currentPoints, 0).toLocaleString("vi-VN")}</div>
              <div style={styles.statLabel}>Tổng điểm phát hành</div>
            </div>
          </div>
        </section>

        {/* Filters and Search segment */}
        <div style={styles.filterSection}>
          <div style={styles.searchWrapper}>
            <i className="fa-solid fa-magnifying-glass" style={styles.searchIcon}></i>
            <input
              type="text"
              style={styles.searchInput}
              placeholder="Tìm kiếm thành viên theo tên, SĐT, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Data area */}
        {loading ? (
          <div style={styles.loader}>
            <div style={styles.spinner}></div>
            <p>Đang tải danh sách thành viên...</p>
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
                  <th style={styles.th}>Họ và tên</th>
                  <th style={styles.th}>Thông tin liên hệ</th>
                  <th style={styles.th}>Hạng thành viên</th>
                  <th style={styles.th}>Điểm hiện tại</th>
                  <th style={styles.th}>Điểm tích lũy</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={styles.idBadge}>#{member.id}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.customerName}>{member.name}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.contactField}><i className="fa-solid fa-phone"></i> {member.phone || "—"}</div>
                      <div style={{ ...styles.contactField, color: "#9ca3af", marginTop: "4px" }}><i className="fa-solid fa-envelope"></i> {member.email || "—"}</div>
                    </td>
                    <td style={styles.td}>
                      <span className={`tier-badge ${getTierClass(member.tierName)}`}>
                        {member.tierName} (Giảm {member.discountRate > 1 ? member.discountRate : Math.round(member.discountRate * 100)}%)
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 700, color: "#fff" }}>
                      {member.currentPoints} PTS
                    </td>
                    <td style={{ ...styles.td, color: "#9ca3af" }}>
                      {member.accumulatedPoints} PTS
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionGroup}>
                        <button style={styles.editBtn} onClick={() => handleEditClick(member)}>
                          <i className="fa-solid fa-pen-to-square"></i> Cập nhật hạng
                        </button>
                        {currentUser?.role === 'admin' && (
                          <button
                            style={styles.deleteBtn}
                            onClick={() => handleResetTier(member)}
                            title="Xóa hạng — Reset về Bronze"
                          >
                            <i className="fa-solid fa-trash-can"></i> Xóa hạng
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan="7" style={styles.noData}>
                      <i className="fa-regular fa-folder-open" style={{ fontSize: "40px", color: "#4b5563", marginBottom: "15px", display: "block" }}></i>
                      Không tìm thấy thành viên nào phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {selectedMember && (
        <div style={styles.modalOverlay} onClick={() => setSelectedMember(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.idBadge}>#{selectedMember.id}</span>
                <h2 style={{ margin: "5px 0 0 0", color: "#fff", fontSize: "20px" }}>Cập Nhật Hạng & Điểm Tích Lũy</h2>
              </div>
              <button style={styles.closeBtn} onClick={() => setSelectedMember(null)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ marginBottom: "20px", display: "flex", gap: "16px", background: "rgba(255, 255, 255, 0.02)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ ...styles.avatar, width: "48px", height: "48px", fontSize: "20px" }}><i className="fa-solid fa-user"></i></div>
                <div>
                  <h4 style={{ margin: 0, color: "#fff", fontSize: "16px" }}>{selectedMember.name}</h4>
                  <p style={{ margin: "4px 0 0 0", color: "#9ca3af", fontSize: "13px" }}>{selectedMember.phone || "Không có SĐT"}</p>
                </div>
              </div>

              <div style={styles.modalForm}>
                <div style={styles.modalFieldFull}>
                  <label style={styles.modalLabel}>Hạng thành viên hiện tại</label>
                  <select
                    style={styles.modalSelect}
                    value={editForm.tierId}
                    onChange={(e) => setEditForm({ ...editForm, tierId: parseInt(e.target.value, 10) })}
                  >
                    {tiers.map(t => (
                      <option key={t.TierID} value={t.TierID} style={{ background: "#111827", color: "#fff" }}>
                        {t.TierName} (Giảm {t.DiscountRate > 1 ? t.DiscountRate : Math.round(t.DiscountRate * 100)}% - Yêu cầu: {t.RequiredPoints} PTS)
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.modalGrid}>
                  <div style={styles.modalField}>
                    <label style={styles.modalLabel}>Điểm hiện tại (Current Points)</label>
                    <input
                      type="number"
                      style={styles.modalInput}
                      value={editForm.currentPoints}
                      onChange={(e) => setEditForm({ ...editForm, currentPoints: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                  <div style={styles.modalField}>
                    <label style={styles.modalLabel}>Điểm tích lũy (Accumulated)</label>
                    <input
                      type="number"
                      style={styles.modalInput}
                      value={editForm.accumulatedPoints}
                      onChange={(e) => setEditForm({ ...editForm, accumulatedPoints: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.modalCancelBtn} onClick={() => setSelectedMember(null)}>Hủy bỏ</button>
              <button style={styles.modalSaveBtn} onClick={handleSave} disabled={submitting}>
                {submitting ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div style={{ ...styles.toast, background: toast.type === "error" ? "#ef4444" : "#10b981" }}>
          {toast.msg}
        </div>
      )}
      </div>
    </div>
  );
}

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
    textDecoration: "none",
    color: "#9ca3af",
    padding: "10px 16px",
    borderRadius: "10px",
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
    borderNone: "none"
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
    gap: "8px"
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
  searchWrapper: {
    position: "relative",
    width: "100%",
    maxWidth: "500px"
  },
  searchIcon: {
    position: "absolute",
    top: "50%",
    left: "15px",
    transform: "translateY(-50%)",
    color: "#9ca3af"
  },
  searchInput: {
    width: "100%",
    backgroundColor: "rgba(31, 41, 55, 0.4)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "12px",
    padding: "12px 12px 12px 45px",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box"
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
  contactField: {
    fontSize: "13px",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  actionGroup: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
    alignItems: "center"
  },
  editBtn: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    border: "1px solid rgba(99, 102, 241, 0.2)",
    color: "#818cf8",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.2s ease"
  },
  deleteBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    border: "1px solid rgba(239, 68, 68, 0.25)",
    color: "#f87171",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.2s ease"
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
  modalForm: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  modalFieldFull: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  modalSelect: {
    width: "100%",
    backgroundColor: "rgba(31, 41, 55, 0.4)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "12px",
    padding: "12px",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none"
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
  modalInput: {
    backgroundColor: "rgba(31, 41, 55, 0.4)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "12px",
    padding: "12px",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none"
  },
  modalLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  modalFooter: {
    padding: "18px 24px",
    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px"
  },
  modalCancelBtn: {
    backgroundColor: "#1f2937",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    color: "#ffffff",
    padding: "10px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600"
  },
  modalSaveBtn: {
    backgroundColor: "#6366f1",
    border: "none",
    color: "#ffffff",
    padding: "10px 24px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    boxShadow: "0 4px 14px 0 rgba(99, 102, 241, 0.35)"
  },
  toast: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    color: "white",
    padding: "12px 20px",
    borderRadius: "10px",
    fontWeight: "600",
    fontSize: "14px",
    zIndex: 9999,
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
  }
};
