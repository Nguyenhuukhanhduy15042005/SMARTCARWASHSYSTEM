// Front-end/src/pages/PaymentResult.jsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./Payment.css";

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    // Đọc status từ query param (do backend redirect về)
    const statusParam = searchParams.get("status");
    if (statusParam === "success") {
      setStatus("success");
      window.dispatchEvent(new Event("noti:refresh"));
    } else if (statusParam === "failed") {
      setStatus("failed");
    } else {
      // Fallback: đọc trực tiếp VNPay params nếu có
      const vnpCode = searchParams.get("vnp_ResponseCode");
      const momoCode = searchParams.get("resultCode");
      if (vnpCode || momoCode) {
        setStatus(vnpCode === "00" || momoCode === "0" ? "success" : "failed");
      } else {
        setStatus("success"); // mặc định success nếu không có params
      }
    }
  }, []);

  return (
    <div className="payment-page-container">
      <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center" }}>
        {status === "loading" && (
          <>
            <span className="pay-spinner" style={{ borderTopColor: "#f97316", width: 40, height: 40, borderWidth: 4 }} />
            <p style={{ color: "#94a3b8", marginTop: 20 }}>Đang xác nhận giao dịch...</p>
          </>
        )}

        {status === "success" && (
          <div className="booking-card" style={{ padding: "40px 32px" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
              Thanh toán thành công!
            </h2>
            <p style={{ color: "#94a3b8", marginBottom: 28 }}>
              Giao dịch đã được xác nhận. Chúng tôi sẽ liên hệ xác nhận lịch hẹn.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn-pay-submit" style={{ width: "auto", padding: "12px 24px" }}
                onClick={() => navigate("/payments/history")}>
                Xem lịch sử giao dịch
              </button>
              <button className="btn-pay-submit"
                style={{ width: "auto", padding: "12px 24px", background: "rgba(255,255,255,0.1)" }}
                onClick={() => navigate("/dashboard")}>
                Về trang chủ
              </button>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="booking-card" style={{ padding: "40px 32px" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
              Thanh toán thất bại
            </h2>
            <p style={{ color: "#94a3b8", marginBottom: 28 }}>
              Giao dịch không thành công. Vui lòng thử lại hoặc chọn phương thức khác.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn-pay-submit" style={{ width: "auto", padding: "12px 24px" }}
                onClick={() => navigate(-2)}>
                Thử lại
              </button>
              <button className="btn-pay-submit"
                style={{ width: "auto", padding: "12px 24px", background: "rgba(255,255,255,0.1)" }}
                onClick={() => navigate("/dashboard")}>
                Về trang chủ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
