// Front-end/src/pages/PaymentHistory.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./Payment.css";
import Sidebar from "../components/Sidebar";

const API_BASE = "/api";

const METHOD_LABEL = { cash: "💰 Đặt cọc", vnpay: "🏦 VNPay", "Tiền mặt": "💵 Tiền mặt" };

export default function PaymentHistory() {
  const navigate = useNavigate();
  const location = useLocation(); // ✅ Dùng để reload khi navigate về trang này
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

  // ✅ Reload mỗi khi navigate vào trang này (kể cả từ UserDashboard sau khi hủy)
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

  const openRefundModal = (payment) => {
    setRefundModal({ payment });
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
        ? `Hủy thành công! Hoàn tiền ${data.refundAmount.toLocaleString('vi-VN')}đ (${data.refundPercent}%).`
        : "Đã hủy thành công! Không có tiền hoàn lại do vi phạm chính sách hủy.";
      showToast(msg, data.refundAmount > 0 ? "success" : "error");
      setRefundModal(null);
      fetchHistory(); // ✅ Reload lại danh sách sau khi hủy
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

        {/* ── Modal xác nhận hoàn tiền ── */}
        {refundModal && (
          <div className="ph-modal-overlay" onClick={() => setRefundModal(null)}>
            <div className="ph-modal" onClick={e => e.stopPropagation()}>
              <h3 className="ph-modal-title">Xác nhận hoàn tiền</h3>

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
                      <th style={{ textAlign: "center" }}>Lần 1-2</th>
                      <th style={{ textAlign: "center" }}>Lần 3</th>
                      <th style={{ textAlign: "center" }}>Lần 4+</th>
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

              <div className="ph-modal-note">
                ⚠️ Số tiền hoàn lại sẽ được tính chính xác dựa vào thời gian còn lại và số lần hủy của bạn. Booking sẽ bị huỷ sau khi xác nhận.
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
