import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const decoded = jwtDecode(token);

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("token");
      return <Navigate to="/login" replace />;
    }

    if (requiredRole && decoded.role !== requiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }

    return children;
  } catch {
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }
}
