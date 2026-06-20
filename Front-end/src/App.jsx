import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings"; // ← THÊM MỚI
import VehicleManagement from "./pages/VehicleManagement";
import Booking from "./pages/Booking";
import TimeslotValidation from "./pages/TimeslotValidation";
import UserDashboard from "./pages/UserDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Unauthorized from "./pages/Unauthorized";
import MemberManagement from "./pages/MemberManagement";
import Payment from "./pages/Payment";
import PaymentHistory from "./pages/PaymentHistory";
import PaymentResult from "./pages/PaymentResult";
import AccountManagement from "./pages/AccountManagement";
import PromotionManagement from "./pages/PromotionManagement";
import FeedbackManagement from "./pages/FeedbackManagement";
import RewardRedemption from "./pages/RewardRedemption";
import LoyaltyHistory from "./pages/LoyaltyHistory";
import MachineDashboard from "./pages/MachineDashboard";
// Trọng thêm mới: trang Thống kê Analytics dành cho Admin
import AnalyticsDashboard from "./pages/AnalyticsDashboard";

const getStoredRole = () => {
  try {
    const savedUser = JSON.parse(localStorage.getItem("LOGIN_USER") || "null");
    const role =
      savedUser?.role ||
      savedUser?.RoleName ||
      savedUser?.roleName ||
      savedUser?.user?.role ||
      savedUser?.user?.RoleName ||
      "";
    return String(role).toLowerCase();
  } catch (_) {
    return "";
  }
};

function AdminSharedRoute({ children, staffPath }) {
  const role = getStoredRole();
  if (role === "staff" && window.location.pathname.startsWith("/admin/")) {
    return <Navigate to={staffPath} replace />;
  }
  return children;
}

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("LOGIN_USER");
    return saved ? JSON.parse(saved) : null;
  });

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route path="/dashboard" element={
          <ProtectedRoute requiredRole="user"><UserDashboard /></ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute><Profile setUser={setUser} /></ProtectedRoute>
        } />

        {/* ← ROUTE CÀI ĐẶT MỚI */}
        <Route path="/settings" element={
          <ProtectedRoute><Settings /></ProtectedRoute>
        } />

        <Route path="/vehicles" element={
          <ProtectedRoute><VehicleManagement /></ProtectedRoute>
        } />

        <Route path="/booking" element={
          <ProtectedRoute requiredRole="user"><Booking /></ProtectedRoute>
        } />

        <Route path="/reward-redemption" element={
          <ProtectedRoute requiredRole="user"><RewardRedemption /></ProtectedRoute>
        } />

        <Route path="/loyalty" element={
          <ProtectedRoute requiredRole="user"><LoyaltyHistory /></ProtectedRoute>
        } />

        <Route path="/timeslots" element={
          <ProtectedRoute requiredRole={["admin", "staff"]}><TimeslotValidation /></ProtectedRoute>
        } />

        <Route path="/admin/timeslots" element={
          <ProtectedRoute requiredRole="admin"><TimeslotValidation /></ProtectedRoute>
        } />

        <Route path="/staff/timeslots" element={
          <ProtectedRoute requiredRole="staff"><TimeslotValidation /></ProtectedRoute>
        } />

        <Route path="/staff/dashboard" element={
          <ProtectedRoute requiredRole="staff"><StaffDashboard /></ProtectedRoute>
        } />

        <Route path="/admin/dashboard" element={
          <ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>
        } />

        {/* Trọng thêm mới: Route trang Thống kê Analytics - chỉ Admin mới vào được */}
        <Route path="/admin/analytics" element={
          <ProtectedRoute requiredRole="admin"><AnalyticsDashboard /></ProtectedRoute>
        } />

        <Route path="/admin/members" element={
          <ProtectedRoute requiredRole={["admin", "staff"]}>
            <AdminSharedRoute staffPath="/staff/members"><MemberManagement /></AdminSharedRoute>
          </ProtectedRoute>
        } />

        <Route path="/staff/members" element={
          <ProtectedRoute requiredRole="staff"><MemberManagement /></ProtectedRoute>
        } />

        <Route path="/admin/accounts" element={
          <ProtectedRoute requiredRole="admin"><AccountManagement /></ProtectedRoute>
        } />

        <Route path="/admin/promotions" element={
          <ProtectedRoute requiredRole={["admin", "staff"]}>
            <AdminSharedRoute staffPath="/staff/promotions"><PromotionManagement /></AdminSharedRoute>
          </ProtectedRoute>
        } />

        <Route path="/staff/promotions" element={
          <ProtectedRoute requiredRole="staff"><PromotionManagement /></ProtectedRoute>
        } />

        <Route path="/admin/feedbacks" element={
          <ProtectedRoute requiredRole={["admin", "staff"]}>
            <AdminSharedRoute staffPath="/staff/feedbacks"><FeedbackManagement /></AdminSharedRoute>
          </ProtectedRoute>
        } />

        <Route path="/staff/feedbacks" element={
          <ProtectedRoute requiredRole="staff"><FeedbackManagement /></ProtectedRoute>
        } />

        <Route path="/admin/machines" element={
          <ProtectedRoute requiredRole={["admin", "staff"]}>
            <AdminSharedRoute staffPath="/staff/machines"><MachineDashboard /></AdminSharedRoute>
          </ProtectedRoute>
        } />

        <Route path="/staff/machines" element={
          <ProtectedRoute requiredRole="staff"><MachineDashboard /></ProtectedRoute>
        } />

        <Route path="/payments" element={
          <ProtectedRoute requiredRole="user"><Payment /></ProtectedRoute>
        } />

        <Route path="/payments/history" element={
          <ProtectedRoute requiredRole="user"><PaymentHistory /></ProtectedRoute>
        } />

        <Route path="/payments/result" element={
          <ProtectedRoute requiredRole="user"><PaymentResult /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;