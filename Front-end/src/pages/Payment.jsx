// Front-end/src/pages/Payment.jsx
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Payment.css";

const API_BASE = "/api";

const PAYMENT_METHODS = [
  { id: "cash",  label: "Tiền mặt", desc: "Thanh toán tại quầy khi đến", icon: "💵" },
  { id: "vnpay", label: "VNPay",    desc: "Thanh toán qua cổng VNPay",   icon: "🏦" },
];

const TIER_INFO = {
  1: { name: "Bronze", color: "#cd7f32", needDeposit: true  },
  2: { name: "Silver", color: "#9ca3af", needDeposit: true  },
  3: { name: "Gold",   color: "#f59e0b", needDeposit: false },
  4: { name: "Platinum",color:"#7c3aed", needDeposit: false },
};

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();

  const booking = location.state?.booking || {
    BookingID: 0, ServiceName: "Dịch vụ",
    Date: "", Time: "", TotalPrice: 0, LicensePlate: "",
  };

  const [method, setMethod]     = useState("cash");
  const [loading, setLoading]   = useState(false);
  const [tierID, setTierID]     = useState(null);
  const [loadingTier, setLoadingTier] = useState(true);
  const [toast, setToast]       = useState(null);
  const [qrModal, setQrModal]   = useState(null);

  const getToken = () => localStorage.getItem("token") || localStorage.getItem("TOKEN");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price || 0);

  // Lấy tier của user khi load trang
  useEffect(() => {
    const fetchTier = async () => {
      try {
        const res = await axios.get(`${API_BASE}/payments/tier`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        setTierID(res.data.tierID);
      } catch {
        setTierID(1); // mặc định Bronze nếu lỗi
      } finally {
        setLoadingTier(false);
      }
    };
    fetchTier();
  }, []);

  // Tính số tiền hiển thị theo method + tier
  const tier = TIER_INFO[tierID] || TIER_INFO[1];
  const depositAmount  = Math.round(booking.TotalPrice * 0.1);
  const remainingAmount = booking.TotalPrice - depositAmount;

  const getPaymentNote = () => {
    if (method !== "cash") return null;
    if (tier.needDeposit) {
      return (
        <div className="payment-redirect-note" style={{ borderColor: "rgba(205,127,50,0.3)", background: "rgba(205,127,50,0.06)" }}>
          <span>⚠️</span>
          <div>
            <p>Hạng <strong style={{ color: tier.color }}>{tier.name}</strong> cần đặt cọc <strong style={{ color: "#f97316" }}>10% = {formatPrice(depositAmount)}</strong></p>
            <p style={{ marginTop: 4, fontSize: 12, color: "#94a3b8" }}>Số tiền còn lại <strong>{formatPrice(remainingAmount)}</strong> sẽ thanh toán khi check-in.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="payment-redirect-note" style={{ borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.06)" }}>
        <span>⭐</span>
        <div>
          <p>Hạng <strong style={{ color: tier.color }}>{tier.name}</strong> — <strong style={{ color: "#10b981" }}>Miễn phí giữ chỗ!</strong></p>
          <p style={{ marginTop: 4, fontSize: 12, color: "#94a3b8" }}>Staff sẽ thu toàn bộ <strong>{formatPrice(booking.TotalPrice)}</strong> khi check-in.</p>
        </div>
      </div>
    );
  };

  const getButtonLabel = () => {
    if (method === "vnpay") return `Thanh toán qua VNPay →`;
    if (tier.needDeposit) return `Đặt cọc ${formatPrice(depositAmount)} qua VNPay →`;
    return "✓ Xác nhận giữ chỗ (Miễn phí)";
  };

  const handleSubmit = async () => {
    if (!booking.BookingID) {
      showToast("Không tìm thấy thông tin booking!", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/payments`, {
        bookingId: booking.BookingID,
        method,
        amount: booking.TotalPrice,
      }, { headers: { Authorization: `Bearer ${getToken()}` } });

      if (res.data.paymentUrl) {
        showToast("Đang chuyển hướng đến cổng thanh toán...", "success");
        setTimeout(() => window.location.href = res.data.paymentUrl, 1200);
      } else if (res.data.qrData) {
        // Cash + Bronze/Silver → hiện modal QR đặt cọc
        setQrModal({
          qrData: res.data.qrData,
          depositAmount: res.data.depositAmount,
        });
      } else if (method === "cash" && tier.needDeposit) {
        showToast(`Đặt cọc ${formatPrice(depositAmount)} thành công!`, "success");
        setTimeout(() => navigate("/payments/history"), 1500);
      } else {
        showToast("Giữ chỗ thành công! Staff sẽ thu tiền khi check-in.", "success");
        setTimeout(() => navigate("/dashboard"), 1500);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      showToast(errMsg || "Thanh toán thất bại", "error");
    } finally {
      setLoading(false);
    }
  };

  // Tính số tiền hiển thị trong summary
  const displayAmount = () => {
    if (method !== "cash") return booking.TotalPrice;
    if (tier.needDeposit) return depositAmount;
    return 0;
  };

  return (
    <div className="payment-page-container">
      <div className="payment-wrapper">
        {/* LEFT */}
        <div className="payment-left">
          <button className="payment-back-btn" onClick={() => navigate(-1)}>← Quay lại</button>
          <h1 className="payment-title">Thanh toán</h1>
          <p className="payment-subtitle">Chọn phương thức thanh toán phù hợp</p>

          {/* Booking info */}
          <div className="payment-booking-info">
            <div className="pbi-row"><span className="pbi-label">Dịch vụ</span><span className="pbi-value">{booking.ServiceName}</span></div>
            <div className="pbi-row"><span className="pbi-label">Biển số</span><span className="pbi-value">{booking.LicensePlate}</span></div>
            <div className="pbi-row"><span className="pbi-label">Ngày hẹn</span><span className="pbi-value">{booking.Date} — {booking.Time}</span></div>
            {!loadingTier && (
              <div className="pbi-row">
                <span className="pbi-label">Hạng thành viên</span>
                <span style={{ fontWeight: 700, color: tier.color }}>★ {tier.name}</span>
              </div>
            )}
            <div className="pbi-divider" />
            <div className="pbi-row">
              <span className="pbi-label">Tổng tiền dịch vụ</span>
              <span className="pbi-total">{formatPrice(booking.TotalPrice)}</span>
            </div>
          </div>

          {/* Phương thức */}
          <p className="payment-section-label">Phương thức thanh toán</p>
          <div className="payment-methods">
            {PAYMENT_METHODS.map((m) => (
              <button key={m.id}
                className={`payment-method-option ${method === m.id ? "active" : ""}`}
                onClick={() => setMethod(m.id)}>
                <span className="pmo-icon">{m.icon}</span>
                <div className="pmo-body">
                  <span className="pmo-label">{m.label}</span>
                  <span className="pmo-desc">{m.desc}</span>
                </div>
                <span className={`pmo-radio ${method === m.id ? "checked" : ""}`} />
              </button>
            ))}
          </div>

          {/* Ghi chú theo tier/method */}
          {!loadingTier && getPaymentNote()}

          {method === "vnpay" && (
            <div className="payment-redirect-note">
              <span>ℹ️</span>
              <p>Bạn sẽ được chuyển hướng đến <strong>VNPay</strong>. Sau khi hoàn tất sẽ tự động quay về.</p>
            </div>
          )}

          <button className="btn-pay-submit" onClick={handleSubmit}
            disabled={loading || loadingTier}>
            {loading ? <span className="pay-spinner" /> : getButtonLabel()}
          </button>
        </div>

        {/* RIGHT — Summary */}
        <div className="payment-right">
          <div className="payment-summary-card">
            <h3 className="ps-title">Chi tiết thanh toán</h3>
            <div className="ps-service-box">
              <div className="ps-service-icon">🚗</div>
              <div>
                <p className="ps-service-name">{booking.ServiceName}</p>
                <p className="ps-service-meta">Booking #{booking.BookingID} · {booking.LicensePlate}</p>
              </div>
            </div>

            <div className="ps-rows">
              <div className="ps-row"><span>Giá dịch vụ</span><span>{formatPrice(booking.TotalPrice)}</span></div>
              {method === "cash" && !loadingTier && tier.needDeposit && (
                <>
                  <div className="ps-row">
                    <span>Đặt cọc (10%)</span>
                    <span style={{ color: "#f97316", fontWeight: 700 }}>{formatPrice(depositAmount)}</span>
                  </div>
                  <div className="ps-row">
                    <span>Còn lại (khi check-in)</span>
                    <span>{formatPrice(remainingAmount)}</span>
                  </div>
                </>
              )}
              {method === "cash" && !loadingTier && !tier.needDeposit && (
                <div className="ps-row">
                  <span>Thanh toán ngay</span>
                  <span className="green-text">Miễn phí</span>
                </div>
              )}
              <div className="ps-row"><span>Phương thức</span><span>{PAYMENT_METHODS.find((m2) => m2.id === method)?.label}</span></div>
            </div>

            <div className="ps-total-row">
              <span>Cần thanh toán ngay</span>
              <span className="ps-total-amount">{formatPrice(displayAmount())}</span>
            </div>

            {method === "cash" && !loadingTier && tier.needDeposit && (
              <div style={{ textAlign: "center", fontSize: 12, color: "#64748b", marginTop: 8 }}>
                Hạng {tier.name} — đặt cọc 10% để giữ chỗ
              </div>
            )}
            {method === "cash" && !loadingTier && !tier.needDeposit && (
              <div style={{ textAlign: "center", fontSize: 12, color: "#10b981", marginTop: 8 }}>
                ⭐ Hạng {tier.name} — miễn phí giữ chỗ!
              </div>
            )}

            <div className="ps-security-note"><span>🔒</span><span>Giao dịch được mã hoá an toàn</span></div>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`booking-toast ${toast.type === "error" ? "booking-toast-error" : "booking-toast-success"}`}>
          <span>{toast.type === "error" ? "❌" : "✅"}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
