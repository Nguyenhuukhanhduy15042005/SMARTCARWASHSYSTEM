

import { useState, useEffect, useCallback, useMemo } from "react";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://localhost:5000";

const BRANDS = [
  "Toyota","Honda","Yamaha","Suzuki","Hyundai",
  "Kia","VinFast","Mazda","Ford","Mitsubishi","Khác"
];

const COLORS = ["Đen","Trắng","Bạc","Xám","Đỏ","Xanh dương","Xanh lá","Vàng","Nâu","Cam"];

const COLOR_MAP = {
  "Đen":"#1e293b","Trắng":"#e2e8f0","Bạc":"#94a3b8","Xám":"#64748b",
  "Đỏ":"#ef4444","Xanh dương":"#3b82f6","Xanh lá":"#22c55e",
  "Vàng":"#eab308","Nâu":"#92400e","Cam":"#f97316",
};

const EMPTY_FORM = { userId: "", plateNumber: "", brand: "", model: "", color: "" };

const normalizePlate = (value) => value.toUpperCase().replace(/\s+/g, '');

const getLoggedInUser = () => {
  const token = localStorage.getItem("TOKEN") || localStorage.getItem("token");
  if (token && token !== "mock-token" && token !== "null" && token !== "undefined") {
    try {
      const payload = token.split(".")[1];
      const decoded = JSON.parse(window.atob(payload));
      return decoded; // { userId, roleId, role }
    } catch (err) {
      console.error("Lỗi giải mã token:", err);
    }
  }
  return null;
};

export default function VehicleManagement() {
  const [vehicles, setVehicles]           = useState([]);
  const [users, setUsers]                 = useState([]);
  const [formData, setFormData]           = useState(EMPTY_FORM);
  const [editingId, setEditingId]         = useState(null);
  const [showForm, setShowForm]           = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [filterUserId, setFilterUserId]   = useState(() => {
    const u = getLoggedInUser();
    return (u && u.role === "user") ? String(u.userId) : "all";
  });
  const [searchQuery, setSearchQuery]     = useState("");
  const [loading, setLoading]             = useState(false);
  const [toast, setToast]                 = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [submitting, setSubmitting]       = useState(false);

  const token = localStorage.getItem("TOKEN") || localStorage.getItem("token") || "";
  const currentUser = useMemo(() => {
    const decoded = getLoggedInUser();
    if (!decoded) return null;
    const savedUser = localStorage.getItem("LOGIN_USER");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        return { ...decoded, ...parsed };
      } catch (err) {
        console.error("Lỗi parse LOGIN_USER:", err);
      }
    }
    return decoded;
  }, [token]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch users từ DB để chọn chủ xe ───────────────────────
  // API này đặt trong vehicle router: GET /api/vehicles/users
  // để không sửa file user.js của thành viên khác.
  const fetchVehicleUsers = useCallback(async () => {
    if (currentUser && currentUser.role === "user") return;
    try {
      const res = await fetch(`${API_BASE}/api/vehicles/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể tải chủ xe");
      setUsers(data);
    } catch {
      showToast("Không thể tải danh sách chủ xe!", "error");
    }
  }, [currentUser, token]);

  useEffect(() => { fetchVehicleUsers(); }, [fetchVehicleUsers]);

  // ── Fetch vehicles từ BE ───────────────────────────────────
  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const effectiveFilterUserId = (currentUser && currentUser.role === "user")
        ? String(currentUser.userId)
        : filterUserId;

      if (effectiveFilterUserId !== "all") {
        params.set("userId", effectiveFilterUserId);
      }

      const url = params.toString()
        ? `${API_BASE}/api/vehicles?${params.toString()}`
        : `${API_BASE}/api/vehicles`;

      const res  = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVehicles(data);
    } catch {
      showToast("Không thể tải danh sách xe!", "error");
    } finally {
      setLoading(false);
    }
  }, [filterUserId, currentUser, token]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  // Sync selected vehicle khi danh sách xe (vehicles) thay đổi
  useEffect(() => {
    if (selectedVehicle) {
      const updated = vehicles.find(v => v.id === selectedVehicle.id);
      if (updated) {
        // So sánh các trường chính để tránh kích hoạt lại setSelectedVehicle thừa
        const isDifferent =
          updated.plateNumber !== selectedVehicle.plateNumber ||
          updated.brand !== selectedVehicle.brand ||
          updated.model !== selectedVehicle.model ||
          updated.color !== selectedVehicle.color ||
          updated.ownerName !== selectedVehicle.ownerName ||
          updated.ownerPhone !== selectedVehicle.ownerPhone;

        if (isDifferent) {
          setSelectedVehicle(updated);
        }
      } else {
        setSelectedVehicle(null);
      }
    }
  }, [vehicles, selectedVehicle]);

  // ── Submit form (Add / Edit) ───────────────────────────────
  const handleSubmit = async () => {
    const userId = (currentUser && currentUser.role === "user") ? currentUser.userId : formData.userId;
    const plateNumber = normalizePlate(formData.plateNumber);
    const brand = formData.brand.trim();
    const model = formData.model.trim();
    const color = formData.color;
    if (!userId || !plateNumber || !brand || !model || !color) {
      showToast("Vui lòng điền đầy đủ thông tin!", "error");
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        // PUT /api/vehicles/:id
        const res = await fetch(`${API_BASE}/api/vehicles/${editingId}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ plateNumber, brand, model, color }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.message || "Lỗi cập nhật xe!", "error"); return; }
        if (data.vehicle) setSelectedVehicle(data.vehicle);
        showToast("Cập nhật xe thành công!");
        setEditingId(null);
      } else {
        // POST /api/vehicles
        const res = await fetch(`${API_BASE}/api/vehicles`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ userId: parseInt(userId), plateNumber, brand, model, color }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.message || "Lỗi thêm xe!", "error"); return; }
        if (data.vehicle) setSelectedVehicle(data.vehicle);
        showToast("Thêm xe thành công!");
      }
      setFormData({
        userId: (currentUser && currentUser.role === "user") ? String(currentUser.userId) : "",
        plateNumber: "",
        brand: "",
        model: "",
        color: ""
      });
      setShowForm(false);
      fetchVehicles();
    } catch {
      showToast("Lỗi kết nối server!", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/vehicles/${id}`, { 
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.message || "Lỗi xóa xe!", "error"); return; }
      if (selectedVehicle?.id === id) setSelectedVehicle(null);
      setDeleteConfirm(null);
      showToast("Đã xóa xe.", "error");
      fetchVehicles();
    } catch {
      showToast("Lỗi kết nối server!", "error");
    }
  };

  const handleEdit = (v) => {
    setEditingId(v.id);
    setFormData({
      userId:      String(v.userId),
      plateNumber: v.plateNumber,
      brand:       v.brand,
      model:       v.model,
      color:       v.color,
    });
    setShowForm(true);
  };

  // ── Filter & search (client-side) ─────────────────────────
  const filtered = vehicles.filter(v => {
    const q = searchQuery.toLowerCase();
    return (
      v.plateNumber.toLowerCase().includes(q) ||
      v.brand.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      (v.ownerName || "").toLowerCase().includes(q)
    );
  });

  // ── Stats ──────────────────────────────────────────────────
  const stats = {
    total:   vehicles.length,
    owners:  [...new Set(vehicles.map(v => v.userId))].length,
    brands:  [...new Set(vehicles.map(v => v.brand))].length,
  };

  const handleLogout = () => {
    localStorage.removeItem("TOKEN");
    localStorage.removeItem("token");
    localStorage.removeItem("LOGIN_USER");
    window.location.href = "/login";
  };

  return (
    <div className="portal-layout-container" style={{ ...s.root, padding: 0 }}>
      <Sidebar />
      <div className="portal-main-content" style={{ display: "flex", flexDirection: "column", flex: 1, padding: "24px 32px", position: "relative" }}>
        <div style={s.bg} /><div style={s.bgGrid} />

        {/* Toast */}
        {toast && (
          <div style={{ ...s.toast, background: toast.type === "error" ? "#ef4444" : "#10b981" }}>
            {toast.msg}
          </div>
        )}

      {/* Delete Modal */}
      {deleteConfirm && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>🗑️</div>
            <h3 style={s.modalTitle}>Xóa xe này?</h3>
            <p style={s.modalSub}>
              Biển số <strong style={{ color: "#f1f5f9" }}>
                {vehicles.find(v => v.id === deleteConfirm)?.plateNumber}
              </strong> sẽ bị xóa vĩnh viễn.
            </p>
            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => setDeleteConfirm(null)}>Hủy</button>
              <button style={s.deleteBtn} onClick={() => handleDelete(deleteConfirm)}>Xóa</button>
            </div>
          </div>
        </div>
      )}

        <div style={s.wrapper}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.badge}>🚗 Quản lý phương tiện</div>
            <h1 style={s.title}>Vehicle Management</h1>
            <p style={s.subtitle}>Quản lý xe, liên kết chủ sở hữu & lịch sử dịch vụ</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={s.refreshBtn} onClick={fetchVehicles}>🔄 Làm mới</button>
            <button style={s.addBtn} onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData(EMPTY_FORM);
            }}>
              {showForm ? "✕ Đóng" : "+ Thêm xe"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={s.statsRow}>
          {[
            { icon: "🚘", label: "Tổng xe",   val: stats.total },
            { icon: "👤", label: "Chủ xe",    val: stats.owners },
            { icon: "🏷️", label: "Hãng xe",  val: stats.brands },
            { icon: "📋", label: "Hiển thị", val: filtered.length },
          ].map((st, i) => (
            <div key={i} style={s.statCard}>
              <span style={{ fontSize: 24 }}>{st.icon}</span>
              <span style={s.statVal}>{st.val}</span>
              <span style={s.statLabel}>{st.label}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        {showForm && (
          <div style={s.formCard}>
            <h2 style={s.formTitle}>{editingId ? "✏️ Chỉnh sửa xe" : "➕ Thêm xe mới"}</h2>
            <div style={s.formGrid}>
              {/* Chủ xe — ẩn khi đang edit hoặc role là user */}
              {!editingId && (!currentUser || currentUser.role !== "user") && (
                <div style={s.field}>
                  <label style={s.label}>Chủ sở hữu *</label>
                  <select style={s.input} value={formData.userId}
                    onChange={e => setFormData({ ...formData, userId: e.target.value })}>
                    <option value="">-- Chọn chủ xe từ database --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} · {u.phone}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={s.field}>
                <label style={s.label}>Biển số xe *</label>
                <input style={s.input} placeholder="VD: 59A-12345"
                  value={formData.plateNumber}
                  onChange={e => setFormData({ ...formData, plateNumber: normalizePlate(e.target.value) })} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Hãng xe *</label>
                <select style={s.input} value={formData.brand}
                  onChange={e => setFormData({ ...formData, brand: e.target.value })}>
                  <option value="">-- Chọn hãng --</option>
                  {BRANDS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Dòng xe *</label>
                <input style={s.input} placeholder="VD: Vios, Exciter..."
                  value={formData.model}
                  onChange={e => setFormData({ ...formData, model: e.target.value })} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Màu sắc *</label>
                <select style={s.input} value={formData.color}
                  onChange={e => setFormData({ ...formData, color: e.target.value })}>
                  <option value="">-- Chọn màu --</option>
                  {COLORS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={s.formActions}>
              <button style={s.cancelBtn2} onClick={() => { setShowForm(false); setEditingId(null); }}>
                Hủy
              </button>
              <button style={{ ...s.submitBtn, opacity: submitting ? 0.7 : 1 }}
                onClick={handleSubmit} 
                disabled={submitting || (!editingId && (!currentUser || currentUser.role !== "user") && users.length === 0)}>
                {submitting ? "Đang lưu..." : editingId ? "Cập nhật xe" : "Thêm xe"}
              </button>
            </div>
          </div>
        )}

        <div style={s.mainLayout}>
          {/* LEFT: danh sách xe */}
          <div style={s.listPanel}>
            {/* Filter bar */}
            <div style={s.filterBar}>
              <input style={s.searchInput}
                placeholder="🔍 Tìm biển số, hãng, dòng xe, chủ xe..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)} />
              {(!currentUser || currentUser.role !== "user") && (
                <select style={s.filterSelect} value={filterUserId}
                  onChange={e => setFilterUserId(e.target.value)}>
                  <option value="all">👤 Tất cả chủ xe</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              )}
            </div>

            {/* List */}
            {loading ? (
              <div style={s.emptyState}>
                <div style={{ fontSize: 36 }}>⏳</div>
                <p style={{ color: "#475569", margin: 0 }}>Đang tải danh sách xe...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={s.emptyState}>
                <div style={{ fontSize: 40 }}>🚫</div>
                <p style={{ color: "#475569", margin: 0 }}>Không tìm thấy xe nào</p>
              </div>
            ) : (
              <div style={s.cardList}>
                {filtered.map(v => {
                  const isActive = selectedVehicle?.id === v.id;
                  const dotColor = COLOR_MAP[v.color] || "#94a3b8";
                  return (
                    <div key={v.id}
                      style={{ ...s.vehicleCard, ...(isActive ? s.vehicleCardActive : {}) }}
                      onClick={() => setSelectedVehicle(v)}>
                      {/* Top */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={s.plate}>{v.plateNumber}</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={s.editBtnSm}
                            onClick={e => { e.stopPropagation(); handleEdit(v); }}>✏️</button>
                          <button style={s.deleteBtnSm}
                            onClick={e => { e.stopPropagation(); setDeleteConfirm(v.id); }}>🗑️</button>
                        </div>
                      </div>
                      {/* Mid */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={s.brandModel}>
                          {v.brand} <span style={{ color: "#94a3b8", fontWeight: 400 }}>{v.model}</span>
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 13 }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor,
                            border: "1px solid rgba(255,255,255,0.2)", display: "inline-block" }} />
                          {v.color}
                        </span>
                      </div>
                      {/* Bottom */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={s.avatar}>{(v.ownerName || "?").slice(0, 2).toUpperCase()}</div>
                        <span style={{ color: "#64748b", fontSize: 12 }}>{v.ownerName || "—"}</span>
                        <span style={{ color: "#475569", fontSize: 11, marginLeft: "auto" }}>
                          {v.createdAt ? new Date(v.createdAt).toLocaleDateString("vi-VN") : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: detail panel */}
          <div style={s.detailPanel}>
            {!selectedVehicle ? (
              <div style={s.detailEmpty}>
                <div style={{ fontSize: 52 }}>🚗</div>
                <p style={{ color: "#475569", textAlign: "center", fontSize: 14, margin: 0 }}>
                  Chọn một xe để xem chi tiết
                </p>
              </div>
            ) : (
              <div style={{ padding: 24 }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #334155" }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>🚗</div>
                  <h2 style={{ color: "#f1f5f9", fontSize: 24, fontWeight: 800, margin: "0 0 4px", letterSpacing: 1 }}>
                    {selectedVehicle.plateNumber}
                  </h2>
                  <p style={{ color: "#64748b", margin: 0 }}>
                    {selectedVehicle.brand} · {selectedVehicle.model}
                  </p>
                </div>

                {/* Info grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                  {[
                    ["Hãng xe",    selectedVehicle.brand],
                    ["Dòng xe",    selectedVehicle.model],
                    ["Biển số",    selectedVehicle.plateNumber],
                    ["Màu sắc",    selectedVehicle.color],
                    ["Ngày thêm",  selectedVehicle.createdAt
                      ? new Date(selectedVehicle.createdAt).toLocaleDateString("vi-VN") : "—"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ color: "#475569", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{k}</span>
                      <span style={{ color: "#cbd5e1", fontSize: 14, fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Owner */}
                <div style={{ marginBottom: 20 }}>
                  <span style={{ color: "#475569", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Chủ sở hữu
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#0f172a", borderRadius: 8, padding: "10px 14px", marginTop: 8 }}>
                    <div style={{ ...s.avatar, width: 36, height: 36, fontSize: 13 }}>
                      {(selectedVehicle.ownerName || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14 }}>{selectedVehicle.ownerName}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>{selectedVehicle.ownerPhone}</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={s.editBtnFull} onClick={() => handleEdit(selectedVehicle)}>
                    ✏️ Chỉnh sửa
                  </button>
                  <button style={s.deleteBtnFull} onClick={() => setDeleteConfirm(selectedVehicle.id)}>
                    🗑️ Xóa xe
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", width: "100%", boxSizing: "border-box", background: "#0f172a", fontFamily: "'Be Vietnam Pro','Segoe UI',sans-serif", position: "relative", padding: "0 0 24px 0" },
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    height: 70,
    padding: "0 40px",
    background: "#111827",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    boxSizing: "border-box",
  },
  navLogo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 20,
    fontWeight: 800,
    color: "white",
    textDecoration: "none",
    cursor: "pointer",
  },
  logoImg: {
    height: 42,
    width: 42,
    objectFit: "cover",
    borderRadius: "50%",
    border: "1px solid rgba(255, 255, 255, 0.15)",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: 24,
  },
  navLink: {
    color: "#9ca3af",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
    background: "none",
    border: "none",
    cursor: "pointer",
    transition: "color 0.2s",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  navLinkActive: {
    color: "#06b6d4",
  },
  navUser: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  logoutBtn: {
    background: "transparent",
    border: "1px solid #ef4444",
    color: "#ef4444",
    borderRadius: 8,
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 6,
    transition: "all 0.2s",
  },
  bg: { position: "fixed", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%,#1e3a5f44 0%,transparent 60%)", pointerEvents: "none" },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(148,163,184,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,0.03) 1px,transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" },
  wrapper: { width: "100%", maxWidth: "1200px", margin: "0 auto", boxSizing: "border-box", position: "relative", zIndex: 1 },
  toast: { position: "fixed", top: 20, right: 20, color: "white", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998 },
  modal: { background: "#1e293b", border: "1px solid #334155", borderRadius: 16, padding: 32, maxWidth: 380, width: "90%", textAlign: "center" },
  modalTitle: { color: "#f1f5f9", fontSize: 20, fontWeight: 700, marginBottom: 8, marginTop: 0 },
  modalSub: { color: "#64748b", fontSize: 14, marginBottom: 24 },
  modalActions: { display: "flex", gap: 10, justifyContent: "center" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 },
  badge: { display: "inline-block", background: "#1e3a5f", color: "#60a5fa", border: "1px solid #2d5a8e", borderRadius: 20, padding: "4px 14px", fontSize: 13, marginBottom: 8, fontWeight: 500 },
  title: { color: "#f1f5f9", fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: -1 },
  subtitle: { color: "#64748b", fontSize: 14, marginTop: 4 },
  refreshBtn: { background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontSize: 14 },
  addBtn: { background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", color: "white", border: "none", borderRadius: 10, padding: "12px 22px", fontWeight: 700, fontSize: 15, cursor: "pointer" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 },
  statCard: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  statVal: { color: "#f1f5f9", fontSize: 26, fontWeight: 800 },
  statLabel: { color: "#64748b", fontSize: 12 },
  formCard: { background: "#1e293b", border: "1px solid #334155", borderRadius: 16, padding: 24, marginBottom: 24 },
  formTitle: { color: "#f1f5f9", fontSize: 18, fontWeight: 700, marginBottom: 20, marginTop: 0 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { color: "#94a3b8", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "10px 12px", fontSize: 14, outline: "none" },
  formActions: { display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" },
  cancelBtn: { background: "transparent", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 14 },
  cancelBtn2: { background: "transparent", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontSize: 14 },
  submitBtn: { background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", color: "white", border: "none", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontWeight: 700, fontSize: 14 },
  deleteBtn: { background: "#ef4444", color: "white", border: "none", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontWeight: 700, fontSize: 14 },
  mainLayout: { display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, alignItems: "start" },
  listPanel: { display: "flex", flexDirection: "column", gap: 12 },
  filterBar: { display: "flex", gap: 10, flexWrap: "wrap" },
  searchInput: { flex: 1, minWidth: 200, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "10px 14px", fontSize: 14, outline: "none" },
  filterSelect: { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", padding: "10px 12px", fontSize: 13, cursor: "pointer", outline: "none" },
  emptyState: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  cardList: { display: "flex", flexDirection: "column", gap: 10 },
  vehicleCard: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 16, cursor: "pointer", transition: "border-color 0.2s" },
  vehicleCardActive: { borderColor: "#3b82f6", background: "#1a2d4a" },
  plate: { color: "#f1f5f9", fontWeight: 800, fontSize: 16, letterSpacing: 1 },
  brandModel: { color: "#cbd5e1", fontSize: 14, fontWeight: 600 },
  avatar: { width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 },
  editBtnSm: { background: "#1e3a1e", border: "1px solid #166534", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 13 },
  deleteBtnSm: { background: "#3a1e1e", border: "1px solid #991b1b", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 13 },
  detailPanel: { background: "#1e293b", border: "1px solid #334155", borderRadius: 16, overflow: "hidden", position: "sticky", top: 16, minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" },
  detailEmpty: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 40 },
  editBtnFull: { flex: 1, background: "#1e3a5f", border: "1px solid #2d5a8e", color: "#60a5fa", borderRadius: 8, padding: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  deleteBtnFull: { flex: 1, background: "#3a1e1e", border: "1px solid #991b1b", color: "#f87171", borderRadius: 8, padding: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 },
};
