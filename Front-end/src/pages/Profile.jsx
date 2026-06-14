import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const API = "http://localhost:5000/api/users";

function getInitials(name = "") {
  return name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();
}

// Quy tắc mật khẩu mạnh: tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt
function validatePasswordStrength(password) {
  const errors = [];
  if (password.length < 8) errors.push("ít nhất 8 ký tự");
  if (!/[A-Z]/.test(password)) errors.push("ít nhất 1 chữ in hoa");
  if (!/[a-z]/.test(password)) errors.push("ít nhất 1 chữ thường");
  if (!/[0-9]/.test(password)) errors.push("ít nhất 1 chữ số");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("ít nhất 1 ký tự đặc biệt (!@#$%...)");
  if (/\s/.test(password)) errors.push("không chứa khoảng trắng");
  return errors;
}

export default function Profile({ setUser }) {
  const navigate = useNavigate();
  const [user, setLocalUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", oldPassword: "", newPassword: "", confirmPassword: "" });

  // ✅ Dùng "TOKEN" (viết hoa) — khớp với Login.jsx
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
        setForm({ fullName: data.FullName || "", phone: data.PhoneNumber || "", email: data.Email || "", oldPassword: "", newPassword: "", confirmPassword: "" });
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

    // ✅ Validate đổi mật khẩu (chỉ khi người dùng có nhập mật khẩu mới)
    if (form.newPassword || form.oldPassword || form.confirmPassword) {
      if (!form.oldPassword) {
        setMsg({ text: "Vui lòng nhập mật khẩu cũ.", type: "error" });
        return;
      }
      if (!form.newPassword) {
        setMsg({ text: "Vui lòng nhập mật khẩu mới.", type: "error" });
        return;
      }
      const strengthErrors = validatePasswordStrength(form.newPassword);
      if (strengthErrors.length > 0) {
        setMsg({ text: `Mật khẩu mới chưa đủ mạnh, cần có: ${strengthErrors.join(", ")}.`, type: "error" });
        return;
      }
      if (form.newPassword === form.oldPassword) {
        setMsg({ text: "Mật khẩu mới không được giống mật khẩu cũ.", type: "error" });
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        setMsg({ text: "Mật khẩu xác nhận không khớp với mật khẩu mới.", type: "error" });
        return;
      }
    }

    setSaving(true);
    try {
      // Chỉ gửi oldPassword/newPassword khi người dùng thực sự muốn đổi mật khẩu
      const payload = {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
      };
      if (form.newPassword) {
        payload.oldPassword = form.oldPassword;
        payload.newPassword = form.newPassword;
      }

      const res = await fetch(`${API}/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Cập nhật lại state local
      setLocalUser((prev) => ({ ...prev, FullName: form.fullName, PhoneNumber: form.phone, Email: form.email }));

      // Cập nhật lại LOGIN_USER trong localStorage cho khớp
      const savedUser = JSON.parse(localStorage.getItem("LOGIN_USER") || "{}");
      const updatedUser = { ...savedUser, fullName: form.fullName };
      localStorage.setItem("LOGIN_USER", JSON.stringify(updatedUser));
      if (setUser) setUser(updatedUser);

      setMsg({ text: "✅ Cập nhật thành công!", type: "success" });
      setForm((prev) => ({ ...prev, oldPassword: "", newPassword: "", confirmPassword: "" }));
      setEditing(false);
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 15 }}>
        Đang tải thông tin...
      </div>
    );
  }

  const isMember = !user || (user.RoleID !== 1 && user.RoleID !== 2); // kept for role badge display only

  return (
    <div className="portal-layout-container" style={{ minHeight: "100vh" }}>
      <Sidebar />
      <main
        className="portal-main-content"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px 20px",
        }}
      >
        <div className="auth-card" style={{ maxWidth: 520, width: "100%", textAlign: "left" }}>
          <h2>Hồ Sơ Của Tôi</h2>

        {/* Thông báo */}
        {msg.text && (
          <div className={msg.type === "success" ? "success-msg" : "error-msg"} style={{ marginBottom: 16 }}>
            {msg.text}
          </div>
        )}

        {/* Avatar + tên */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: "16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 600, color: "#0F6E56", border: "2px solid #5DCAA5", flexShrink: 0 }}>
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
              onMouseOver={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#fff")}
            >
              ✏ Chỉnh sửa
            </button>
          )}
        </div>

        {/* Form thông tin */}
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
              : <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, fontSize: 14, border: "1px solid #e2e8f0", color: "#1e293b" }}>{user?.PhoneNumber}</div>}
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
          {editing && (
            <>
              <div className="input-group" style={{ gridColumn: "1 / -1" }}>
                <label>Mật khẩu cũ</label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu hiện tại..."
                  value={form.oldPassword}
                  onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label>Mật khẩu mới (để trống nếu không đổi)</label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu mới..."
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label>Nhập lại mật khẩu mới</label>
                <input
                  type="password"
                  placeholder="Nhập lại mật khẩu mới..."
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
              </div>
              <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#94a3b8", marginTop: -6 }}>
                Mật khẩu mới cần tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
              </div>
            </>
          )}
        </div>

        {/* Nút lưu / hủy */}
        {editing && (
          <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
            <button
              onClick={() => {
                setEditing(false);
                setMsg({ text: "", type: "" });
                setForm((prev) => ({ ...prev, oldPassword: "", newPassword: "", confirmPassword: "" }));
              }}
              style={{ padding: "10px 20px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14, color: "#475569", fontWeight: 600 }}
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
              style={{ padding: "10px 24px" }}
            >
              {saving ? "Đang lưu..." : "💾 Lưu thay đổi"}
            </button>
          </div>
        )}

        </div>
      </main>
    </div>
  );
}
