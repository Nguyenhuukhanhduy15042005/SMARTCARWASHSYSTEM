import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

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
import Payment from "./pages/Payment";
import PaymentHistory from "./pages/PaymentHistory";
import PaymentResult from "./pages/PaymentResult";

// Trọng thêm: Import các trang quản lý của Admin/Staff
import AccountManagement from "./pages/AccountManagement";
import PromotionManagement from "./pages/PromotionManagement";
import FeedbackManagement from "./pages/FeedbackManagement";

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
          <ProtectedRoute requiredRole="user">
            <UserDashboard />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile setUser={setUser} />
          </ProtectedRoute>
        } />

        <Route path="/vehicles" element={
          <ProtectedRoute>
            <VehicleManagement />
          </ProtectedRoute>
        } />

        <Route
          path="/booking"
          element={
            <ProtectedRoute requiredRole="user">
              <Booking />
            </ProtectedRoute>
          }
        />

        <Route path="/timeslots" element={
          <ProtectedRoute requiredRole={["admin", "staff"]}>
            <TimeslotValidation />
          </ProtectedRoute>
        } />

        <Route path="/staff/dashboard" element={
          <ProtectedRoute requiredRole="staff">
            <StaffDashboard />
          </ProtectedRoute>
        } />

        <Route path="/admin/dashboard" element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route
          path="/admin/members"
          element={
            <ProtectedRoute requiredRole={["admin", "staff"]}>
              <MemberManagement />
            </ProtectedRoute>
          }
        />

        {/* Trọng thêm: Khai báo các Route quản lý của Admin / Staff */}
        <Route
          path="/admin/accounts"
          element={
            <ProtectedRoute requiredRole="admin">
              <AccountManagement />
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

        <Route
          path="/admin/feedbacks"
          element={
            <ProtectedRoute requiredRole={["admin", "staff"]}>
              <FeedbackManagement />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />

        <Route path="/payments" element={
          <ProtectedRoute requiredRole="user">
            <Payment />
          </ProtectedRoute>
        } />

        <Route path="/payments/history" element={
          <ProtectedRoute requiredRole="user">
            <PaymentHistory />
          </ProtectedRoute>
        } />

        <Route path="/payments/result" element={
          <ProtectedRoute requiredRole="user">
            <PaymentResult />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
