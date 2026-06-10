import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Bọc các route cần đăng nhập và/hoặc role cụ thể.
 *
 * Dùng:
 *   <ProtectedRoute>                          → chỉ cần đăng nhập
 *   <ProtectedRoute requiredRole="admin">     → phải là admin
 *   <ProtectedRoute requiredRole="user">      → user thường, staff & admin đều vào được
 *
 * Thứ tự quyền: admin > staff > user
 * Admin có thể vào MỌI trang.
 * Staff có thể vào trang của user (dashboard, booking).
 */

const ROLE_LEVEL = { admin: 3, staff: 2, user: 1 };

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Đang load auth state từ localStorage
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <span>Đang tải...</span>
      </div>
    );
  }

  // Chưa đăng nhập → về trang Login, lưu lại trang muốn vào
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Kiểm tra quyền nếu có requiredRole
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    // Admin luôn được phép vào bất kỳ trang nào
    if (user.role === "admin") {
      return children;
    }

    // Tính level tối thiểu cần có dựa trên danh sách roles cho phép
    const minRequiredLevel = Math.min(...roles.map((r) => ROLE_LEVEL[r] ?? 99));

    // User hiện tại phải có level >= level tối thiểu
    const userLevel = ROLE_LEVEL[user.role] ?? 0;

    if (userLevel < minRequiredLevel) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Hợp lệ toàn bộ -> Cho phép vào trang
  return children;
};

export default ProtectedRoute;
