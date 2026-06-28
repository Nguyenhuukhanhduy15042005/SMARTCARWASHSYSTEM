import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_LEVEL = { admin: 3, staff: 2, user: 1 };

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"100vh" }}>
        <span>Đang tải...</span>
      </div>
    );
  }

  // Chưa đăng nhập → về trang HOME (không phải /login)
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requiredRole) {
    const roles    = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const userRole = user.role || (user.roleId === 1 ? "admin" : user.roleId === 2 ? "staff" : "user");

    if (userRole === "admin") return children;

    const minRequiredLevel = Math.min(...roles.map((r) => ROLE_LEVEL[r] ?? 99));
    const userLevel        = ROLE_LEVEL[userRole] ?? 0;

    if (userLevel < minRequiredLevel) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
