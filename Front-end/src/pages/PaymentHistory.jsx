// Front-end/src/pages/PaymentHistory.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Payment.css";
import Sidebar from "../components/Sidebar";

const API_BASE = "/api";

const METHOD_LABEL = { cash: "💵 Tiền mặt", vnpay: "🏦 VNPay" };

export default function PaymentHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refundModal, setRefundModal] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("all");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getToken = () =>
    localStorage.getItem("token") || localStorage.getItem("TOKEN");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/payments/history`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setHistory(res.data.data || res.data || []);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      showToast(`Không thể tải lịch sử: ${errMsg}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!refundReason.trim()) {
      showToast("Vui lòng nhập lý do hoàn tiền", "error");
      return;
    }
    setRefunding(true);
    try {
      await axios.post(
        `${API_BASE}/payments/${refundModal.payment.PaymentID}/refund`,
        { reason: refundReason },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      showToast("Hoàn tiền thành công! Booking đã bị huỷ.", "success");
      setRefundModal(null);
      setRefundReason("");
      fetchHistory();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      showToast(errMsg || "Hoàn tiền thất bại", "error");
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

  const filtered = filter === "all"
    ? history
    : history.filter((h) => h.Method === filter);

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
            { key: "all",   label: "Tất cả"    },
            { key: "cash",  label: "💵 Tiền mặt" },
            { key: "vnpay", label: "🏦 VNPay"   },
          ].map((f) => (
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
            <button className="btn-pay-submit" style={{ marginTop: "1rem", width: "auto", padding: "12px 28px" }}
              onClick={() => navigate("/booking")}>
              Đặt lịch ngay
            </button>
          </div>
        ) : (
          <div className="ph-list">
            {filtered.map((p) => (
              <div key={p.PaymentID} className="ph-item">
                <div className="ph-item-left">
                  <div className="ph-item-icon">
                    {p.Method === "cash" ? "💵" : "🏦"}
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
                  {p.Method === "cash" ? (
                    <span className="ph-status status-deposit">💰 Đã đặt cọc</span>
                  ) : (
                    <span className="ph-status status-paid">✓ Đã xác nhận</span>
                  )}
                  <button className="ph-refund-btn"
                    onClick={() => { setRefundModal({ payment: p }); setRefundReason(""); }}>
                    Hoàn tiền
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refund Modal */}
      {refundModal && (
        <div className="ph-modal-overlay" onClick={() => setRefundModal(null)}>
          <div className="ph-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="ph-modal-title">Xác nhận hoàn tiền</h3>
            <div className="ph-modal-info">
              <p>{refundModal.payment.ServiceName || "Dịch vụ rửa xe"} · {refundModal.payment.LicensePlate}</p>
              <p className="ph-modal-amount">{formatPrice(refundModal.payment.Amount)}</p>
            </div>
            <p className="ph-modal-label">Lý do hoàn tiền *</p>
            <textarea className="ph-modal-textarea" rows={3}
              placeholder="Nhập lý do hoàn tiền..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)} />
            <div className="ph-modal-note">
              ⚠️ Booking sẽ bị huỷ sau khi hoàn tiền. Hành động này không thể hoàn tác.
            </div>
            <div className="ph-modal-actions">
              <button className="ph-modal-cancel" onClick={() => setRefundModal(null)}>Huỷ</button>
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
