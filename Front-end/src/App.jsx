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
import AdminDashboard from "./pages/AdminDashboard";       // Huy, Trọng
import Unauthorized from "./pages/Unauthorized";           // Trang lỗi 403

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* User Routes (Tạm thời bỏ ProtectedRoute để vào thẳng test giao diện) */}
        <Route path="/dashboard" element={<UserDashboard />} />
        {/* Cấu hình gốc bảo mật:
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        } />
        */}

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

        {/* Admin/Staff Routes (Tạm thời bỏ ProtectedRoute để vào thẳng test giao diện) */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        {/* Cấu hình gốc bảo mật:
        <Route path="/admin/dashboard" element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />
        */}

        {/* Mặc định chuyển về trang login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
