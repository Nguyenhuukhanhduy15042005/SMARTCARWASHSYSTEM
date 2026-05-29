import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

// Tạm thời placeholder, sau thay bằng component thật
const AdminDashboard = () => <h1>Admin Dashboard</h1>;
const UserDashboard = () => <h1>User Dashboard</h1>;
const Unauthorized = () => <h1>403 - Không có quyền truy cập</h1>;

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