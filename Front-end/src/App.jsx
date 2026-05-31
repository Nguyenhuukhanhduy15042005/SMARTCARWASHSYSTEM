import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

// =========================================================
// CODE DO TRỌNG THÊM VÀO ĐỂ IMPORT TRANG DASHBOARD MỚI (TASK 7)
// =========================================================
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";

const Unauthorized = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--code-bg)" }}>
    <div style={{ padding: "40px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", boxShadow: "var(--shadow)", textAlign: "center" }}>
      <span style={{ fontSize: "64px" }}>🚫</span>
      <h1 style={{ fontSize: "28px", margin: "16px 0 8px", color: "var(--text-h)" }}>403 - Quyền truy cập bị từ chối</h1>
      <p style={{ color: "var(--text)", marginBottom: "24px" }}>Tài khoản của bạn không có quyền xem trang này.</p>
      <a href="/login" onClick={() => localStorage.removeItem("token")} style={{ background: "var(--accent)", color: "white", padding: "10px 20px", borderRadius: "8px", textDecoration: "none", fontWeight: "600" }}>
        Quay lại Đăng nhập
      </a>
    </div>
  </div>
);
// =========================================================

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Chỉ admin */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* User thường */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        } />

        {/* Mặc định redirect về login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;