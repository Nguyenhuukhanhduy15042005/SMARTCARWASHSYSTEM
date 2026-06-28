// Front-end/src/pages/PaymentHistory.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Payment.css";
import Sidebar from "../components/Sidebar";

const API_BASE = "/api";

const METHOD_LABEL = { cash: "💰 Đặt cọc", vnpay: "🏦 VNPay", "Tiền mặt": "💵 Tiền mặt" };

export default function PaymentHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refundModal, setRefundModal] = useState(null);
  const [refunding, setRefunding] = useState(false);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("all");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getToken = () =>
    localStorage.getItem("token") || localStorage.getItem("TOKEN");

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/payments/history`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setHistory(res.data.data || res.data || []);
    } catch (err) {
      showToast(`Không thể tải lịch sử: ${err.response?.data?.message || err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Tính thông tin hoàn tiền trước khi hiện modal ────────────────────────
  const openRefundModal = (payment) => {
    // Tính giờ còn lại đến BookingDate (nếu có)
    const cancelCount = history.filter(h => h.BookingStatus === 5).length;

    // Tính % hoàn tiền dựa vào số lần hủy
    // (không có BookingDate trong history nên dùng cancelCount để cảnh báo)
    let refundPercent = 0;
    let warning = "";
    let nextCancelInfo = null;
    const originalAmount = payment.Amount || 0;

    if (cancelCount >= 4) {
      refundPercent = 0;
      warning = "❌ Bạn đã hủy quá nhiều lần trong 30 ngày. Không được hoàn tiền.";
    } else if (cancelCount === 3) {
      refundPercent = 50;
      warning = `🚨 Đây là lần hủy thứ ${cancelCount + 1} trong 30 ngày. Chỉ được hoàn 50%.`;
      nextCancelInfo = "❌ Lần hủy tiếp theo sẽ không được hoàn tiền";
    } else if (cancelCount === 2) {
      refundPercent = 100;
      warning = `⚠️ Lần hủy thứ ${cancelCount + 1} trong 30 ngày. Hoàn 100%. Lần sau chỉ hoàn 50%.`;
      nextCancelInfo = "⚠️ Còn 1 lần hủy được hoàn tiền trong 30 ngày";
    } else {
      refundPercent = 100;
      warning = `✅ Hoàn 100% số tiền đã thanh toán.`;
    }

    const refundAmount = Math.round(originalAmount * refundPercent / 100);

    setRefundModal({ payment, refundPercent, refundAmount, originalAmount, warning, nextCancelInfo, cancelCount });
  };

  // ── Thực hiện hoàn tiền ───────────────────────────────────────────────────
  const handleRefund = async () => {
    if (!refundModal) return;
    setRefunding(true);
    try {
      const res = await axios.post(
        `${API_BASE}/payments/${refundModal.payment.PaymentID}/refund`,
        {},
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      const data = res.data;
      const msg = data.refundAmount > 0
        ? `Hủy thành công! Hoàn tiền ${data.refundAmount.toLocaleString('vi-VN')}đ (${data.refundPercent}%).`
        : "Hủy thành công! Không có tiền hoàn lại.";
      showToast(msg, "success");
      setRefundModal(null);
      fetchHistory();
    } catch (err) {
      showToast(err.response?.data?.message || "Hoàn tiền thất bại", "error");
    } finally {
      setRefunding(false);
    }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const totalPaid = history.reduce((s, h) => s + (h.Amount || 0), 0);

  const filtered = filter === "all" ? history
    : filter === "deposit" ? history.filter(h => h.Method === "cash")
    : filter === "cash"    ? history.filter(h => h.Method === "Tiền mặt")
    : history.filter(h => h.Method === filter);

  return (
    <div className="portal-layout-container">
      <Sidebar />
      <div className="portal-main-content payment-page-container" style={{ padding: "32px 40px" }}>
        <div className="ph-wrapper">

          {/* Header */}
          <div className="ph-header">
            <div>
              <button className="payment-back-btn" onClick={() => navigate(-1)}>← Quay lại</button>
              <h1 className="payment-title" style={{ marginTop: "0.5rem" }}>Lịch sử thanh toán</h1>
              <p className="payment-subtitle">Xem và quản lý các giao dịch của bạn</p>
            </div>
            <div className="ph-stat-card">
              <p className="ph-stat-label">Tổng đã thanh toán</p>
              <p className="ph-stat-value">{formatPrice(totalPaid)}</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="ph-filter-tabs">
            {[
              { key: "all",     label: "Tất cả"      },
              { key: "deposit", label: "💰 Đặt cọc"  },
              { key: "vnpay",   label: "🏦 VNPay"    },
              { key: "cash",    label: "💵 Tiền mặt" },
            ].map(f => (
              <button key={f.key}
                className={`ph-tab ${filter === f.key ? "active" : ""}`}
                onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="ph-loading">
              <span className="pay-spinner" style={{ borderTopColor: "#f97316" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="ph-empty">
              <p>💳</p>
              <p>Không có giao dịch nào</p>
              <button className="btn-pay-submit"
                style={{ marginTop: "1rem", width: "auto", padding: "12px 28px" }}
                onClick={() => navigate("/booking")}>
                Đặt lịch ngay
              </button>
            </div>
          ) : (
            <div className="ph-list">
              {filtered.map(p => (
                <div key={p.PaymentID} className="ph-item">
                  <div className="ph-item-left">
                    <div className="ph-item-icon">
                      {p.Method === "cash" ? "💰" : p.Method === "vnpay" ? "🏦" : "💵"}
                    </div>
                    <div className="ph-item-info">
                      <p className="ph-item-service">
                        {p.ServiceName || "Dịch vụ rửa xe"} · {p.LicensePlate || ""}
                      </p>
                      <p className="ph-item-meta">
                        {formatDate(p.PaidAt)} · {METHOD_LABEL[p.Method] || p.Method} · Booking #{p.BookingID}
                      </p>
                    </div>
                  </div>
                  <div className="ph-item-right">
                    <p className="ph-item-amount">{formatPrice(p.Amount)}</p>
                    {p.BookingStatus === 4 ? (
                      <span className="ph-status status-paid" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>✓ Hoàn thành</span>
                    ) : p.BookingStatus === 3 ? (
                      <span className="ph-status status-pending" style={{ background: "rgba(6,182,212,0.15)", color: "#06b6d4" }}>🚿 Đang rửa</span>
                    ) : p.BookingStatus === 5 ? (
                      <span className="ph-status status-failed">❌ Đã hủy</span>
                    ) : p.Method === "cash" ? (
                      <span className="ph-status status-deposit">💰 Đã đặt cọc</span>
                    ) : (
                      <span className="ph-status status-paid">✓ Đã xác nhận</span>
                    )}
                    {(p.BookingStatus === 1 || p.BookingStatus === 2) && (
                      <button className="ph-refund-btn" onClick={() => openRefundModal(p)}>
                        Hoàn tiền
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Modal hoàn tiền với thông tin đầy đủ ── */}
        {refundModal && (
          <div className="ph-modal-overlay" onClick={() => setRefundModal(null)}>
            <div className="ph-modal" onClick={e => e.stopPropagation()}>
              <h3 className="ph-modal-title">Xác nhận hoàn tiền</h3>

              <div className="ph-modal-info">
                <p>{refundModal.payment.ServiceName || "Dịch vụ rửa xe"} · {refundModal.payment.LicensePlate}</p>
              </div>

              {/* Thông tin hoàn tiền */}
              <div style={{
                padding: "16px", borderRadius: 12, marginBottom: 16,
                background: refundModal.refundAmount > 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${refundModal.refundAmount > 0 ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}>
                <p style={{ fontWeight: 700, marginBottom: 10, color: "var(--text-primary)" }}>
                  {refundModal.warning}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Số tiền đã trả:</span>
                  <span style={{ fontWeight: 700 }}>{refundModal.originalAmount.toLocaleString('vi-VN')}đ</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Tỷ lệ hoàn:</span>
                  <span style={{ fontWeight: 700, color: refundModal.refundPercent > 0 ? "#10b981" : "#ef4444" }}>
                    {refundModal.refundPercent}%
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 700 }}>Số tiền hoàn lại:</span>
                  <span style={{ fontWeight: 800, fontSize: 16, color: refundModal.refundAmount > 0 ? "#10b981" : "#ef4444" }}>
                    {refundModal.refundAmount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              {/* Cảnh báo lần tiếp theo */}
              {refundModal.nextCancelInfo && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10, marginBottom: 16,
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)"
                }}>
                  <span style={{ color: "#f59e0b", fontSize: 13, fontWeight: 600 }}>
                    {refundModal.nextCancelInfo}
                  </span>
                </div>
              )}

              <div className="ph-modal-note">
                ⚠️ Booking sẽ bị huỷ sau khi hoàn tiền. Hành động này không thể hoàn tác.
              </div>

              <div className="ph-modal-actions">
                <button className="ph-modal-cancel" onClick={() => setRefundModal(null)}>Quay lại</button>
                <button className="ph-modal-confirm" onClick={handleRefund} disabled={refunding}>
                  {refunding ? <span className="pay-spinner" /> : "Xác nhận hoàn tiền"}
                </button>
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
    </div>
  );
}