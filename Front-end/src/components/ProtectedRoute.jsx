import React from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const decoded = jwtDecode(token);
    if (requiredRole && decoded.role !== requiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  } catch (err) {
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }

  return children;
}
