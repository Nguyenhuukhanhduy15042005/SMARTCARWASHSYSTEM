import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

// ========================================================
// IMPORT PAGES (Mỗi người code ở một file trang riêng biệt)
// ========================================================
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import VehicleManagement from "./pages/VehicleManagement";
import Booking from "./pages/Booking";
import TimeslotValidation from "./pages/TimeslotValidation";
import UserDashboard from "./pages/UserDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Unauthorized from "./pages/Unauthorized";
import MemberManagement from "./pages/MemberManagement";
import AccountManagement from "./pages/AccountManagement";
import RewardRedemption from "./pages/RewardRedemption";
import FeedbackManagement from "./pages/FeedbackManagement";
import PromotionManagement from "./pages/PromotionManagement";
import LoyaltyHistory from "./pages/LoyaltyHistory";


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

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="user">
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile setUser={setUser} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vehicles"
          element={
            <ProtectedRoute>
              <VehicleManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/booking"
          element={
            <ProtectedRoute requiredRole="user">
              <Booking />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reward-redemption"
          element={
            <ProtectedRoute requiredRole="user">
              <RewardRedemption />
            </ProtectedRoute>
          }
        />

        <Route
          path="/loyalty"
          element={
            <ProtectedRoute requiredRole="user">
              <LoyaltyHistory />
            </ProtectedRoute>
          }
        />


        <Route
          path="/timeslots"
          element={
            <ProtectedRoute requiredRole={["admin", "staff"]}>
              <TimeslotValidation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/dashboard"
          element={
            <ProtectedRoute requiredRole="staff">
              <StaffDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/members"
          element={
            <ProtectedRoute requiredRole={["admin", "staff"]}>
              <MemberManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/accounts"
          element={
            <ProtectedRoute requiredRole="admin">
              <AccountManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/feedbacks"
          element={
            <ProtectedRoute requiredRole={["admin", "staff"]}>
              <FeedbackManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/promotions"
          element={
            <ProtectedRoute requiredRole={["admin", "staff"]}>
              <PromotionManagement />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
