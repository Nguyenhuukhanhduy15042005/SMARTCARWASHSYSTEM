import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://localhost:5000/api";

export default function AccountManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users`, {
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
      setUsers(data);
      setError("");
    } catch (err) {
      console.error("fetchUsers error:", err);
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
    fetchUsers();
  }, [token, fetchUsers, navigate]);

  const handleEditRoleClick = (user) => {
    setSelectedUser(user);
    setSelectedRoleId(user.roleId || 3);
  };

  const handleSaveRole = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/users/${selectedUser.id}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ roleId: selectedRoleId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showToast("Cập nhật vai trò người dùng thành công!");
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      showToast(err.message || "Cập nhật thất bại!", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadgeClass = (roleName) => {
    switch (roleName?.toLowerCase()) {
      case "admin": return "role-badge-admin";
      case "staff": return "role-badge-staff";
      default: return "role-badge-member";
    }
  };

  const getRoleDisplayName = (roleId) => {
    switch (roleId) {
      case 1: return "Admin";
      case 2: return "Staff";
      default: return "Member";
    }
  };

  // Filter users based on search query and role filter dropdown
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").includes(q);

    const matchesRole =
      selectedRoleFilter === "all" ||
      (selectedRoleFilter === "admin" && u.roleId === 1) ||
      (selectedRoleFilter === "staff" && u.roleId === 2) ||
      (selectedRoleFilter === "member" && u.roleId === 3);

    return matchesSearch && matchesRole;
  });

  return (
    <div className="portal-layout-container" style={{ ...styles.container, padding: 0 }}>
      <Sidebar />
      <div className="portal-main-content" style={{ display: "flex", flexDirection: "column", flex: 1, padding: "40px 20px", position: "relative" }}>
        <div style={styles.glowSphereLeft}></div>
        <div style={styles.glowSphereRight}></div>

        <div style={styles.dashboardCard}>
          <header style={styles.header}>
            <div>
              <div style={styles.logoBadge}><i className="fa-solid fa-user-shield"></i> System Accounts</div>
              <h1 style={styles.title}>Quản Lý Tài Khoản Hệ Thống</h1>
              <p style={styles.subtitle}>Phân quyền vai trò người dùng (Admin, Nhân viên, Khách hàng)</p>
            </div>
            <button style={styles.refreshBtn} onClick={fetchUsers}>
              <i className="fa-solid fa-arrows-rotate"></i> Làm mới
            </button>
          </header>

          {/* Stats Grid */}
          <section style={styles.statsGrid}>
            <div style={{ ...styles.statItem, borderLeft: "4px solid #6366f1" }}>
              <div style={styles.statIconWrapper}><i className="fa-solid fa-users" style={{ color: "#6366f1" }}></i></div>
              <div>
                <div style={styles.statValue}>{users.length}</div>
                <div style={styles.statLabel}>Tổng số tài khoản</div>
              </div>
            </div>
            <div style={{ ...styles.statItem, borderLeft: "4px solid #ef4444" }}>
              <div style={styles.statIconWrapper}><i className="fa-solid fa-user-gear" style={{ color: "#ef4444" }}></i></div>
              <div>
                <div style={styles.statValue}>{users.filter(u => u.roleId === 1).length}</div>
                <div style={styles.statLabel}>Quản trị viên (Admin)</div>
              </div>
            </div>
            <div style={{ ...styles.statItem, borderLeft: "4px solid #3b82f6" }}>
              <div style={styles.statIconWrapper}><i className="fa-solid fa-user-tie" style={{ color: "#3b82f6" }}></i></div>
              <div>
                <div style={styles.statValue}>{users.filter(u => u.roleId === 2).length}</div>
                <div style={styles.statLabel}>Nhân viên (Staff)</div>
              </div>
            </div>
            <div style={{ ...styles.statItem, borderLeft: "4px solid #10b981" }}>
              <div style={styles.statIconWrapper}><i className="fa-solid fa-user" style={{ color: "#10b981" }}></i></div>
              <div>
                <div style={styles.statValue}>{users.filter(u => u.roleId === 3).length}</div>
                <div style={styles.statLabel}>Khách hàng (Member)</div>
              </div>
            </div>
          </section>

          {/* Filter & Search Bar */}
          <div style={styles.filterSection}>
            <div style={styles.filterControls}>
              <div style={styles.searchWrapper}>
                <i className="fa-solid fa-magnifying-glass" style={styles.searchIcon}></i>
                <input
                  type="text"
                  style={styles.searchInput}
                  placeholder="Tìm kiếm tài khoản..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={styles.selectFilterWrapper}>
                <select
                  style={styles.roleFilterSelect}
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                >
                  <option value="all" style={{ background: "#111827" }}>Tất cả vai trò</option>
                  <option value="admin" style={{ background: "#111827" }}>Quản trị viên (Admin)</option>
                  <option value="staff" style={{ background: "#111827" }}>Nhân viên (Staff)</option>
                  <option value="member" style={{ background: "#111827" }}>Khách hàng (Member)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Container */}
          {loading ? (
            <div style={styles.loader}>
              <div style={styles.spinner}></div>
              <p>Đang tải danh sách tài khoản...</p>
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
                    <th style={styles.th}>Tài khoản</th>
                    <th style={styles.th}>Thông tin liên hệ</th>
                    <th style={styles.th}>Vai trò hệ thống</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} style={styles.tr}>
                      <td style={styles.td}>
                        <span style={styles.idBadge}>#{user.id}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.customerName}>{user.name}</div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.contactField}><i className="fa-solid fa-phone"></i> {user.phone || "—"}</div>
                        <div style={{ ...styles.contactField, color: "#9ca3af", marginTop: "4px" }}><i className="fa-solid fa-envelope"></i> {user.email || "—"}</div>
                      </td>
                      <td style={styles.td}>
                        <span className={`role-badge ${getRoleBadgeClass(user.roleName)}`}>
                          {getRoleDisplayName(user.roleId)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionGroup}>
                          <button style={styles.editBtn} onClick={() => handleEditRoleClick(user)}>
                            <i className="fa-solid fa-user-pen"></i> Đổi vai trò
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="5" style={styles.noData}>
                        <i className="fa-regular fa-folder-open" style={{ fontSize: "40px", color: "#4b5563", marginBottom: "15px", display: "block" }}></i>
                        Không tìm thấy tài khoản nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Role editing modal */}
      {selectedUser && (
        <div style={styles.modalOverlay} onClick={() => setSelectedUser(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.idBadge}>#{selectedUser.id}</span>
                <h2 style={{ margin: "5px 0 0 0", color: "#fff", fontSize: "20px" }}>Đổi Vai Trò Người Dùng</h2>
              </div>
              <button style={styles.closeBtn} onClick={() => setSelectedUser(null)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ marginBottom: "20px", display: "flex", gap: "16px", background: "rgba(255, 255, 255, 0.02)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ ...styles.avatar, width: "48px", height: "48px", fontSize: "20px" }}><i className="fa-solid fa-user"></i></div>
                <div>
                  <h4 style={{ margin: 0, color: "#fff", fontSize: "16px" }}>{selectedUser.name}</h4>
                  <p style={{ margin: "4px 0 0 0", color: "#9ca3af", fontSize: "13px" }}>{selectedUser.email || "Không có Email"}</p>
                </div>
              </div>

              <div style={styles.modalForm}>
                <div style={styles.modalFieldFull}>
                  <label style={styles.modalLabel}>Chọn vai trò hệ thống mới</label>
                  <select
                    style={styles.modalSelect}
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(parseInt(e.target.value, 10))}
                  >
                    <option value={1} style={{ background: "#111827", color: "#fff" }}>Quản trị viên (Admin)</option>
                    <option value={2} style={{ background: "#111827", color: "#fff" }}>Nhân viên (Staff)</option>
                    <option value={3} style={{ background: "#111827", color: "#fff" }}>Khách hàng (Member)</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.modalCancelBtn} onClick={() => setSelectedUser(null)}>Hủy bỏ</button>
              <button style={styles.modalSaveBtn} onClick={handleSaveRole} disabled={submitting}>
                {submitting ? "Đang lưu..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      {toast && (
        <div style={{ ...styles.toast, background: toast.type === "error" ? "#ef4444" : "#10b981" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#030712",
    backgroundImage: "radial-gradient(at 0% 0%, rgba(17, 24, 39, 0.8) 0, transparent 50%), radial-gradient(at 50% 0%, rgba(99, 102, 241, 0.05) 0, transparent 50%)",
    color: "#f3f4f6",
    minHeight: "100vh",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    position: "relative",
    overflow: "hidden"
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
    margin: "0",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
  filterControls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap"
  },
  searchWrapper: {
    position: "relative",
    width: "100%",
    maxWidth: "400px"
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
  selectFilterWrapper: {
    width: "200px"
  },
  roleFilterSelect: {
    width: "100%",
    backgroundColor: "rgba(31, 41, 55, 0.4)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "12px",
    padding: "12px",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
    cursor: "pointer"
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
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "6px"
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
    width: "500px",
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
    padding: "24px"
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
  modalLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
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
