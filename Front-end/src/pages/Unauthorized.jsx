import React from "react";
import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2>🚫 403 - Quyền truy cập bị từ chối</h2>
      <p>Bạn không có quyền xem trang này.</p>
      <button onClick={() => navigate("/login")}>Quay lại Đăng nhập</button>
    </div>
  );
}
