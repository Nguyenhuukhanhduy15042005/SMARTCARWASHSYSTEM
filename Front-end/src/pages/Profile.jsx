import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const API = "http://localhost:5000/api/users";

function getInitials(name = "") {
  return name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();
}

export default function Profile({ setUser }) {
  const navigate = useNavigate();
  const [user, setLocalUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [form, setForm] = useState({ fullName: "", phone: "", email: "" });

  const token = localStorage.getItem("TOKEN");

  useEffect(() => {
    if (!token) {
      navigate("/login", { state: { error: "unauthorized" } });
      return;
    }
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Không thể lấy thông tin!");
        const data = await res.json();
        setLocalUser(data);
        const phoneVal = (data.PhoneNumber && !data.PhoneNumber.startsWith("G-")) ? data.PhoneNumber : "";
        setForm({ fullName: data.FullName || "", phone: phoneVal, email: data.Email || "" });
      } catch (err) {
        setMsg({ text: err.message, type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  const handleSave = async () => {
    setMsg({ text: "", type: "" });

    if (!form.phone) {
      setMsg({ text: "❌ Vui lòng nhập số điện thoại liên hệ!", type: "error" });
      return;
    }
    const phoneRegex = /^(0[35789])[0-9]{8}$/;
    if (!phoneRegex.test(form.phone)) {
      setMsg({ text: "❌ Số điện thoại không hợp lệ! Định dạng đúng gồm 10 chữ số di động Việt Nam.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: form.fullName, phone: form.phone, email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setLocalUser((prev) => ({ ...prev, FullName: form.fullName, PhoneNumber: form.phone, Email: form.email }));
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

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
        Đang tải thông tin...
      </div>
    );
  }

  return (
    <div className="portal-layout-container">
      <Sidebar />
      <main className="portal-main-content" style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px 20px" }}>
        <div className="auth-card" style={{ maxWidth: 520, width: "100%", textAlign: "left" }}>
          <h2>Hồ Sơ Của Tôi</h2>

          {msg.text && (
            <div className={msg.type === "success" ? "success-msg" : "error-msg"} style={{ marginBottom: 16 }}>
              {msg.text}
            </div>
          )}

          {/* Avatar + tên */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: "16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: localStorage.getItem("AVATAR_COLOR") || "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 600, color: "#0F6E56", border: "2px solid #5DCAA5", flexShrink: 0 }}>
              {getInitials(user?.FullName)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 17, color: "#1e293b" }}>{user?.FullName}</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{user?.Email}</div>
              <span style={{ display: "inline-block", marginTop: 6, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: "#E1F5EE", color: "#0F6E56" }}>
                {user?.RoleID === 1 ? "Quản trị viên" : user?.RoleID === 2 ? "Nhân viên" : "Thành viên"}
              </span>
            </div>
            {!editing && (
              <button
                onClick={() => { setEditing(true); setMsg({ text: "", type: "" }); }}
                style={{ padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 13, color: "#475569", fontWeight: 600 }}
              >
                ✏ Chỉnh sửa
              </button>
            )}
          </div>

          {/* Form thông tin — KHÔNG có đổi mật khẩu */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="input-group">
              <label>Họ và tên</label>
              {editing
                ? <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                : <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, fontSize: 14, border: "1px solid #e2e8f0", color: "#1e293b" }}>{user?.FullName}</div>}
            </div>
            <div className="input-group">
              <label>Số điện thoại</label>
              {editing
                ? <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                : <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, fontSize: 14, border: "1px solid #e2e8f0", color: "#1e293b" }}>
                    {!user?.PhoneNumber || user.PhoneNumber.startsWith("G-") ? (
                      <span style={{ color: "#ef4444", fontWeight: 500 }}>Chưa cập nhật</span>
                    ) : user.PhoneNumber}
                  </div>}
            </div>
            <div className="input-group" style={{ gridColumn: "1 / -1" }}>
              <label>Email</label>
              {editing
                ? <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                : <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, fontSize: 14, border: "1px solid #e2e8f0", color: "#1e293b" }}>{user?.Email}</div>}
            </div>
            <div className="input-group" style={{ gridColumn: "1 / -1" }}>
              <label>Ngày tham gia</label>
              <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, fontSize: 14, border: "1px solid #e2e8f0", color: "#64748b" }}>
                {user?.CreatedAt ? new Date(user.CreatedAt).toLocaleDateString("vi-VN") : "—"}
              </div>
            </div>
          </div>

          {/* Link đến Cài đặt để đổi mật khẩu */}
          <div style={{ marginTop: 16, padding: "12px 14px", background: "rgba(99,102,241,0.06)", borderRadius: 10, border: "1px solid rgba(99,102,241,0.15)", fontSize: 13, color: "#6366f1" }}>
            <i className="fa-solid fa-lock" style={{ marginRight: 8 }}></i>
            Muốn đổi mật khẩu?{" "}
            <Link to="/settings" style={{ color: "#6366f1", fontWeight: 700, textDecoration: "underline" }}>
              Vào Cài đặt
            </Link>
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