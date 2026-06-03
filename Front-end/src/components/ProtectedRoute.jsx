import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function ProtectedRoute({ children, requiredRole }) {
  const location = useLocation();

  // 1. SỬA: Đổi thành "TOKEN" (viết hoa) cho khớp với bên Login.jsx
  const token = localStorage.getItem("TOKEN");

  if (!token) {
    // Trả về trang login và kèm theo tín hiệu để hiện thông báo lỗi
    return <Navigate to="/login" state={{ error: "unauthorized" }} replace />;
  }

  try {
    const decoded = jwtDecode(token);

    // 2. SỬA: Đổi decoded.role thành decoded.roleId cho khớp với Backend tạo ra
    if (requiredRole && decoded.roleId !== requiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  } catch (err) {
    // Nếu token bị lỗi hoặc hết hạn thì xóa đi và bắt đăng nhập lại
    localStorage.removeItem("TOKEN");
    return <Navigate to="/login" state={{ error: "unauthorized" }} replace />;
  }

  // Hợp lệ toàn bộ -> Cho phép vào trang
  return children;
}
