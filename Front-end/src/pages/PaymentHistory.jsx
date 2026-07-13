// Front-end/src/pages/PaymentHistory.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./Payment.css";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://localhost:5000/api";

const METHOD_LABEL = {
  cash: "💰 Đặt cọc",
  vnpay: "🏦 VNPay",
  "Tiền mặt": "💵 Tiền mặt",
};

export default function PaymentHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // refundModal giờ chứa cả preview từ backend
  const [refundModal, setRefundModal] = useState(null);   // { payment, preview: null | {...} }
  const [previewLoading, setPreviewLoading] = useState(false);
  const [refunding, setRefunding] = useState(false);

  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("all");

  const showToast = (msg, type = "success", duration = 3500) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), duration);
  };

  const getToken = () =>
    localStorage.getItem("token") || localStorage.getItem("TOKEN");

  // Reload mỗi khi navigate vào trang này
  useEffect(() => { fetchHistory(); }, [location.key]);

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

  // Mở modal + gọi refund-preview để lấy số tiền hoàn chính xác
  const openRefundModal = async (payment) => {
    setRefundModal({ payment, preview: null });
    setPreviewLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/payments/${payment.PaymentID}/refund-preview`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const preview = res.data;
      // ✅ Nếu hoàn 0% → tự chặn ở FE, yêu cầu xác nhận lần 2 trước khi gọi API hủy thật
      if (preview.refundPercent === 0) {
        setRefundModal({ payment, preview, blocked: true, blockedWarning: preview.warning });
      } else {
        setRefundModal({ payment, preview });
      }
    } catch (err) {
      // Nếu preview lỗi (vd xe đang rửa) → hiện lỗi, đóng modal
      showToast(err.response?.data?.message || "Không thể xem trước thông tin hoàn tiền", "error");
      setRefundModal(null);
    } finally {
      setPreviewLoading(false);
    }
  };

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
        ? `Hủy thành công! Hoàn ${data.refundPercent}% = ${data.refundAmount.toLocaleString("vi-VN")}đ.`
        : "Đã hủy thành công (không hoàn tiền).";
      const extra = [data.nextCancelInfo, data.forceDepositWarning].filter(Boolean).join(" ");
      showToast(extra ? `${msg} ${extra}` : msg, "success", extra ? 7000 : 3500);
      fetchHistory();
      setRefundModal(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Hoàn tiền thất bại", "error");
    } finally {
      setRefunding(false);
    }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price || 0);

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
                        Hoàn tiền / Hủy
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Modal xác nhận hoàn tiền ── */}
        {refundModal && (
          <div className="ph-modal-overlay" onClick={() => !refunding && setRefundModal(null)}>
            <div className="ph-modal" onClick={e => e.stopPropagation()}>
              <h3 className="ph-modal-title">Xác nhận hủy & hoàn tiền</h3>

              <div className="ph-modal-info">
                <p>{refundModal.payment.ServiceName || "Dịch vụ rửa xe"} · {refundModal.payment.LicensePlate}</p>
                <p className="ph-modal-amount">{formatPrice(refundModal.payment.Amount)}</p>
              </div>

              {/* Bảng hoàn tiền */}
              <div style={{
                padding: "14px", borderRadius: 10, marginBottom: 16,
                background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)"
              }}>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 700 }}>
                  Quy tắc hoàn tiền:
                </p>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ color: "var(--text-secondary)" }}>
                      <th style={{ textAlign: "left", paddingBottom: 4 }}>Thời gian</th>
                      <th style={{ textAlign: "center" }}>Lần 1</th>
                      <th style={{ textAlign: "center" }}>Lần 2</th>
                      <th style={{ textAlign: "center" }}>Lần 3+</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ color: "var(--text-primary)", paddingTop: 4 }}>Trước 24h</td>
                      <td style={{ textAlign: "center", color: "#10b981", fontWeight: 700 }}>100%</td>
                      <td style={{ textAlign: "center", color: "#f59e0b", fontWeight: 700 }}>50%</td>
                      <td style={{ textAlign: "center", color: "#ef4444", fontWeight: 700 }}>0%</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--text-primary)", paddingTop: 4 }}>2 - 24h</td>
                      <td style={{ textAlign: "center", color: "#f59e0b", fontWeight: 700 }}>50%</td>
                      <td style={{ textAlign: "center", color: "#ef4444", fontWeight: 700 }}>0%</td>
                      <td style={{ textAlign: "center", color: "#ef4444", fontWeight: 700 }}>0%</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--text-primary)", paddingTop: 4 }}>Dưới 2h</td>
                      <td style={{ textAlign: "center", color: "#ef4444", fontWeight: 700 }}>0%</td>
                      <td style={{ textAlign: "center", color: "#ef4444", fontWeight: 700 }}>0%</td>
                      <td style={{ textAlign: "center", color: "#ef4444", fontWeight: 700 }}>0%</td>
                    </tr>
                  </tbody>
                </table>
                <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 8 }}>
                  * Đếm số lần hủy trong 30 ngày gần nhất
                </p>
              </div>

              {/* Preview từ backend */}
              {previewLoading ? (
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <span className="pay-spinner" style={{ borderTopColor: "#f97316" }} />
                  <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 8 }}>Đang tính số tiền hoàn...</p>
                </div>
              ) : refundModal.preview ? (
                <div style={{
                  padding: "12px 16px", borderRadius: 10, marginBottom: 16,
                  background: refundModal.preview.refundPercent > 0
                    ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                  border: `1px solid ${refundModal.preview.refundPercent > 0 ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                }}>
                  <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 6,
                    color: refundModal.preview.refundPercent > 0 ? "#10b981" : "#ef4444" }}>
                    Dự kiến hoàn tiền: {refundModal.preview.refundPercent}%
                    {refundModal.preview.refundAmount > 0 && ` = ${formatPrice(refundModal.preview.refundAmount)}`}
                  </p>
                  <p style={{ fontSize: 12, color: "#94a3b8" }}>
                    Lần hủy thứ {refundModal.preview.cancelCount + 1} trong 30 ngày
                    {refundModal.preview.hoursLeft !== null &&
                      ` · Còn ${Math.max(0, refundModal.preview.hoursLeft).toFixed(1)} tiếng`}
                  </p>
                  {refundModal.preview.warning && (
                    <p style={{ fontSize: 12, color: "#f59e0b", marginTop: 6, whiteSpace: "pre-line" }}>
                      {refundModal.preview.warning}
                    </p>
                  )}
                </div>
              ) : null}

              {/* Bước xác nhận lần 2: khi blocked (0% hoàn tiền) */}
              {refundModal.blocked ? (
                <div style={{
                  padding: "16px", borderRadius: 12, marginBottom: 16,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.4)",
                }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#ef4444", marginBottom: 8 }}>
                    ⚠️ Cảnh báo: Không được hoàn tiền!
                  </p>
                  <p style={{ fontSize: 13, color: "#f87171", marginBottom: 10, whiteSpace: "pre-line" }}>
                    {refundModal.blockedWarning}
                  </p>
                  <p style={{ fontSize: 13, color: "#fbbf24", fontWeight: 600 }}>
                    Nếu vẫn tiếp tục hủy, bạn sẽ <strong style={{ color: "#ef4444" }}>mất toàn bộ số tiền đã đặt cọc ({formatPrice(refundModal.preview?.originalAmount || refundModal.payment.Amount)})</strong>.
                  </p>
                  <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
                    Bạn có chắc chắn muốn hủy đơn này không?
                  </p>
                </div>
              ) : (
                <div className="ph-modal-note">
                  ⚠️ Booking sẽ bị huỷ sau khi xác nhận.
                </div>
              )}

              <div className="ph-modal-actions">
                <button className="ph-modal-cancel" onClick={() => setRefundModal(null)} disabled={refunding}>
                  {refundModal.blocked ? "Giữ lịch" : "Quay lại"}
                </button>
                <button
                  className="ph-modal-confirm"
                  onClick={handleRefund}
                  disabled={refunding || previewLoading}
                  style={refundModal.blocked ? { background: "#dc2626" } : {}}
                >
                  {refunding ? <span className="pay-spinner" /> : refundModal.blocked ? "🗑️ Đồng ý hủy — Mất tiền cọc" : "Xác nhận hủy"}
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
