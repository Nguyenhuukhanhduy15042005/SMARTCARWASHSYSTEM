// Front-end/src/pages/Payment.jsx
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "./Payment.css";

const API_BASE = "http://localhost:5000/api";

const PAYMENT_METHODS = [
  { id: "cash", label: "Tiền mặt", desc: "Thanh toán tại quầy khi đến", icon: "💵" },
  { id: "vnpay", label: "VNPay", desc: "Thanh toán qua cổng VNPay", icon: "🏦" },
];

const TIER_INFO = {
  1: { name: "Bronze", color: "#cd7f32", needDeposit: true },
  2: { name: "Silver", color: "#9ca3af", needDeposit: true },
  3: { name: "Gold", color: "#f59e0b", needDeposit: false },
  4: { name: "Platinum", color: "#7c3aed", needDeposit: false },
};

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();

  const booking = location.state?.booking || {
    BookingID: 0, ServiceName: "Dịch vụ",
    Date: "", Time: "", TotalPrice: 0, LicensePlate: "",
  };

  const [bookingData, setBookingData] = useState(booking);
  const [method, setMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [tierID, setTierID] = useState(null);
  const [loadingTier, setLoadingTier] = useState(true);
  const [toast, setToast] = useState(null);
  const [qrModal, setQrModal] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null); // State lưu giây còn lại

  const [vouchers, setVouchers] = useState([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [cancelCount, setCancelCount] = useState(0);

  const getToken = () => localStorage.getItem("token") || localStorage.getItem("TOKEN");

  const getCustomerId = () => {
    const token = getToken();
    if (token && token !== "mock-token" && token !== "null" && token !== "undefined") {
      try {
        const decoded = jwtDecode(token);
        return decoded.id || decoded.userId || 12;
      } catch (err) {
        console.error("Error decoding token:", err);
      }
    }
    return 12;
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price || 0);

  //time
  const formatTimeLeft = (seconds) => {
    if (seconds === null) return "--:--";
    if (seconds <= 0) return "Đã hết hạn";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Tính toán thời gian đếm ngược 15 phút dựa trên CreatedAt của booking
  useEffect(() => {
    if (!bookingData?.CreatedAt) return;

    //Ở Việt Nam (GMT+7, nhanh hơn giờ quốc tế 7 tiếng)
    const calculateTimeLeft = () => {
      // Lấy thời gian gốc
      const createdTime = new Date(bookingData.CreatedAt).getTime();
      // Lấy khoảng thời gian lệch múi giờ của trình duyệt (ví dụ Việt Nam là -420 phút = 7 tiếng)
      const timezoneOffsetMs = new Date().getTimezoneOffset() * 60 * 1000;
      // Trừ đi múi giờ lệch để đưa về đúng giờ thực tế
      const localCreatedTime = createdTime + timezoneOffsetMs;

      const limitTime = localCreatedTime + 15 * 60 * 1000; // 15 phút
      const diff = Math.floor((limitTime - Date.now()) / 1000); // Chuyển sang giây
      return diff > 0 ? diff : 0;
    };
    // Khởi tạo giây ban đầu
    setTimeLeft(calculateTimeLeft());
    const intervalId = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(intervalId); // Dừng đếm ngược khi về 0
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [bookingData]);

  // Lấy thông tin khi load trang
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

    // Đếm số lần hủy trong 30 ngày gần nhất (tự tính ở FE, dùng lại API /bookings có sẵn)
    // Mô phỏng đúng logic backend: Status=5 (Đã hủy) VÀ BookingDate >= hôm nay - 30 ngày
    const fetchCancelCount = async () => {
      try {
        const userId = getCustomerId();
        const res = await axios.get(`${API_BASE}/bookings?customerId=${userId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const list = res.data?.data || res.data || [];
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const count = list.filter((b) => {
          const isCancelled = Number(b.Status) === 5;
          const bookingTime = b.BookingDate ? new Date(b.BookingDate).getTime() : 0;
          return isCancelled && bookingTime >= thirtyDaysAgo;
        }).length;
        setCancelCount(count);
      } catch (err) {
        console.error("Lỗi khi đếm số lần hủy:", err);
        setCancelCount(0);
      }
    };
    fetchCancelCount();

    const fetchBookingAndVouchers = async () => {
      const bId = bookingData?.BookingID || booking?.BookingID;
      if (!bId) return;

      try {
        const bookingRes = await axios.get(`${API_BASE}/bookings/${bId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        setBookingData(bookingRes.data);
      } catch (err) {
        console.error("Lỗi khi tải thông tin đặt lịch:", err);
      }

      try {
        const userId = getCustomerId();
        const vouchersRes = await axios.get(`${API_BASE}/loyalty/my-vouchers?userId=${userId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        // Lọc chỉ giữ lại các voucher chưa được sử dụng (IsUsed bằng 0 hoặc false hoặc null)
        const unusedVouchers = (vouchersRes.data || []).filter(
          (v) => !v.IsUsed && v.IsUsed !== 1 && v.IsUsed !== true
        );
        setVouchers(unusedVouchers);
      } catch (err) {
        console.error("Lỗi khi tải danh sách voucher của bạn:", err);
      }
    };
    fetchBookingAndVouchers();
  }, []);

  const activeVoucher = vouchers.find(v => v.MemberPromoID === bookingData?.MemberPromoID) || null;

  const currentTotalPrice = bookingData?.TotalPrice || booking.TotalPrice || 0;
  const currentFinalPrice = bookingData?.FinalPrice ?? currentTotalPrice;
  const discountAmount = currentTotalPrice - currentFinalPrice;

  // Tính số tiền hiển thị theo method + tier
  const tier = TIER_INFO[tierID] || TIER_INFO[1];

  // Gold/Platinum đã hủy >= 3 lần trong 30 ngày → bị bắt cọc 10% như Bronze/Silver
  // (mô phỏng đúng logic forceDeposit trong paymentService.js ở backend)
  const forceDeposit = (tierID === 3 || tierID === 4) && cancelCount >= 3;
  const effectiveNeedDeposit = tier.needDeposit || forceDeposit;

  const depositAmount = Math.min(currentFinalPrice, Math.max(10000, Math.round(currentFinalPrice * 0.1)));
  const remainingAmount = currentFinalPrice - depositAmount;

  const getPaymentNote = () => {
    if (method !== "cash") return null;
    if (forceDeposit) {
      return (
        <div className="payment-redirect-note" style={{ borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.08)" }}>
          <span>🚨</span>
          <div>
            <p>Hạng <strong style={{ color: tier.color }}>{tier.name}</strong> đã hủy đủ <strong style={{ color: "#ef4444" }}>3 lần</strong> trong 30 ngày, cần đặt cọc <strong style={{ color: "#f97316" }}>{Math.round(currentFinalPrice * 0.1) < 10000 ? "10% (Tối thiểu 10.000 đ)" : "10%"} = {formatPrice(depositAmount)}</strong> như hạng Bronze/Silver.</p>
            <p style={{ marginTop: 4, fontSize: 12, color: "#94a3b8" }}>Số tiền còn lại <strong>{formatPrice(remainingAmount)}</strong> sẽ thanh toán khi check-in.</p>
          </div>
        </div>
      );
    }
    if (tier.needDeposit) {
      return (
        <div className="payment-redirect-note" style={{ borderColor: "rgba(205,127,50,0.3)", background: "rgba(205,127,50,0.06)" }}>
          <span>⚠️</span>
          <div>
            <p>Hạng <strong style={{ color: tier.color }}>{tier.name}</strong> cần đặt cọc <strong style={{ color: "#f97316" }}>{Math.round(currentFinalPrice * 0.1) < 10000 ? "10% (Tối thiểu 10.000 đ)" : "10%"} = {formatPrice(depositAmount)}</strong></p>
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
          <p style={{ marginTop: 4, fontSize: 12, color: "#94a3b8" }}>Staff sẽ thu toàn bộ <strong>{formatPrice(currentFinalPrice)}</strong> khi check-in.</p>
        </div>
      </div>
    );
  };

  const getButtonLabel = () => {
    if (method === "vnpay") return `Thanh toán qua VNPay →`;
    if (effectiveNeedDeposit) return `Đặt cọc ${formatPrice(depositAmount)} qua VNPay →`;
    return "✓ Xác nhận giữ chỗ (Miễn phí)";
  };

  const handleApplyVoucher = async (memberPromoId) => {
    const bId = bookingData?.BookingID || booking?.BookingID;
    if (!bId) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/bookings/${bId}/apply-voucher`, {
        memberPromoId
      }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      setBookingData(prev => ({
        ...prev,
        FinalPrice: res.data.FinalPrice,
        MemberPromoID: res.data.MemberPromoID
      }));

      if (memberPromoId) {
        showToast("Áp dụng mã giảm giá thành công!", "success");
      } else {
        showToast("Đã gỡ bỏ mã giảm giá!", "success");
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      showToast(errMsg || "Không thể áp dụng voucher", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const bId = bookingData?.BookingID || booking?.BookingID;
    if (!bId) {
      showToast("Không tìm thấy thông tin booking!", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/payments`, {
        bookingId: bId,
        method,
        amount: currentFinalPrice,
      }, { headers: { Authorization: `Bearer ${getToken()}` } });

      if (res.data.paymentUrl) {
        showToast("Đang chuyển hướng đến cổng thanh toán...", "success");
        setTimeout(() => window.location.href = res.data.paymentUrl, 1200);
      } else if (res.data.qrData) {
        setQrModal({
          qrData: res.data.qrData,
          depositAmount: res.data.depositAmount,
        });
      } else if (method === "cash" && effectiveNeedDeposit) {
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
    if (method !== "cash") return currentFinalPrice;
    if (effectiveNeedDeposit) return depositAmount;
    return 0;
  };

  return (
    <div className="payment-page-container">
      <div className="payment-top-bar" style={{ maxWidth: "900px", margin: "0 auto 20px" }}>
        <button className="payment-back-btn" onClick={() => navigate(-1)}>← Quay lại</button>
      </div>
      <div className="payment-wrapper">
        {/* LEFT */}
        <div className="payment-left">
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
              <span className="pbi-total">{formatPrice(currentTotalPrice)}</span>
            </div>
          </div>

          {/* Cảnh báo đếm ngược thời gian thanh toán 15 phút */}
          {timeLeft !== null && (
            <div style={{
              background: timeLeft <= 0 ? "#fef2f2" : "#fffbeb",
              color: timeLeft <= 0 ? "#ef4444" : "#b45309",
              border: timeLeft <= 0 ? "1px solid #fee2e2" : "1px solid #fef3c7",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 600,
              fontSize: "14px"
            }}>
              <i className="fa-regular fa-clock" style={{ fontSize: "16px" }}></i>
              <span>
                {timeLeft <= 0
                  ? "Lịch đặt của bạn đã quá 15 phút chưa thanh toán nên đã bị hủy."
                  : `Vui lòng hoàn tất thanh toán trong: ${formatTimeLeft(timeLeft)}`}
              </span>
            </div>
          )}

          {/* Phương thức */}
          <p className="payment-section-label">Phương thức thanh toán</p>
          <div className="payment-methods">
            {PAYMENT_METHODS.map((m) => (
              <button key={m.id}
                className={`payment-method-option ${method === m.id ? "active" : ""}`}
                onClick={() => setMethod(m.id)}>
                <span className="pmo-icon">{m.icon}</span>s
                <div className="pmo-body">
                  <span className="pmo-label">{m.label}</span>
                  <span className="pmo-desc">{m.desc}</span>
                </div>
                <span className={`pmo-radio ${method === m.id ? "checked" : ""}`} />
              </button>
            ))}
          </div>

          {/* Voucher / Khuyến mãi */}
          <div className="voucher-section-container">
            <p className="payment-section-label">Ưu đãi / Khuyến mãi</p>
            {activeVoucher ? (
              <div className="applied-voucher-card">
                <div className="avc-left">
                  <span className="avc-icon">🎟️</span>
                  <div className="avc-details">
                    <p className="avc-name">{activeVoucher.PromoName}</p>
                    <p className="avc-discount">Giảm {Math.round(activeVoucher.DiscountPercent)}% dịch vụ</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-remove-voucher"
                  onClick={() => handleApplyVoucher(null)}
                  disabled={loading}
                >
                  Gỡ bỏ
                </button>
              </div>
            ) : bookingData?.MemberPromoID ? (
              <div className="applied-voucher-card">
                <div className="avc-left">
                  <span className="avc-icon">🎟️</span>
                  <div className="avc-details">
                    <p className="avc-name">Voucher đã áp dụng</p>
                    <p className="avc-discount">Ưu đãi giảm giá từ voucher</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-remove-voucher"
                  onClick={() => handleApplyVoucher(null)}
                  disabled={loading}
                >
                  Gỡ bỏ
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-apply-voucher-trigger"
                onClick={() => setShowVoucherModal(true)}
                disabled={loading}
              >
                <span className="voucher-trigger-icon">🎟️</span>
                <span className="voucher-trigger-text">Áp dụng voucher / mã giảm giá</span>
                <span className="voucher-trigger-arrow">→</span>
              </button>
            )}
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
            disabled={loading || loadingTier || timeLeft <= 0}>
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
              <div className="ps-row"><span>Giá dịch vụ</span><span>{formatPrice(currentTotalPrice)}</span></div>
              {discountAmount > 0 && (
                <div className="ps-row discount-row">
                  <span>Giảm giá (Voucher)</span>
                  <span style={{ color: "#10b981", fontWeight: 700 }}>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              {method === "cash" && !loadingTier && effectiveNeedDeposit && (
                <>
                  <div className="ps-row">
                    <span>{Math.round(currentFinalPrice * 0.1) < 10000 ? "Đặt cọc (Tối thiểu 10.000 đ)" : "Đặt cọc (10%)"}</span>
                    <span style={{ color: "#f97316", fontWeight: 700 }}>{formatPrice(depositAmount)}</span>
                  </div>
                  <div className="ps-row">
                    <span>Còn lại (khi check-in)</span>
                    <span>{formatPrice(remainingAmount)}</span>
                  </div>
                </>
              )}
              {method === "cash" && !loadingTier && !effectiveNeedDeposit && (
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

            {method === "cash" && !loadingTier && effectiveNeedDeposit && (
              <div style={{ textAlign: "center", fontSize: 12, color: "#64748b", marginTop: 8 }}>
                {forceDeposit
                  ? `🚨 Hạng ${tier.name} đã hủy 3 lần — đặt cọc ${Math.round(currentFinalPrice * 0.1) < 10000 ? "tối thiểu 10.000 đ" : "10%"} như Bronze/Silver`
                  : `Hạng ${tier.name} — đặt cọc ${Math.round(currentFinalPrice * 0.1) < 10000 ? "tối thiểu 10.000 đ" : "10%"} để giữ chỗ`}
              </div>
            )}
            {method === "cash" && !loadingTier && !effectiveNeedDeposit && (
              <div style={{ textAlign: "center", fontSize: 12, color: "#10b981", marginTop: 8 }}>
                ⭐ Hạng {tier.name} — miễn phí giữ chỗ!
              </div>
            )}

            <div className="ps-security-note"><span>🔒</span><span>Giao dịch được mã hoá an toàn</span></div>
          </div>
        </div>
      </div>

      {/* Modal chọn Voucher */}
      {showVoucherModal && (
        <div className="voucher-modal-overlay" onClick={() => setShowVoucherModal(false)}>
          <div className="voucher-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="vmc-header">
              <h3>Voucher / Khuyến mãi của bạn</h3>
              <button className="vmc-close-btn" onClick={() => setShowVoucherModal(false)}>×</button>
            </div>
            <div className="vmc-body">
              {vouchers.length === 0 ? (
                <div className="no-vouchers-message">
                  <span className="empty-icon">🎟️</span>
                  <p>Bạn chưa có voucher nào trong ví.</p>
                  <p className="sub-msg">Đổi điểm tích luỹ lấy voucher tại mục Thành viên!</p>
                </div>
              ) : (
                <div className="vouchers-list">
                  {vouchers.map((v) => {
                    const isExpired = v.EndDate && new Date(v.EndDate) < new Date();
                    return (
                      <div
                        key={v.MemberPromoID}
                        className={`voucher-item-card ${isExpired ? "expired" : ""}`}
                        onClick={() => {
                          if (!isExpired) {
                            handleApplyVoucher(v.MemberPromoID);
                            setShowVoucherModal(false);
                          }
                        }}
                      >
                        <div className="vic-discount-badge">
                          <span className="vic-percent">-{Math.round(v.DiscountPercent)}%</span>
                        </div>
                        <div className="vic-details">
                          <h4 className="vic-name">{v.PromoName}</h4>
                          {v.EndDate && (
                            <p className="vic-expiry">Hạn dùng: {new Date(v.EndDate).toLocaleDateString("vi-VN")}</p>
                          )}
                        </div>
                        <button className="btn-select-voucher" disabled={isExpired}>
                          Áp dụng
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`booking-toast ${toast.type === "error" ? "booking-toast-error" : "booking-toast-success"}`}>
          <span>{toast.type === "error" ? "❌" : "✅"}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}