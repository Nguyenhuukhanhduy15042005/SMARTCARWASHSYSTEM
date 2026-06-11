import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = "http://localhost:5000/api/users";

function getInitials(name = "") {
  return name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();
}

const ROLE_LABEL = { 1: "Admin", 2: "Staff", 3: "Khách hàng" };

export default function Profile() {
  const navigate = useNavigate();
  const { user: authUser, setUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", newPassword: "" });

  const token = localStorage.getItem("TOKEN");

  useEffect(() => {
    if (!token) { navigate("/login", { state: { error: "unauthorized" } }); return; }

    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Không thể lấy thông tin!");
        const data = await res.json();
        setProfile(data);
        setForm({ fullName: data.FullName || "", phone: data.PhoneNumber || "", email: data.Email || "", newPassword: "" });
      } catch (err) {
        setMsg({ text: err.message, type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  const handleSave = async () => {
    if (!form.fullName || !form.phone || !form.email) {
      setMsg({ text: "Vui lòng nhập đầy đủ thông tin!", type: "error" });
      return;
    }
    setSaving(true);
    setMsg({ text: "", type: "" });
    try {
      const res = await fetch(`${API}/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setProfile((prev) => ({ ...prev, FullName: form.fullName, PhoneNumber: form.phone, Email: form.email }));

      // Cập nhật lại LOGIN_USER + AuthContext
      const savedUser = JSON.parse(localStorage.getItem("LOGIN_USER") || "{}");
      const updatedUser = { ...savedUser, fullName: form.fullName };
      localStorage.setItem("LOGIN_USER", JSON.stringify(updatedUser));
      if (setUser) setUser(updatedUser);

      setMsg({ text: "✅ Cập nhật thành công!", type: "success" });
      setEditing(false);
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 15 }}>
      Đang tải thông tin...
    </div>
  );

  return (
    <div className="auth-container" style={{ alignItems: "flex-start", paddingTop: "2rem" }}>
      <div className="auth-card" style={{ maxWidth: 520, width: "100%" }}>

        {/* Back button — dùng cùng style với Login.jsx */}
        <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 15 }}>
          <Link
            to="/"
            style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", color: "#475569", fontSize: 14, fontWeight: 600 }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#F58607")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#475569")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Quay lại
          </Link>
        </div>

        <h2>Hồ Sơ Của Tôi</h2>

        {msg.text && (
          <div className={msg.type === "success" ? "success-msg" : "error-msg"} style={{ marginBottom: 16 }}>
            {msg.text}
          </div>
        )}

        {/* Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: 16, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 600, color: "#0F6E56", border: "2px solid #5DCAA5", flexShrink: 0 }}>
            {getInitials(profile?.FullName)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 17, color: "#1e293b" }}>{profile?.FullName}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{profile?.Email}</div>
            <span style={{ display: "inline-block", marginTop: 6, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: "#E1F5EE", color: "#0F6E56" }}>
              Khách hàng
            </span>
          </div>
          {!editing && (
            <button
              onClick={() => { setEditing(true); setMsg({ text: "", type: "" }); }}
              style={{ padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 13, color: "#475569", fontWeight: 600 }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#fff")}
            >
              ✏ Chỉnh sửa
            </button>
          )}
        </div>

        {/* Form */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="input-group">
            <label>Họ và tên</label>
            {editing
              ? <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              : <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, fontSize: 14, border: "1px solid #e2e8f0" }}>{user?.FullName}</div>}
          </div>
          <div className="input-group">
            <label>Số điện thoại</label>
            {editing
              ? <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              : <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, fontSize: 14, border: "1px solid #e2e8f0" }}>{user?.PhoneNumber}</div>}
          </div>
          <div className="input-group" style={{ gridColumn: "1 / -1" }}>
            <label>Email</label>
            {editing
              ? <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              : <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, fontSize: 14, border: "1px solid #e2e8f0" }}>{user?.Email}</div>}
          </div>
          <div className="input-group" style={{ gridColumn: "1 / -1" }}>
            <label>Ngày tham gia</label>
            <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, fontSize: 14, border: "1px solid #e2e8f0", color: "#64748b" }}>
              {user?.CreatedAt ? new Date(user.CreatedAt).toLocaleDateString("vi-VN") : "—"}
            </div>
          </div>
          {editing && (
            <div className="input-group" style={{ gridColumn: "1 / -1" }}>
              <label>Mật khẩu mới (để trống nếu không đổi)</label>
              <input type="password" placeholder="Nhập mật khẩu mới..." value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
            </div>
          )}
        </div>

        {editing && (
          <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
            <button
              onClick={() => { setEditing(false); setMsg({ text: "", type: "" }); }}
              style={{ padding: "10px 20px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14, color: "#475569", fontWeight: 600 }}
            >
              Hủy
            </button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ padding: "10px 24px" }}>
              {saving ? "Đang lưu..." : "💾 Lưu thay đổi"}
            </button>
          </div>
        )}

        </div>
      </main>
    </div>
  );
}
