import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useTheme } from "../context/ThemeContext";

const API = "http://localhost:5000/api/users";

function validatePasswordStrength(password) {
  const errors = [];
  if (password.length < 8) errors.push("ít nhất 8 ký tự");
  if (!/[A-Z]/.test(password)) errors.push("ít nhất 1 chữ in hoa");
  if (!/[a-z]/.test(password)) errors.push("ít nhất 1 chữ thường");
  if (!/[0-9]/.test(password)) errors.push("ít nhất 1 chữ số");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("ít nhất 1 ký tự đặc biệt");
  if (/\s/.test(password)) errors.push("không chứa khoảng trắng");
  return errors;
}

function getInitials(name = "") {
  return name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();
}

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("password");
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarColor, setAvatarColor] = useState(() => localStorage.getItem("AVATAR_COLOR") || "#0F6E56");
  const [language, setLanguage] = useState(() => localStorage.getItem("APP_LANGUAGE") || "vi");

  // State hiện/ẩn mật khẩu
  const [showPw, setShowPw] = useState({ oldPassword: false, newPassword: false, confirmPassword: false });
  const [pwForm, setPwForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });

  const token = localStorage.getItem("TOKEN") || localStorage.getItem("token");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setUser(data);
        if (data.Avatar) setAvatarPreview(`http://localhost:5000${data.Avatar}`);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 4000);
  };

  // ── Đổi mật khẩu ─────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!pwForm.oldPassword) return showMsg("Vui lòng nhập mật khẩu hiện tại!", "error");
    if (!pwForm.newPassword) return showMsg("Vui lòng nhập mật khẩu mới!", "error");
    if (pwForm.newPassword !== pwForm.confirmPassword)
      return showMsg("Mật khẩu mới và xác nhận không khớp!", "error");
    const errors = validatePasswordStrength(pwForm.newPassword);
    if (errors.length > 0)
      return showMsg(`Mật khẩu chưa đủ mạnh: ${errors.join(", ")}.`, "error");

    setSaving(true);
    try {
      const res = await fetch(`${API}/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullName: user?.FullName,
          phone: user?.PhoneNumber,
          email: user?.Email,
          newPassword: pwForm.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showMsg("✅ Đổi mật khẩu thành công!");
      setPwForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setShowPw({ oldPassword: false, newPassword: false, confirmPassword: false });
    } catch (err) {
      showMsg(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Upload ảnh ────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return showMsg("Ảnh không được vượt quá 2MB!", "error");
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) return showMsg("Chỉ chấp nhận ảnh JPG, PNG, WEBP!", "error");
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = async () => {
    const file = fileInputRef.current?.files[0];
    if (!file) return showMsg("Vui lòng chọn ảnh trước!", "error");
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const res = await fetch(`${API}/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAvatarPreview(`http://localhost:5000${data.avatarUrl}`);
      setUser(prev => ({ ...prev, Avatar: data.avatarUrl }));
      showMsg("✅ Cập nhật ảnh đại diện thành công!");
    } catch (err) {
      showMsg(err.message, "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveColor = () => {
    localStorage.setItem("AVATAR_COLOR", avatarColor);
    showMsg("✅ Đã lưu màu avatar!");
  };

  const handleSaveLanguage = () => {
    localStorage.setItem("APP_LANGUAGE", language);
    showMsg("✅ Đã lưu ngôn ngữ!");
  };

  const handleLogoutAll = () => {
    if (!window.confirm("Bạn có chắc muốn đăng xuất khỏi tất cả thiết bị không?")) return;
    localStorage.removeItem("TOKEN");
    localStorage.removeItem("token");
    localStorage.removeItem("LOGIN_USER");
    navigate("/login");
  };

  const AVATAR_COLORS = ["#0F6E56","#6366f1","#f59e0b","#ef4444","#06b6d4","#10b981","#8b5cf6","#ec4899"];

  const tabs = [
    { id: "password", label: "Đổi mật khẩu",  icon: "fa-solid fa-lock" },
    { id: "avatar",   label: "Ảnh đại diện",   icon: "fa-solid fa-user-circle" },
    { id: "theme",    label: "Giao diện",        icon: "fa-solid fa-palette" },
    { id: "language", label: "Ngôn ngữ",         icon: "fa-solid fa-language" },
    { id: "security", label: "Bảo mật",          icon: "fa-solid fa-shield-halved" },
  ];

  const inputStyle = {
    width: "100%", padding: "12px 44px 12px 14px", borderRadius: 12,
    border: "1px solid var(--border)", background: "var(--bg-secondary)",
    color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  const eyeBtnStyle = {
    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", cursor: "pointer",
    color: "var(--text-secondary)", fontSize: 16, padding: 4,
  };

  if (loading) return (
    <div className="portal-layout-container">
      <Sidebar />
      <main className="portal-main-content" style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ color:"var(--text-secondary)" }}>Đang tải...</span>
      </main>
    </div>
  );

  return (
    <div className="portal-layout-container">
      <Sidebar />
      <main className="portal-main-content" style={{ padding:"40px 32px", maxWidth:900, margin:"0 auto" }}>

        <h2 style={{ color:"var(--text-primary)", fontWeight:800, fontSize:28, marginBottom:4 }}>
          <i className="fa-solid fa-gear" style={{ marginRight:10, color:"#6366f1" }}></i>
          Cài đặt
        </h2>
        <p style={{ color:"var(--text-secondary)", marginBottom:28 }}>Quản lý tài khoản và tùy chỉnh trải nghiệm của bạn</p>

        {msg.text && (
          <div style={{
            padding:"12px 16px", borderRadius:12, marginBottom:20, fontWeight:700,
            background: msg.type==="error" ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
            color: msg.type==="error" ? "#ef4444" : "#10b981",
            border: `1px solid ${msg.type==="error" ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
          }}>
            {msg.text}
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"220px 1fr", gap:24 }}>

          {/* Tab trái */}
          <div style={{ background:"var(--bg-card)", borderRadius:20, border:"1px solid var(--border)", padding:12, height:"fit-content" }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  width:"100%", display:"flex", alignItems:"center", gap:10,
                  padding:"12px 14px", borderRadius:12, border:"none", cursor:"pointer",
                  fontWeight:700, fontSize:14, marginBottom:4, textAlign:"left",
                  background: activeTab===tab.id ? "rgba(99,102,241,0.12)" : "transparent",
                  color: activeTab===tab.id ? "#818cf8" : "var(--text-secondary)",
                }}
              >
                <i className={tab.icon} style={{ width:18, textAlign:"center" }}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Nội dung tab phải */}
          <div style={{ background:"var(--bg-card)", borderRadius:20, border:"1px solid var(--border)", padding:28 }}>

            {/* ── ĐỔI MẬT KHẨU ── */}
            {activeTab === "password" && (
              <div>
                <h3 style={{ color:"var(--text-primary)", fontWeight:800, marginBottom:6 }}>Đổi mật khẩu</h3>
                <p style={{ color:"var(--text-secondary)", fontSize:14, marginBottom:24 }}>
                  Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
                </p>
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  {[
                    { label:"Mật khẩu hiện tại",    key:"oldPassword",     ph:"Nhập mật khẩu hiện tại..." },
                    { label:"Mật khẩu mới",          key:"newPassword",     ph:"Nhập mật khẩu mới..." },
                    { label:"Xác nhận mật khẩu mới", key:"confirmPassword", ph:"Nhập lại mật khẩu mới..." },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display:"block", color:"var(--text-secondary)", fontSize:13, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                        {f.label}
                      </label>
                      <div style={{ position:"relative" }}>
                        <input
                          type={showPw[f.key] ? "text" : "password"}
                          placeholder={f.ph}
                          value={pwForm[f.key]}
                          onChange={e => setPwForm({ ...pwForm, [f.key]: e.target.value })}
                          style={inputStyle}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                          style={eyeBtnStyle}
                          title={showPw[f.key] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        >
                          <i className={showPw[f.key] ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={handleChangePassword} disabled={saving}
                    style={{ padding:"12px 24px", background:"#6366f1", color:"#fff", border:"none", borderRadius:12, fontWeight:800, cursor:"pointer", fontSize:14, alignSelf:"flex-start" }}>
                    {saving ? "Đang lưu..." : "Đổi mật khẩu"}
                  </button>
                </div>
              </div>
            )}

            {/* ── ẢNH ĐẠI DIỆN ── */}
            {activeTab === "avatar" && (
              <div>
                <h3 style={{ color:"var(--text-primary)", fontWeight:800, marginBottom:6 }}>Ảnh đại diện</h3>
                <p style={{ color:"var(--text-secondary)", fontSize:14, marginBottom:24 }}>Upload ảnh hoặc chọn màu nền cho avatar.</p>
                <div style={{ display:"flex", alignItems:"center", gap:24, marginBottom:28 }}>
                  <div style={{ width:90, height:90, borderRadius:"50%", background: avatarPreview ? "transparent" : avatarColor, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", border:"3px solid var(--border)", flexShrink:0 }}>
                    {avatarPreview
                      ? <img src={avatarPreview} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : <span style={{ fontSize:32, fontWeight:700, color:"#fff" }}>{getInitials(user?.FullName || "")}</span>
                    }
                  </div>
                  <div>
                    <div style={{ fontWeight:700, color:"var(--text-primary)", fontSize:16 }}>{user?.FullName}</div>
                    <div style={{ color:"var(--text-secondary)", fontSize:13 }}>{user?.Email}</div>
                  </div>
                </div>
                <div style={{ padding:20, background:"var(--bg-secondary)", borderRadius:16, border:"2px dashed var(--border)", marginBottom:20 }}>
                  <p style={{ color:"var(--text-secondary)", fontSize:13, fontWeight:700, marginBottom:12 }}>
                    <i className="fa-solid fa-upload" style={{ marginRight:8 }}></i>
                    Upload ảnh từ máy tính (JPG, PNG, WEBP — tối đa 2MB)
                  </p>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    style={{ display:"block", marginBottom:12, color:"var(--text-primary)", fontSize:14 }}
                  />
                  <button onClick={handleUploadAvatar} disabled={uploadingAvatar}
                    style={{ padding:"10px 20px", background:"#6366f1", color:"#fff", border:"none", borderRadius:10, fontWeight:800, cursor:"pointer", fontSize:14 }}>
                    {uploadingAvatar ? "Đang upload..." : "Lưu ảnh đại diện"}
                  </button>
                </div>
                <p style={{ color:"var(--text-secondary)", fontSize:13, fontWeight:700, marginBottom:10 }}>Hoặc chọn màu nền (khi không có ảnh):</p>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:16 }}>
                  {AVATAR_COLORS.map(color => (
                    <button key={color}
                      onClick={() => { setAvatarColor(color); setAvatarPreview(null); if(fileInputRef.current) fileInputRef.current.value=""; }}
                      style={{
                        width:44, height:44, borderRadius:"50%", background:color, cursor:"pointer",
                        border: avatarColor===color && !avatarPreview ? "3px solid var(--text-primary)" : "3px solid transparent",
                        outline: avatarColor===color && !avatarPreview ? "2px solid #6366f1" : "none", outlineOffset:2,
                      }}
                    />
                  ))}
                </div>
                <button onClick={handleSaveColor}
                  style={{ padding:"10px 20px", background:"var(--bg-secondary)", color:"var(--text-primary)", border:"1px solid var(--border)", borderRadius:10, fontWeight:700, cursor:"pointer", fontSize:14 }}>
                  Lưu màu
                </button>
              </div>
            )}

            {/* ── GIAO DIỆN ── */}
            {activeTab === "theme" && (
              <div>
                <h3 style={{ color:"var(--text-primary)", fontWeight:800, marginBottom:6 }}>Giao diện</h3>
                <p style={{ color:"var(--text-secondary)", fontSize:14, marginBottom:24 }}>Chọn chủ đề hiển thị.</p>
                <div style={{ display:"flex", gap:16 }}>
                  {[
                    { value:"light", label:"Sáng", icon:"fa-solid fa-sun",  desc:"Nền trắng, chữ tối" },
                    { value:"dark",  label:"Tối",   icon:"fa-solid fa-moon", desc:"Nền tối, chữ sáng" },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setTheme(opt.value)}
                      style={{
                        flex:1, padding:"20px 16px", borderRadius:16, cursor:"pointer", textAlign:"center",
                        border: theme===opt.value ? "2px solid #6366f1" : "2px solid var(--border)",
                        background: theme===opt.value ? "rgba(99,102,241,0.1)" : "var(--bg-secondary)",
                      }}>
                      <i className={opt.icon} style={{ fontSize:28, color: theme===opt.value ? "#6366f1" : "var(--text-secondary)", marginBottom:8, display:"block" }}></i>
                      <div style={{ fontWeight:800, color:"var(--text-primary)", marginBottom:4 }}>{opt.label}</div>
                      <div style={{ fontSize:12, color:"var(--text-secondary)" }}>{opt.desc}</div>
                      {theme===opt.value && <div style={{ marginTop:8, fontSize:12, color:"#6366f1", fontWeight:700 }}>✓ Đang dùng</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── NGÔN NGỮ ── */}
            {activeTab === "language" && (
              <div>
                <h3 style={{ color:"var(--text-primary)", fontWeight:800, marginBottom:6 }}>Ngôn ngữ</h3>
                <p style={{ color:"var(--text-secondary)", fontSize:14, marginBottom:24 }}>Chọn ngôn ngữ hiển thị.</p>
                <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
                  {[
                    { value:"vi", label:"Tiếng Việt", flag:"🇻🇳" },
                    { value:"en", label:"English",    flag:"🇬🇧" },
                  ].map(lang => (
                    <button key={lang.value} onClick={() => setLanguage(lang.value)}
                      style={{
                        display:"flex", alignItems:"center", gap:14, padding:"16px 18px", borderRadius:14, cursor:"pointer",
                        border: language===lang.value ? "2px solid #6366f1" : "2px solid var(--border)",
                        background: language===lang.value ? "rgba(99,102,241,0.1)" : "var(--bg-secondary)",
                      }}>
                      <span style={{ fontSize:28 }}>{lang.flag}</span>
                      <span style={{ fontWeight:700, color:"var(--text-primary)", fontSize:15 }}>{lang.label}</span>
                      {language===lang.value && <span style={{ marginLeft:"auto", color:"#6366f1", fontWeight:700, fontSize:13 }}>✓ Đang dùng</span>}
                    </button>
                  ))}
                </div>
                {/* Thông báo tính năng đang phát triển */}
                <div style={{ padding:"12px 14px", background:"rgba(245,158,11,0.08)", borderRadius:10, border:"1px solid rgba(245,158,11,0.25)", marginBottom:16 }}>
                  <span style={{ color:"#f59e0b", fontSize:13, fontWeight:700 }}>
                    <i className="fa-solid fa-circle-info" style={{ marginRight:8 }}></i>
                    Tính năng đang phát triển, sẽ có trong phiên bản tiếp theo.
                  </span>
                </div>
                <button onClick={handleSaveLanguage}
                  style={{ padding:"12px 24px", background:"#6366f1", color:"#fff", border:"none", borderRadius:12, fontWeight:800, cursor:"pointer", fontSize:14 }}>
                  Lưu ngôn ngữ
                </button>
              </div>
            )}

            {/* ── BẢO MẬT ── */}
            {activeTab === "security" && (
              <div>
                <h3 style={{ color:"var(--text-primary)", fontWeight:800, marginBottom:6 }}>Bảo mật</h3>
                <p style={{ color:"var(--text-secondary)", fontSize:14, marginBottom:24 }}>Quản lý bảo mật tài khoản.</p>
                <div style={{ padding:20, background:"var(--bg-secondary)", borderRadius:16, border:"1px solid var(--border)", marginBottom:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ width:48, height:48, borderRadius:12, background:"rgba(239,68,68,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <i className="fa-solid fa-right-from-bracket" style={{ color:"#ef4444", fontSize:20 }}></i>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, color:"var(--text-primary)", marginBottom:4 }}>Đăng xuất tất cả thiết bị</div>
                      <div style={{ fontSize:13, color:"var(--text-secondary)" }}>Đăng xuất khỏi tất cả phiên đăng nhập hiện tại.</div>
                    </div>
                    <button onClick={handleLogoutAll}
                      style={{ padding:"10px 18px", background:"rgba(239,68,68,0.1)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.3)", borderRadius:10, fontWeight:700, cursor:"pointer", fontSize:13, whiteSpace:"nowrap" }}>
                      Đăng xuất tất cả
                    </button>
                  </div>
                </div>
                <div style={{ padding:20, background:"var(--bg-secondary)", borderRadius:16, border:"1px solid var(--border)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ width:48, height:48, borderRadius:12, background:"rgba(99,102,241,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <i className="fa-solid fa-circle-info" style={{ color:"#6366f1", fontSize:20 }}></i>
                    </div>
                    <div>
                      <div style={{ fontWeight:800, color:"var(--text-primary)", marginBottom:4 }}>Phiên hiện tại</div>
                      <div style={{ fontSize:13, color:"var(--text-secondary)" }}>
                        Đăng nhập với: <strong style={{ color:"var(--text-primary)" }}>{user?.Email}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}