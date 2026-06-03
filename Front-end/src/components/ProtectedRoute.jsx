import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Bọc các route cần đăng nhập và/hoặc role cụ thể.
 *
 * Dùng:
 *   <ProtectedRoute>                          → chỉ cần đăng nhập
 *   <ProtectedRoute requiredRole="admin">     → phải là admin
 *   <ProtectedRoute requiredRole="user">      → phải là user thường
 */
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Đang load auth state từ localStorage
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <span>Đang tải...</span>
      </div>
    );
  }

  // Chưa đăng nhập → về trang Login, lưu lại trang muốn vào
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Đã đăng nhập nhưng không đúng role → về trang Unauthorized
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
