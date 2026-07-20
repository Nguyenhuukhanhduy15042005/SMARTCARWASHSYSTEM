import React, { useState, useMemo, useCallback } from "react";
import {
  Check, X, Search, FileText, RotateCw,
  AlertTriangle, Wallet, Calendar, CreditCard,
  Filter, ArrowLeft, User, Car, ShieldCheck, History as HistoryIcon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./Payment.css";

/* ============================================================================
   API LAYER
   ----------------------------------------------------------------------------
   Set USE_MOCK = false and API_BASE to your server to go live. Every function
   mirrors the exact request/response shape of refundRequest.js. Attach the
   admin JWT the same way verifyToken expects (Authorization: Bearer <token>).

   Admin scope only: getRefundRequests, getRefundRequestById, reviewRefundRequest,
   getRefundHistory. No access to createRefundRequest / review-start routes.

   NOTE FOR BACKEND: reviewRefundRequest() in refundRequest.js currently only
   allows action when Status === 'Pending'. The written spec (Staff moves to
   UnderReview, then Admin reviews) needs that check changed to
   Status === 'Pending' || Status === 'UnderReview', otherwise requests that
   went through review-start will be rejected here with a 400.
============================================================================ */
const USE_MOCK = false;
const API_BASE = "/api/refund-requests";

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Có lỗi xảy ra");
  return data;
}

/* ---------------------------- MOCK BACKEND -------------------------------- */
let mockDb = [
  {
    RefundID: 1, PaymentID: 105, BookingID: 4990, Status: "Pending",
    RefundAmount: 300000, RefundPercent: 100, Reason: "Khách báo bận đột xuất, hủy trước 2 ngày",
    Note: null, CreatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3), UpdatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    CustomerName: "Đỗ Minh Quân", CustomerEmail: "quan.do@mail.com", RequestedByName: "Staff - Hồng", ApprovedByName: null,
    OriginalAmount: 300000, PaymentMethod: "vnpay", BookingDate: new Date(Date.now() + 1000 * 60 * 60 * 30),
    LicensePlate: "51G-999.88", VehicleType: "Sedan", BookingStatus: 1,
  },
  {
    RefundID: 2, PaymentID: 106, BookingID: 4988, Status: "UnderReview",
    RefundAmount: 150000, RefundPercent: 50, Reason: "Trùng lịch với booking khác",
    Note: null, CreatedAt: new Date(Date.now() - 1000 * 60 * 60 * 26), UpdatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    CustomerName: "Vũ Thị Lan", CustomerEmail: "lan.vu@mail.com", RequestedByName: "Staff - Tùng", ApprovedByName: null,
    OriginalAmount: 300000, PaymentMethod: "vnpay", BookingDate: new Date(Date.now() + 1000 * 60 * 60 * 3),
    LicensePlate: "29H-456.78", VehicleType: "SUV", BookingStatus: 1,
  },
  {
    RefundID: 3, PaymentID: 107, BookingID: 4970, Status: "Refunded",
    RefundAmount: 250000, RefundPercent: 100, Reason: "Xe bị hỏng không thể mang đến",
    Note: "Đã xác minh qua ảnh khách gửi", CreatedAt: new Date(Date.now() - 1000 * 60 * 60 * 96), UpdatedAt: new Date(Date.now() - 1000 * 60 * 60 * 70),
    CustomerName: "Bùi Anh Tuấn", CustomerEmail: "tuan.bui@mail.com", RequestedByName: "Staff - Hồng", ApprovedByName: "Admin - Khánh",
    OriginalAmount: 250000, PaymentMethod: "vnpay", BookingDate: new Date(Date.now() - 1000 * 60 * 60 * 100),
    LicensePlate: "51A-222.33", VehicleType: "Hatchback", BookingStatus: 5,
  },
  {
    RefundID: 4, PaymentID: 108, BookingID: 4965, Status: "Rejected",
    RefundAmount: 0, RefundPercent: 0, Reason: "Khách đổi ý sau khi xe đã vào rửa",
    Note: "Booking đã chuyển trạng thái đang rửa trước khi yêu cầu được tạo", CreatedAt: new Date(Date.now() - 1000 * 60 * 60 * 120), UpdatedAt: new Date(Date.now() - 1000 * 60 * 60 * 118),
    CustomerName: "Ngô Bảo Châu", CustomerEmail: "chau.ngo@mail.com", RequestedByName: "Staff - Tùng", ApprovedByName: "Admin - Khánh",
    OriginalAmount: 180000, PaymentMethod: "cash", BookingDate: new Date(Date.now() - 1000 * 60 * 60 * 125),
    LicensePlate: "60D-555.66", VehicleType: "Sedan", BookingStatus: 4,
  },
];

function wait(ms = 380) { return new Promise((r) => setTimeout(r, ms)); }

const mockApi = {
  async list({ status, page = 1, limit = 10 }) {
    await wait();
    let data = [...mockDb];
    if (status) data = data.filter((r) => r.Status === status);
    data.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
    const total = data.length;
    const start = (page - 1) * limit;
    return { data: data.slice(start, start + limit), total, page, limit };
  },
  async getById(id) {
    await wait();
    const row = mockDb.find((r) => r.RefundID === Number(id));
    if (!row) throw new Error("Không tìm thấy yêu cầu hoàn tiền");
    return row;
  },
  async review(id, { action, refundAmount, note }) {
    await wait();
    const row = mockDb.find((r) => r.RefundID === Number(id));
    if (!row) throw new Error("Không tìm thấy yêu cầu hoàn tiền");
    if (!["Pending", "UnderReview"].includes(row.Status)) throw new Error(`Yêu cầu đã được xử lý (${row.Status})`);
    const finalAmount = refundAmount !== undefined && refundAmount !== "" ? Number(refundAmount) : Number(row.RefundAmount);
    if (action === "approve" && finalAmount > Number(row.OriginalAmount)) {
      throw new Error(`Số tiền hoàn (${finalAmount.toLocaleString("vi-VN")}đ) không thể vượt quá số tiền đã trả (${Number(row.OriginalAmount).toLocaleString("vi-VN")}đ)`);
    }
    row.Status = action === "approve" ? "Approved" : "Rejected";
    row.RefundAmount = finalAmount;
    row.Note = note || null;
    row.ApprovedByName = "Bạn (Admin)";
    row.UpdatedAt = new Date();
    if (action === "approve") {
      setTimeout(() => {
        row.Status = "RefundProcessing";
        row.UpdatedAt = new Date();
        setTimeout(() => { row.Status = "Refunded"; row.UpdatedAt = new Date(); }, 1200);
      }, 1200);
    }
    return { message: action === "approve" ? "Đã duyệt hoàn tiền thành công" : "Đã từ chối yêu cầu hoàn tiền", refundId: row.RefundID, status: row.Status, refundAmount: finalAmount, note: note || null };
  },
  async history({ range = "30d" }) {
    await wait();
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const cutoff = Date.now() - days * 86400000;
    const data = mockDb.filter((r) => ["Approved", "Rejected", "RefundProcessing", "Refunded"].includes(r.Status) && new Date(r.UpdatedAt).getTime() >= cutoff)
      .sort((a, b) => new Date(b.UpdatedAt) - new Date(a.UpdatedAt));
    const approved = data.filter((r) => r.Status !== "Rejected");
    const rejected = data.filter((r) => r.Status === "Rejected");
    return {
      meta: { range, generatedAt: new Date() },
      summary: { totalRequests: data.length, approved: approved.length, rejected: rejected.length, totalRefundAmount: approved.reduce((s, r) => s + Number(r.RefundAmount || 0), 0) },
      data,
    };
  },
};

const Api = {
  list: (q) => USE_MOCK ? mockApi.list(q) : apiFetch(`/?${new URLSearchParams(q)}`),
  getById: (id) => USE_MOCK ? mockApi.getById(id) : apiFetch(`/${id}`),
  review: (id, body) => USE_MOCK ? mockApi.review(id, body) : apiFetch(`/${id}/review`, { method: "PATCH", body: JSON.stringify(body) }),
  history: (q) => USE_MOCK ? mockApi.history(q) : apiFetch(`/history?${new URLSearchParams(q)}`),
};

/* ============================================================================
   DESIGN TOKENS / HELPERS
============================================================================ */
const STATUS_META = {
  Pending:          { label: "Chờ duyệt",      color: "#B8732A", step: 0 },
  UnderReview:      { label: "Đang xem xét",   color: "#3E6B96", step: 1 },
  Approved:         { label: "Đã duyệt",       color: "#2F7D5E", step: 2 },
  RefundProcessing: { label: "Đang hoàn tiền", color: "#6B5B95", step: 3 },
  Refunded:         { label: "Đã hoàn tiền",   color: "#1F5C43", step: 4 },
  Rejected:         { label: "Từ chối",        color: "#B23A34", step: -1 },
};
const PIPELINE = ["Pending", "UnderReview", "Approved", "RefundProcessing", "Refunded"];

const money = (n) => `${Number(n || 0).toLocaleString("vi-VN")}đ`;
const dt = (d) => new Date(d).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dOnly = (d) => new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

function StatusPill({ status }) {
  const m = STATUS_META[status] || { label: status, color: "#666" };
  return (
    <span className="rq-pill ph-status" style={{ "--pc": m.color }}>
      <span className="rq-pill-dot" />{m.label}
    </span>
  );
}

function Flow({ status }) {
  if (status === "Rejected") {
    return (
      <div className="rq-flow-rejected">
        <X size={16} strokeWidth={2.5} />
        <span>Yêu cầu đã bị từ chối trong quá trình xem xét</span>
      </div>
    );
  }
  const idx = STATUS_META[status]?.step ?? 0;
  return (
    <div className="rq-flow">
      {PIPELINE.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`flow-step ${i < idx ? "done" : i === idx ? "current" : "todo"}`}>
            <div className="rq-flow-node">{i < idx ? <Check size={12} strokeWidth={3} /> : <span>{i + 1}</span>}</div>
            <div className="rq-flow-label">{STATUS_META[s].label}</div>
          </div>
          {i < PIPELINE.length - 1 && <div className={`flow-line ${i < idx ? "done" : ""}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type}`}>
      {toast.type === "error" ? <AlertTriangle size={16} /> : <Check size={16} />}
      {toast.msg}
    </div>
  );
}

/* ============================================================================
   MAIN APP — ADMIN
============================================================================ */

const RQ_DARK_CSS = `
  .rq-toolbar{display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap}
  .rq-search-box{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 14px;flex:1;min-width:220px}
  .rq-search-box input{border:none;outline:none;background:transparent;font-size:13.5px;width:100%;color:#e2e8f0}
  .rq-search-box input::placeholder{color:#64748b}
  .rq-chip-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
  .rq-chip{padding:7px 14px;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);font-size:12.5px;font-weight:600;color:#94a3b8;white-space:nowrap;cursor:pointer}
  .rq-chip.active{background:#f97316;border-color:#f97316;color:#fff}
  .rq-table-wrap{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden}
  table.rq-table{width:100%;border-collapse:collapse;font-size:13px}
  table.rq-table thead th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;font-weight:600;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03)}
  table.rq-table tbody td{padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.06);vertical-align:middle;color:#e2e8f0}
  table.rq-table tbody tr:last-child td{border-bottom:none}
  table.rq-table tbody tr{transition:background .12s;cursor:pointer}
  table.rq-table tbody tr:hover{background:rgba(255,255,255,0.04)}
  .rq-mono{font-family:monospace;color:#94a3b8}
  .rq-cust-name{font-weight:600;color:#f1f5f9}
  .rq-cust-sub{font-size:11.5px;color:#64748b;margin-top:2px}
  .rq-amt{font-family:monospace;font-weight:600;color:#f1f5f9}
  .rq-empty{padding:60px 20px;text-align:center;color:#64748b}
  .rq-pill{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;padding:4px 10px 4px 8px;border-radius:999px;white-space:nowrap;background:rgba(255,255,255,0.08);color:#e2e8f0}
  .rq-pill-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
  .rq-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:600;border:1px solid transparent;cursor:pointer;transition:opacity .12s}
  .rq-btn:disabled{opacity:.45;cursor:not-allowed}
  .rq-btn-accent{background:#f97316;color:#fff}
  .rq-btn-success{background:#10b981;color:#fff}
  .rq-btn-danger{background:#ef4444;color:#fff}
  .rq-btn-outline{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12);color:#e2e8f0}
  .rq-btn-ghost{background:transparent;color:#94a3b8;border:none}
  .rq-drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(2px);z-index:40}
  .rq-drawer{position:fixed;top:0;right:0;height:100%;width:min(480px,100%);background:#1e293b;z-index:41;box-shadow:-12px 0 40px rgba(0,0,0,.4);display:flex;flex-direction:column}
  .rq-drawer-head{padding:18px 20px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;gap:10px}
  .rq-drawer-head-left{display:flex;align-items:center;gap:10px}
  .rq-drawer-body{padding:20px;overflow-y:auto;flex:1}
  .rq-drawer-foot{padding:16px 20px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03)}
  .rq-flow{display:flex;align-items:flex-start;padding:6px 2px 18px}
  .rq-flow-step{display:flex;flex-direction:column;align-items:center;width:60px;flex-shrink:0}
  .rq-flow-node{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:2px solid rgba(255,255,255,0.15);color:#64748b;background:#1e293b}
  .rq-flow-step.done .rq-flow-node{background:#f97316;border-color:#f97316;color:#fff}
  .rq-flow-step.current .rq-flow-node{border-color:#f97316;color:#f97316;box-shadow:0 0 0 3px rgba(249,115,22,.2)}
  .rq-flow-label{font-size:9px;text-align:center;margin-top:6px;color:#64748b;font-weight:600;line-height:1.2}
  .rq-flow-step.current .rq-flow-label,.rq-flow-step.done .rq-flow-label{color:#e2e8f0}
  .rq-flow-line{flex:1;height:2px;background:rgba(255,255,255,0.1);margin-top:11px}
  .rq-flow-line.done{background:#f97316}
  .rq-flow-rejected{display:flex;align-items:center;gap:8px;background:rgba(239,68,68,0.12);color:#ef4444;padding:10px 13px;border-radius:8px;font-size:12.5px;font-weight:600;margin-bottom:16px;border:1px solid rgba(239,68,68,0.2)}
  .rq-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}
  .rq-info-item label{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;font-weight:600;margin-bottom:3px}
  .rq-info-item .val{font-size:13px;font-weight:500;color:#e2e8f0;display:flex;align-items:center;gap:6px}
  .rq-info-item.span2{grid-column:1/-1}
  .rq-divider{height:1px;background:rgba(255,255,255,0.08);margin:16px 0}
  .rq-amount-box{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:9px;padding:14px;margin-bottom:16px}
  .rq-amount-row{display:flex;justify-content:space-between;align-items:baseline;font-size:12.5px;color:#94a3b8;margin-bottom:4px}
  .rq-amount-row .big{font-family:monospace;font-size:17px;font-weight:700;color:#f1f5f9}
  .rq-field{margin-bottom:14px}
  .rq-field label{display:block;font-size:12.5px;font-weight:600;color:#e2e8f0;margin-bottom:6px}
  .rq-field .hint{font-size:11px;color:#64748b;margin-top:4px}
  .rq-field input,.rq-field textarea,.rq-field select{width:100%;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:9px 11px;font-size:13.5px;color:#e2e8f0;background:rgba(255,255,255,0.06);outline:none}
  .rq-field input:focus,.rq-field textarea:focus{border-color:#f97316}
  .rq-field textarea{resize:vertical;min-height:72px}
  .rq-summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
  .rq-summary-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px}
  .rq-summary-card label{font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:#64748b;font-weight:600}
  .rq-summary-card .val{font-size:22px;font-weight:700;margin-top:6px;color:#f1f5f9}
  .rq-summary-card.accent .val{color:#f97316}
  .rq-spin{animation:rqSpin .9s linear infinite}
  @keyframes rqSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
`;

if (typeof document !== "undefined" && !document.getElementById("rq-dark")) {
  const s = document.createElement("style");
  s.id = "rq-dark";
  s.textContent = RQ_DARK_CSS;
  document.head.appendChild(s);
}


export default function RefundRequestManagement() {
  const [tab, setTab] = useState("list");
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const refreshList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Api.list({ status: statusFilter, page: 1, limit: 50 });
      setRows(res.data);
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, notify]);

  React.useEffect(() => { if (tab === "list") refreshList(); }, [tab, refreshList]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => r.CustomerName?.toLowerCase().includes(q) || r.LicensePlate?.toLowerCase().includes(q) || String(r.RefundID).includes(q));
  }, [rows, search]);

  const selected = rows.find((r) => r.RefundID === selectedId);

  const openDetail = async (id) => {
    setSelectedId(id);
    try {
      const full = await Api.getById(id);
      setRows((prev) => prev.map((r) => (r.RefundID === id ? { ...r, ...full } : r)));
    } catch (e) { notify(e.message, "error"); }
  };

  const navigate = useNavigate();

  return (
    <div className="portal-layout-container">
      <Sidebar />
      <div className="portal-main-content payment-page-container" style={{ padding: "32px 40px" }}>
        <div className="ph-wrapper">

          {/* HEADER */}
          <div className="ph-header">
            <div>
              <button className="payment-back-btn" onClick={() => navigate(-1)}>← Quay lại</button>
              <h1 className="payment-title" style={{ marginTop: "0.5rem" }}>Quản lý hoàn tiền</h1>
              <p className="payment-subtitle">Duyệt, từ chối và theo dõi các yêu cầu hoàn tiền</p>
            </div>
          </div>

          {/* TABS */}
          <div className="ph-filter-tabs" style={{ marginBottom: 24 }}>
            <button
              className={`ph-tab ${tab === "list" ? "active" : ""}`}
              onClick={() => setTab("list")}
            >
              📋 Danh sách
            </button>
            <button
              className={`ph-tab ${tab === "history" ? "active" : ""}`}
              onClick={() => setTab("history")}
            >
              📊 Lịch sử & báo cáo
            </button>
          </div>

          {tab === "list" && (
            <ListView
              rows={filteredRows} loading={loading}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              search={search} setSearch={setSearch}
              onOpen={openDetail}
            />
          )}

          {tab === "history" && <HistoryView notify={notify} />}

        </div>

        {selected && (
          <DetailDrawer
            row={selected}
            onClose={() => setSelectedId(null)}
            onChanged={async (msg) => { notify(msg); await refreshList(); const fresh = await Api.getById(selected.RefundID); setRows((p) => p.map((r) => r.RefundID === fresh.RefundID ? { ...r, ...fresh } : r)); }}
            onError={(msg) => notify(msg, "error")}
          />
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

/* ============================================================================
   LIST VIEW
============================================================================ */
function ListView({ rows, loading, statusFilter, setStatusFilter, search, setSearch, onOpen }) {
  const statuses = ["", "Pending", "UnderReview", "Approved", "Rejected", "RefundProcessing", "Refunded"];
  return (
    <div>
      <div className="rq-toolbar" style={{ display:"flex", gap:10, marginBottom:16 }}>
        <div className="rq-search-box">
          <Search size={15} />
          <input placeholder="Tìm theo tên khách, biển số, mã yêu cầu…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="rq-chip-row" style={{ marginBottom: 16 }}>
        <Filter size={14} style={{ color: "var(--ink-faint)", alignSelf: "center", marginRight: 2 }} />
        {statuses.map((s) => (
          <button key={s || "all"} className={`rq-chip ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
            {s ? STATUS_META[s].label : "Tất cả"}
          </button>
        ))}
      </div>

      <div className="rq-table-wrap">
        {loading ? (
          <div className="rq-empty"><RotateCw size={22} className="rq-spin" /><div>Đang tải…</div></div>
        ) : rows.length === 0 ? (
          <div className="rq-empty"><FileText size={26} /><div>Không có yêu cầu hoàn tiền nào phù hợp bộ lọc.</div></div>
        ) : (
          <table className="rq-table">
            <thead>
              <tr>
                <th>Mã</th><th>Khách hàng</th><th>Xe / Biển số</th><th>Số tiền hoàn</th><th>Trạng thái</th><th>Tạo lúc</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.RefundID} onClick={() => onOpen(r.RefundID)}>
                  <td className="rq-mono">#{r.RefundID}</td>
                  <td>
                    <div className="rq-cust-name">{r.CustomerName}</div>
                    <div className="rq-cust-sub">Booking #{r.BookingID} · {r.PaymentMethod?.toUpperCase()}</div>
                  </td>
                  <td>
                    <div>{r.VehicleType}</div>
                    <div className="cust-sub mono">{r.LicensePlate}</div>
                  </td>
                  <td>
                    <div className="rq-amt">{money(r.RefundAmount)}</div>
                    <div className="rq-cust-sub">{r.RefundPercent}% của {money(r.OriginalAmount)}</div>
                  </td>
                  <td><StatusPill status={r.Status} /></td>
                  <td className="rq-cust-sub">{dt(r.CreatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   HISTORY VIEW
============================================================================ */
function HistoryView({ notify }) {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (r) => {
    setLoading(true);
    try {
      const res = await Api.history({ range: r });
      setData(res);
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  React.useEffect(() => { load(range); }, [range, load]);

  return (
    <div>
      <div className="rq-chip-row" style={{ marginBottom: 18 }}>
        {[["7d", "7 ngày"], ["30d", "30 ngày"], ["90d", "90 ngày"]].map(([v, l]) => (
          <button key={v} className={`rq-chip ${range === v ? "active" : ""}`} onClick={() => setRange(v)}>{l}</button>
        ))}
      </div>

      {loading || !data ? (
        <div className="rq-empty"><RotateCw size={22} className="rq-spin" /><div>Đang tải báo cáo…</div></div>
      ) : (
        <>
          <div className="rq-summary-grid">
            <div className="rq-summary-card"><label>Tổng yêu cầu</label><div className="val">{data.summary.totalRequests}</div></div>
            <div className="rq-summary-card"><label>Đã duyệt</label><div className="val" style={{ color: "#2F7D5E" }}>{data.summary.approved}</div></div>
            <div className="rq-summary-card"><label>Bị từ chối</label><div className="val" style={{ color: "#B23A34" }}>{data.summary.rejected}</div></div>
            <div className="rq-summary-card accent"><label>Tổng tiền đã hoàn</label><div className="val">{money(data.summary.totalRefundAmount)}</div></div>
          </div>

          <div className="rq-table-wrap">
            {data.data.length === 0 ? (
              <div className="rq-empty"><HistoryIcon size={26} /><div>Không có dữ liệu trong khoảng thời gian này.</div></div>
            ) : (
              <table className="rq-table">
                <thead>
                  <tr><th>Mã</th><th>Khách hàng</th><th>Số tiền hoàn</th><th>Trạng thái</th><th>Duyệt bởi</th><th>Cập nhật</th></tr>
                </thead>
                <tbody>
                  {data.data.map((r) => (
                    <tr key={r.RefundID} style={{ cursor: "default" }}>
                      <td className="rq-mono">#{r.RefundID}</td>
                      <td>
                        <div className="rq-cust-name">{r.CustomerName}</div>
                        <div className="cust-sub mono">{r.LicensePlate}</div>
                      </td>
                      <td className="rq-amt">{money(r.RefundAmount)}</td>
                      <td><StatusPill status={r.Status} /></td>
                      <td className="rq-cust-sub">{r.ApprovedByName || "—"}</td>
                      <td className="rq-cust-sub">{dt(r.UpdatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================================
   DETAIL DRAWER
============================================================================ */
function DetailDrawer({ row, onClose, onChanged, onError }) {
  const [busy, setBusy] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [action, setAction] = useState("approve");
  const [amount, setAmount] = useState(row.RefundAmount);
  const [note, setNote] = useState("");

  React.useEffect(() => { setAmount(row.RefundAmount); }, [row.RefundID]);

  const canReview = row.Status === "Pending" || row.Status === "UnderReview";

  const doReview = async () => {
    if (action === "approve" && Number(amount) > Number(row.OriginalAmount)) {
      onError(`Số tiền hoàn không thể vượt quá ${money(row.OriginalAmount)}`);
      return;
    }
    setBusy(true);
    try {
      const res = await Api.review(row.RefundID, { action, refundAmount: Number(amount), note: note.trim() || undefined });
      await onChanged(res.message);
      setReviewOpen(false);
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="rq-drawer-overlay" onClick={onClose} />
      <div className="rq-drawer">
        <div className="rq-drawer-head">
          <div className="rq-drawer-head-left">
            <button className="rq-btn rq-btn-ghost" style={{ padding: 6 }} onClick={onClose}><ArrowLeft size={17} /></button>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15 }}>Yêu cầu #{row.RefundID}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>Booking #{row.BookingID} · Payment #{row.PaymentID}</div>
            </div>
          </div>
          <StatusPill status={row.Status} />
        </div>

        <div className="rq-drawer-body">
          <Flow status={row.Status} />

          <div className="rq-amount-box">
            <div className="rq-amount-row"><span>Số tiền hoàn</span><span className="big">{money(row.RefundAmount)}</span></div>
            <div className="rq-amount-row"><span>Tỉ lệ</span><span>{row.RefundPercent}% của {money(row.OriginalAmount)}</span></div>
          </div>

          <div className="rq-info-grid">
            <div className="rq-info-item"><label>Khách hàng</label><div className="val"><User size={13} />{row.CustomerName}</div></div>
            <div className="rq-info-item"><label>Email</label><div className="val">{row.CustomerEmail || "—"}</div></div>
            <div className="rq-info-item"><label>Xe</label><div className="val"><Car size={13} />{row.VehicleType}</div></div>
            <div className="rq-info-item"><label>Biển số</label><div className="val mono">{row.LicensePlate}</div></div>
            <div className="rq-info-item"><label>Ngày đặt lịch</label><div className="val"><Calendar size={13} />{dOnly(row.BookingDate)}</div></div>
            <div className="rq-info-item"><label>Phương thức TT</label><div className="val"><CreditCard size={13} />{row.PaymentMethod === "cash" ? "Tiền mặt" : row.PaymentMethod?.toUpperCase()}</div></div>
            <div className="rq-info-item span2">
              <label>Lý do yêu cầu</label>
              <div className="val" style={{ fontWeight: 400 }}>{row.Reason}</div>
            </div>
            {row.Note && (
              <div className="rq-info-item span2">
                <label>Ghi chú xử lý</label>
                <div className="val" style={{ fontWeight: 400 }}>{row.Note}</div>
              </div>
            )}
          </div>

          <div className="rq-divider" />

          <div className="rq-info-grid">
            <div className="rq-info-item"><label>Tạo bởi</label><div className="val">{row.RequestedByName || "—"}</div></div>
            <div className="rq-info-item"><label>Duyệt bởi</label><div className="val">{row.ApprovedByName || "—"}</div></div>
            <div className="rq-info-item"><label>Tạo lúc</label><div className="val" style={{ fontWeight: 400 }}>{dt(row.CreatedAt)}</div></div>
            <div className="rq-info-item"><label>Cập nhật lúc</label><div className="val" style={{ fontWeight: 400 }}>{dt(row.UpdatedAt)}</div></div>
          </div>

          {reviewOpen && (
            <div className="card" style={{ padding: 16, marginTop: 6 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button className={`rq-chip ${action === "approve" ? "active" : ""}`} onClick={() => setAction("approve")} style={{ flex: 1, textAlign: "center" }}>Duyệt</button>
                <button className={`rq-chip ${action === "reject" ? "active" : ""}`} onClick={() => setAction("reject")} style={{ flex: 1, textAlign: "center" }}>Từ chối</button>
              </div>
              {action === "approve" && (
                <div className="rq-field">
                  <label>Số tiền hoàn (có thể điều chỉnh)</label>
                  <input type="number" min={0} max={row.OriginalAmount} value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <div className="hint">Tối đa {money(row.OriginalAmount)} (số tiền đã trả)</div>
                </div>
              )}
              <div className="rq-field">
                <label>Ghi chú {action === "reject" ? "(lý do từ chối)" : "(tuỳ chọn)"}</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={action === "reject" ? "Giải thích lý do từ chối cho khách…" : "Ghi chú nội bộ…"} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className={`rq-btn ${action === "approve" ? "rq-btn-success" : "rq-btn-danger"}`} onClick={doReview} disabled={busy} style={{ flex: 1, justifyContent: "center" }}>
                  {busy ? <RotateCw size={14} className="rq-spin" /> : action === "approve" ? <Check size={14} /> : <X size={14} />}
                  {action === "approve" ? "Xác nhận duyệt" : "Xác nhận từ chối"}
                </button>
                <button className="rq-btn rq-btn-outline" onClick={() => setReviewOpen(false)} disabled={busy}>Huỷ</button>
              </div>
            </div>
          )}
        </div>

        {!reviewOpen && canReview && (
          <div className="rq-drawer-foot">
            <button className="rq-btn rq-btn-accent" style={{ width: "100%", justifyContent: "center" }} onClick={() => setReviewOpen(true)}>
              <ShieldCheck size={14} /> Duyệt / Từ chối
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Dark-theme overrides injected globally ── */