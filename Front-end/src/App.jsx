import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

// ========================================================
// IMPORT PAGES (Mỗi người code ở một file trang riêng biệt)
// ========================================================
import Login from "./pages/Login";                         // Thắng
import Profile from "./pages/Profile";                     // Duy
import VehicleManagement from "./pages/VehicleManagement"; // Thái
import Booking from "./pages/Booking";                     // Thắng
import UserDashboard from "./pages/UserDashboard";         // Trọng
import StaffDashboard from "./pages/StaffDashboard";       // Trọng
import AdminDashboard from "./pages/AdminDashboard";       // Huy, Trọng
import Unauthorized from "./pages/Unauthorized";           // Trang lỗi 403

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* User Routes (Đăng nhập mới xem được) */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/vehicles" element={
          <ProtectedRoute>
            <VehicleManagement />
          </ProtectedRoute>
        } />
        <Route path="/booking" element={
          <ProtectedRoute>
            <Booking />
          </ProtectedRoute>
        } />

        {/* Staff Routes (Đăng nhập + Vai trò staff mới xem được) */}
        <Route path="/staff/dashboard" element={
          <ProtectedRoute requiredRole="staff">
            <StaffDashboard />
          </ProtectedRoute>
        } />

        {/* Admin Routes (Đăng nhập + Vai trò admin mới xem được) */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* Mặc định chuyển về trang login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
