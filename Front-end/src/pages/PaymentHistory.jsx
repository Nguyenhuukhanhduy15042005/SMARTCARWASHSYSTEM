// Front-end/src/pages/PaymentHistory.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Payment.css";
import Sidebar from "../components/Sidebar";

const API_BASE = "/api";

const METHOD_LABEL = {
  cash: "💰 Đặt cọc",
  vnpay: "🏦 VNPay",
  "Tiền mặt": "💵 Tiền mặt",
};

// Bảng quy tắc hoàn tiền (chỉ dùng để hiển thị cho user)
const REFUND_RULES = [
  { cancel: "Lần 1, 2", before24: "100%", between2_24: "50%", under2: "0%" },
  { cancel: "Lần 3",    before24: "50%",  between2_24: "0%",  under2: "0%" },
  { cancel: "Lần 4+",   before24: "0%",   between2_24: "0%",  under2: "0%" },
];

export default function PaymentHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state — 2 bước: preview → confirm
  const [refundModal, setRefundModal] = useState(null); // { payment, preview: null | { refundPercent, refundAmount, cancelCount, hoursLeft, warning } }
  const [refundReason, setRefundReason] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [refunding, setRefunding] = useState(false);

  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("all");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getToken = () =>
    localStorage.getItem("token") || localStorage.getItem("TOKEN");

  // Reload khi navigate vào trang (dùng useEffect + location key nếu muốn, đơn giản nhất là fetch mỗi lần mount)
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

  // Bước 1: Mở modal → gọi preview API để lấy % + số tiền dự kiến
  const openRefundModal = async (payment) => {
    setRefundModal({ payment, preview: null });
    setRefundReason("");
    setPreviewLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/payments/${payment.PaymentID}/refund-preview`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      // { refundPercent, refundAmount, cancelCount, hoursLeft, warning }
      setRefundModal({ payment, preview: res.data });
    } catch (err) {
      // Nếu backend chưa có endpoint preview thì tính tạm ở frontend (fallback)
      // Chỉ dùng khi chưa deploy endpoint mới
      const errMsg = err.response?.data?.message || err.message;
      showToast(`Không thể tải thông tin hoàn tiền: ${errMsg}`, "error");
      setRefundModal(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Bước 2: Xác nhận hoàn tiền
  const handleRefund = async () => {
    if (!refundReason.trim()) {
      showToast("Vui lòng nhập lý do hủy", "error");
      return;
    }
    setRefunding(true);
    try {
      const res = await axios.post(
        `${API_BASE}/payments/${refundModal.payment.PaymentID}/refund`,
        { reason: refundReason },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      const { refundPercent, refundAmount } = res.data;
      const msg =
        refundPercent > 0
          ? `Hoàn tiền ${refundPercent}% = ${formatPrice(refundAmount)} thành công! Booking đã hủy.`
          : "Booking đã hủy. Không có hoàn tiền do quy tắc chính sách.";
      showToast(msg, "success");
      setRefundModal(null);
      setRefundReason("");
      fetchHistory();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      showToast(errMsg || "Hủy booking thất bại", "error");
    } finally {
      setRefunding(false);
    }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
      price || 0
    );

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalPaid = history.reduce((s, h) => s + (h.Amount || 0), 0);

  const filtered =
    filter === "all"
      ? history
      : filter === "deposit"
      ? history.filter((h) => h.Method === "cash")
      : filter === "cash"
      ? history.filter((h) => h.Method === "Tiền mặt")
      : history.filter((h) => h.Method === filter);

  // Helper: label thời gian còn lại dễ đọc
  const hoursLeftLabel = (hours) => {
    if (hours == null) return "—";
    if (hours < 0) return "Đã qua giờ hẹn";
    if (hours < 1) return `Còn ${Math.round(hours * 60)} phút`;
    if (hours < 24) return `Còn ${hours.toFixed(1)} giờ`;
    return `Còn ${Math.floor(hours / 24)} ngày ${Math.round(hours % 24)} giờ`;
  };

  return (
    <div className="portal-layout-container">
      <Sidebar />
      <div
        className="portal-main-content payment-page-container"
        style={{ padding: "32px 40px" }}
      >
        <div className="ph-wrapper">
          {/* Header */}
          <div className="ph-header">
            <div>
              <button className="payment-back-btn" onClick={() => navigate(-1)}>
                ← Quay lại
              </button>
              <h1 className="payment-title" style={{ marginTop: "0.5rem" }}>
                Lịch sử thanh toán
              </h1>
              <p className="payment-subtitle">
                Xem và quản lý các giao dịch của bạn
              </p>
            </div>
            <div className="ph-stat-card">
              <p className="ph-stat-label">Tổng đã thanh toán</p>
              <p className="ph-stat-value">{formatPrice(totalPaid)}</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="ph-filter-tabs">
            {[
              { key: "all",     label: "Tất cả" },
              { key: "deposit", label: "💰 Đặt cọc" },
              { key: "vnpay",   label: "🏦 VNPay" },
              { key: "cash",    label: "💵 Tiền mặt" },
            ].map((f) => (
              <button
                key={f.key}
                className={`ph-tab ${filter === f.key ? "active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="ph-loading">
              <span
                className="pay-spinner"
                style={{ borderTopColor: "#f97316" }}
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="ph-empty">
              <p>💳</p>
              <p>Không có giao dịch nào</p>
              <button
                className="btn-pay-submit"
                style={{
                  marginTop: "1rem",
                  width: "auto",
                  padding: "12px 28px",
                }}
                onClick={() => navigate("/booking")}
              >
                Đặt lịch ngay
              </button>
            </div>
          ) : (
            <div className="ph-list">
              {filtered.map((p) => (
                <div key={p.PaymentID} className="ph-item">
                  <div className="ph-item-left">
                    <div className="ph-item-icon">
                      {p.Method === "cash"
                        ? "💰"
                        : p.Method === "vnpay"
                        ? "🏦"
                        : "💵"}
                    </div>
                    <div className="ph-item-info">
                      <p className="ph-item-service">
                        {p.ServiceName || "Dịch vụ rửa xe"} ·{" "}
                        {p.LicensePlate || ""}
                      </p>
                      <p className="ph-item-meta">
                        {formatDate(p.PaidAt)} ·{" "}
                        {METHOD_LABEL[p.Method] || p.Method} · Booking #
                        {p.BookingID}
                      </p>
                    </div>
                  </div>
                  <div className="ph-item-right">
                    <p className="ph-item-amount">{formatPrice(p.Amount)}</p>
                    {p.BookingStatus === 4 ? (
                      <span
                        className="ph-status status-paid"
                        style={{
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#10b981",
                        }}
                      >
                        ✓ Hoàn thành
                      </span>
                    ) : p.BookingStatus === 3 ? (
                      <span
                        className="ph-status status-pending"
                        style={{
                          background: "rgba(6, 182, 212, 0.15)",
                          color: "#06b6d4",
                        }}
                      >
                        🚿 Đang rửa
                      </span>
                    ) : p.BookingStatus === 5 ? (
                      <span className="ph-status status-failed">❌ Đã hủy</span>
                    ) : p.Method === "cash" ? (
                      <span className="ph-status status-deposit">
                        💰 Đã đặt cọc
                      </span>
                    ) : (
                      <span className="ph-status status-paid">✓ Đã xác nhận</span>
                    )}
                    {(p.BookingStatus === 1 || p.BookingStatus === 2) && (
                      <button
                        className="ph-refund-btn"
                        onClick={() => openRefundModal(p)}
                      >
                        Hủy & hoàn tiền
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== REFUND MODAL ===== */}
        {refundModal && (
          <div
            className="ph-modal-overlay"
            onClick={() => !refunding && setRefundModal(null)}
          >
            <div
              className="ph-modal"
              style={{ maxWidth: 540 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="ph-modal-title">Hủy booking & hoàn tiền</h3>

              {/* Thông tin booking */}
              <div className="ph-modal-info">
                <p>
                  {refundModal.payment.ServiceName || "Dịch vụ rửa xe"} ·{" "}
                  {refundModal.payment.LicensePlate}
                </p>
                <p className="ph-modal-amount">
                  Đã thanh toán: {formatPrice(refundModal.payment.Amount)}
                </p>
              </div>

              {/* Bảng quy tắc hoàn tiền */}
              <div style={{ marginBottom: 16 }}>
                <p
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    marginBottom: 8,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Chính sách hoàn tiền
                </p>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                      <th
                        style={{
                          padding: "8px 10px",
                          textAlign: "left",
                          color: "#94a3b8",
                          fontWeight: 600,
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        Số lần hủy
                      </th>
                      <th
                        style={{
                          padding: "8px 10px",
                          textAlign: "center",
                          color: "#94a3b8",
                          fontWeight: 600,
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        Trước 24h
                      </th>
                      <th
                        style={{
                          padding: "8px 10px",
                          textAlign: "center",
                          color: "#94a3b8",
                          fontWeight: 600,
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        2 – 24h
                      </th>
                      <th
                        style={{
                          padding: "8px 10px",
                          textAlign: "center",
                          color: "#94a3b8",
                          fontWeight: 600,
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        Dưới 2h
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {REFUND_RULES.map((row) => (
                      <tr key={row.cancel}>
                        <td
                          style={{
                            padding: "7px 10px",
                            color: "#e2e8f0",
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          {row.cancel}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            textAlign: "center",
                            color:
                              row.before24 === "0%" ? "#ef4444" : "#10b981",
                            fontWeight: 700,
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          {row.before24}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            textAlign: "center",
                            color:
                              row.between2_24 === "0%" ? "#ef4444" : "#f59e0b",
                            fontWeight: 700,
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          {row.between2_24}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            textAlign: "center",
                            color: "#ef4444",
                            fontWeight: 700,
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          {row.under2}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                    marginTop: 6,
                  }}
                >
                  * Đếm số lần hủy trong 30 ngày gần nhất
                </p>
              </div>

              {/* Preview hoàn tiền từ backend */}
              {previewLoading ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 10,
                    marginBottom: 16,
                  }}
                >
                  <span
                    className="pay-spinner"
                    style={{ borderTopColor: "#f97316", width: 18, height: 18, borderWidth: 2, flexShrink: 0 }}
                  />
                  <span style={{ color: "#94a3b8", fontSize: 13 }}>
                    Đang tính số tiền hoàn trả...
                  </span>
                </div>
              ) : refundModal.preview ? (
                <div
                  style={{
                    background:
                      refundModal.preview.refundPercent > 0
                        ? "rgba(16,185,129,0.08)"
                        : "rgba(239,68,68,0.08)",
                    border: `1px solid ${
                      refundModal.preview.refundPercent > 0
                        ? "rgba(16,185,129,0.25)"
                        : "rgba(239,68,68,0.25)"
                    }`,
                    borderRadius: 10,
                    padding: "14px 16px",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>
                      Thời gian còn lại:
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#e2e8f0",
                      }}
                    >
                      {hoursLeftLabel(refundModal.preview.hoursLeft)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>
                      Lần hủy thứ:
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#e2e8f0",
                      }}
                    >
                      {refundModal.preview.cancelCount + 1} (trong 30 ngày)
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>
                      % hoàn tiền:
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color:
                          refundModal.preview.refundPercent > 0
                            ? "#10b981"
                            : "#ef4444",
                      }}
                    >
                      {refundModal.preview.refundPercent}%
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: "1px solid rgba(255,255,255,0.08)",
                      paddingTop: 10,
                      marginTop: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#e2e8f0",
                      }}
                    >
                      Số tiền hoàn trả:
                    </span>
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color:
                          refundModal.preview.refundPercent > 0
                            ? "#10b981"
                            : "#ef4444",
                      }}
                    >
                      {formatPrice(refundModal.preview.refundAmount)}
                    </span>
                  </div>
                  {refundModal.preview.warning && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "#f59e0b",
                        marginTop: 8,
                      }}
                    >
                      ⚠️ {refundModal.preview.warning}
                    </p>
                  )}
                </div>
              ) : null}

              {/* Lý do hủy */}
              <p className="ph-modal-label">Lý do hủy *</p>
              <textarea
                className="ph-modal-textarea"
                rows={3}
                placeholder="Nhập lý do hủy booking..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                disabled={refunding}
              />

              <div className="ph-modal-note">
                ⚠️ Booking sẽ bị hủy sau khi xác nhận. Hành động này không thể hoàn tác.
              </div>

              <div className="ph-modal-actions">
                <button
                  className="ph-modal-cancel"
                  onClick={() => setRefundModal(null)}
                  disabled={refunding}
                >
                  Đóng
                </button>
                <button
                  className="ph-modal-confirm"
                  onClick={handleRefund}
                  disabled={refunding || previewLoading}
                >
                  {refunding ? (
                    <span className="pay-spinner" />
                  ) : (
                    "Xác nhận hủy"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div
            className={`booking-toast ${
              toast.type === "error"
                ? "booking-toast-error"
                : "booking-toast-success"
            }`}
          >
            <span>{toast.type === "error" ? "❌" : "✅"}</span>
            <span>{toast.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
