// Front-end/src/pages/PaymentHistory.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./Payment.css";
import Sidebar from "../components/Sidebar";

const API_BASE = "/api";

const METHOD_LABEL = {
  cash: "💰 Đặt cọc",
  vnpay: "🏦 VNPay",
  "Tiền mặt": "💵 Tiền mặt",
};

const REFUND_TABLE = [
  { time: "Trước 24h", l1: { v: "100%", c: "#10b981" }, l2: { v: "50%", c: "#f59e0b" }, l3: { v: "0%", c: "#ef4444" } },
  { time: "2 – 24h",   l1: { v: "50%",  c: "#f59e0b" }, l2: { v: "0%",  c: "#ef4444" }, l3: { v: "0%", c: "#ef4444" } },
  { time: "Dưới 2h",  l1: { v: "0%",   c: "#ef4444" }, l2: { v: "0%",  c: "#ef4444" }, l3: { v: "0%", c: "#ef4444" } },
];

export default function PaymentHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("all");

  // Modal hủy lịch (Luồng 1)
  const [cancelModal, setCancelModal] = useState(null); // { payment, preview }
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Modal khiếu nại sau 0% (Luồng 2)
  const [appealModal, setAppealModal] = useState(null); // { payment }
  const [appealReason, setAppealReason] = useState("");
  const [appealing, setAppealing] = useState(false);

  const showToast = (msg, type = "success", duration = 4000) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), duration);
  };

  const getToken = () => localStorage.getItem("token") || localStorage.getItem("TOKEN");
  const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });

  useEffect(() => { fetchHistory(); }, [location.key]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/payments/history`, { headers: authHeader() });
      setHistory(res.data.data || res.data || []);
    } catch (err) {
      showToast(`Không thể tải lịch sử: ${err.response?.data?.message || err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── LUỒNG 1: Mở modal hủy + gọi preview ──────────────────────────────────
  const openCancelModal = async (payment) => {
    setCancelModal({ payment, preview: null });
    setCancelReason("");
    setPreviewLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/payments/${payment.PaymentID}/refund-preview`, {
        headers: authHeader(),
      });
      setCancelModal({ payment, preview: res.data });
    } catch (err) {
      showToast(err.response?.data?.message || "Không thể tải thông tin hoàn tiền", "error");
      setCancelModal(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // ── LUỒNG 1: Xác nhận hủy → POST /payments/:id/refund (xử lý luôn) ───────
  const handleCancel = async () => {
    if (!cancelReason.trim()) return showToast("Vui lòng nhập lý do hủy", "error");
    setCancelling(true);
    try {
      const res = await axios.post(
        `${API_BASE}/payments/${cancelModal.payment.PaymentID}/refund`,
        { reason: cancelReason.trim() },
        { headers: authHeader() }
      );
      const { refundPercent, refundAmount } = res.data;
      const msg = refundPercent > 0
        ? `Hủy thành công! Hoàn ${refundPercent}% = ${formatPrice(refundAmount)} tại quầy.`
        : "Đã hủy thành công. Không được hoàn tiền theo chính sách.";
      showToast(msg, "success", 5000);
      window.dispatchEvent(new Event("noti:refresh"));
      fetchHistory();
      setCancelModal(null);
      setCancelReason("");
    } catch (err) {
      showToast(err.response?.data?.message || "Hủy thất bại", "error");
    } finally {
      setCancelling(false);
    }
  };

  // ── LUỒNG 2: Khiếu nại sau 0% → POST /refund-requests/appeal ─────────────
  const openAppealModal = (payment) => {
    setAppealModal({ payment });
    setAppealReason("");
  };

  const handleAppeal = async () => {
    if (!appealReason.trim()) return showToast("Vui lòng nhập lý do khiếu nại", "error");
    setAppealing(true);
    try {
      await axios.post(
        `${API_BASE}/refund-requests/appeal`,
        { paymentId: appealModal.payment.PaymentID, reason: appealReason.trim() },
        { headers: authHeader() }
      );
      showToast("Khiếu nại đã được gửi! Chúng tôi sẽ xem xét và phản hồi sớm nhất.", "success");
      window.dispatchEvent(new Event("noti:refresh"));
      setAppealModal(null);
      setAppealReason("");
    } catch (err) {
      showToast(err.response?.data?.message || "Gửi khiếu nại thất bại", "error");
    } finally {
      setAppealing(false);
    }
  };

  const formatPrice = (v) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v || 0);

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("vi-VN", {
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

                    {/* Badge trạng thái */}
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

                    {/* Nút hủy lịch — chỉ khi chưa rửa */}
                    {(p.BookingStatus === 1 || p.BookingStatus === 2) && (
                      <button className="ph-refund-btn" onClick={() => openCancelModal(p)}>
                        Hủy lịch
                      </button>
                    )}

                    {/* Nút khiếu nại — khi đã hủy + không phải tiền cọc cash */}
                    {p.BookingStatus === 5 && p.Method !== "cash" && p.Amount > 0 && (
                      <button
                        className="ph-refund-btn"
                        style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", borderColor: "rgba(249,115,22,0.3)", marginTop: 4 }}
                        onClick={() => openAppealModal(p)}
                      >
                        📝 Khiếu nại
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════
            MODAL LUỒNG 1 — Hủy lịch
        ══════════════════════════════════════════════════ */}
        {cancelModal && (
          <div className="ph-modal-overlay" onClick={() => !cancelling && setCancelModal(null)}>
            <div className="ph-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
              <h3 className="ph-modal-title">Hủy lịch hẹn</h3>

              <div className="ph-modal-info">
                <p>{cancelModal.payment.ServiceName || "Dịch vụ rửa xe"} · {cancelModal.payment.LicensePlate}</p>
                <p className="ph-modal-amount">Đã thanh toán: {formatPrice(cancelModal.payment.Amount)}</p>
              </div>

              {/* Bảng quy tắc hoàn tiền */}
              <div style={{ marginBottom: 14, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                      <th style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Thời gian</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Lần 1</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Lần 2</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Lần 3+</th>
                    </tr>
                  </thead>
                  <tbody>
                    {REFUND_TABLE.map(row => (
                      <tr key={row.time} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <td style={{ padding: "7px 10px", color: "#e2e8f0" }}>{row.time}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center", color: row.l1.c, fontWeight: 700 }}>{row.l1.v}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center", color: row.l2.c, fontWeight: 700 }}>{row.l2.v}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center", color: row.l3.c, fontWeight: 700 }}>{row.l3.v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ fontSize: 11, color: "#64748b", padding: "6px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  * Đếm số lần hủy trong 30 ngày · Tiền cọc cash → 0%
                </p>
              </div>

              {/* Preview từ backend */}
              {previewLoading ? (
                <div style={{ textAlign: "center", padding: "14px 0" }}>
                  <span className="pay-spinner" style={{ borderTopColor: "#f97316" }} />
                  <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 8 }}>Đang tính số tiền hoàn...</p>
                </div>
              ) : cancelModal.preview ? (
                <div style={{
                  padding: "13px 15px", borderRadius: 10, marginBottom: 14,
                  background: cancelModal.preview.refundPercent > 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                  border: `1px solid ${cancelModal.preview.refundPercent > 0 ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                }}>
                  {[
                    ["Lần hủy thứ", `${(cancelModal.preview.cancelCount || 0) + 1} (trong 30 ngày)`],
                    ["Thời gian còn lại", cancelModal.preview.hoursLeft != null
                      ? cancelModal.preview.hoursLeft <= 0 ? "Đã qua giờ hẹn"
                      : cancelModal.preview.hoursLeft < 2 ? `${Math.round(cancelModal.preview.hoursLeft * 60)} phút`
                      : `${cancelModal.preview.hoursLeft.toFixed(1)} giờ`
                      : "—"],
                    ["% hoàn tiền", `${cancelModal.preview.refundPercent}%`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5, color: "#94a3b8" }}>{k}:</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#e2e8f0" }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>Số tiền hoàn:</span>
                    <span style={{ fontSize: 17, fontWeight: 800, color: cancelModal.preview.refundPercent > 0 ? "#10b981" : "#ef4444" }}>
                      {formatPrice(cancelModal.preview.refundAmount)}
                    </span>
                  </div>
                  {cancelModal.preview.warning && (
                    <p style={{ fontSize: 12, color: "#f59e0b", marginTop: 6 }}>⚠️ {cancelModal.preview.warning}</p>
                  )}
                  {/* Nút khiếu nại nếu 0% */}
                  {cancelModal.preview.refundPercent === 0 && (
                    <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(249,115,22,0.1)", borderRadius: 8, border: "1px solid rgba(249,115,22,0.2)" }}>
                      <p style={{ fontSize: 12, color: "#fb923c", margin: "0 0 6px" }}>
                        💡 Nếu bạn cho rằng quyết định này chưa hợp lý, có thể gửi khiếu nại sau khi hủy để Admin xem xét.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Lý do hủy */}
              <p className="ph-modal-label" style={{ marginBottom: 6 }}>Lý do hủy *</p>
              <textarea
                className="ph-modal-textarea"
                rows={3}
                placeholder="Nhập lý do hủy booking..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                disabled={cancelling}
                style={{ marginBottom: 12 }}
              />

              <div className="ph-modal-note">
                ⚠️ Booking sẽ bị hủy ngay sau khi xác nhận. Hành động này không thể hoàn tác.
              </div>

              <div className="ph-modal-actions" style={{ marginTop: 14 }}>
                <button className="ph-modal-cancel"
                  onClick={() => { setCancelModal(null); setCancelReason(""); }}
                  disabled={cancelling}>
                  Giữ lịch
                </button>
                <button
                  className="ph-modal-confirm"
                  onClick={handleCancel}
                  disabled={cancelling || previewLoading}
                  style={cancelModal.preview?.refundPercent === 0 ? { background: "#dc2626" } : {}}
                >
                  {cancelling
                    ? <span className="pay-spinner" />
                    : cancelModal.preview?.refundPercent === 0
                    ? "🗑️ Hủy lịch (Mất tiền)"
                    : "Xác nhận hủy lịch"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            MODAL LUỒNG 2 — Khiếu nại sau 0%
        ══════════════════════════════════════════════════ */}
        {appealModal && (
          <div className="ph-modal-overlay" onClick={() => !appealing && setAppealModal(null)}>
            <div className="ph-modal" onClick={e => e.stopPropagation()}>
              <h3 className="ph-modal-title">📝 Gửi khiếu nại hoàn tiền</h3>

              <div className="ph-modal-info">
                <p>{appealModal.payment.ServiceName || "Dịch vụ rửa xe"} · {appealModal.payment.LicensePlate}</p>
                <p className="ph-modal-amount">Số tiền: {formatPrice(appealModal.payment.Amount)}</p>
              </div>

              <div style={{
                padding: "12px 14px", borderRadius: 10, marginBottom: 14,
                background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)",
              }}>
                <p style={{ fontSize: 13, color: "#fb923c", margin: 0 }}>
                  Yêu cầu khiếu nại sẽ được gửi đến Admin để xem xét đặc biệt.
                  Admin có thể chấp thuận hoặc từ chối tùy theo tình huống.
                </p>
              </div>

              <p className="ph-modal-label" style={{ marginBottom: 6 }}>Lý do khiếu nại *</p>
              <textarea
                className="ph-modal-textarea"
                rows={4}
                placeholder="Mô tả lý do bạn cho rằng nên được hoàn tiền..."
                value={appealReason}
                onChange={e => setAppealReason(e.target.value)}
                disabled={appealing}
                style={{ marginBottom: 14 }}
              />

              <div className="ph-modal-actions">
                <button className="ph-modal-cancel"
                  onClick={() => { setAppealModal(null); setAppealReason(""); }}
                  disabled={appealing}>
                  Hủy bỏ
                </button>
                <button className="ph-modal-confirm" onClick={handleAppeal} disabled={appealing}>
                  {appealing ? <span className="pay-spinner" /> : "Gửi khiếu nại"}
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
