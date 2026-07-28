import React, { useState, useMemo, useCallback } from "react";
import {
  Check, X, ChevronRight, Search, FileText, RotateCw,
  AlertTriangle, Wallet, Calendar, CreditCard,
  PlusCircle, Filter, ArrowLeft, User, Car, Send
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./Payment.css";


const USE_MOCK = false;
const BACKEND_ORIGIN = "http://localhost:5000";
const API_BASE = `${BACKEND_ORIGIN}/api/refund-requests`;
const PAYMENTS_ENDPOINT = `${BACKEND_ORIGIN}/api/payments/refundable`;

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("TOKEN") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Có lỗi xảy ra");
  return data;
}

async function apiFetchUrl(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Có lỗi xảy ra");
  return data;
}

/* ---------------------------- MOCK BACKEND -------------------------------- */
const MOCK_PAYMENTS = [
  { PaymentID: 101, BookingID: 5001, CustomerID: 1, CustomerName: "Nguyễn Văn An", LicensePlate: "51A-123.45", VehicleType: "Sedan", Amount: 350000, PaymentMethod: "vnpay", BookingDate: new Date(Date.now() + 1000 * 60 * 60 * 40), CancelCount: 0 },
  { PaymentID: 102, BookingID: 5002, CustomerID: 2, CustomerName: "Trần Thị Bích", LicensePlate: "59C-678.90", VehicleType: "SUV", Amount: 500000, PaymentMethod: "vnpay", BookingDate: new Date(Date.now() + 1000 * 60 * 60 * 5), CancelCount: 1 },
  { PaymentID: 103, BookingID: 5003, CustomerID: 3, CustomerName: "Lê Hoàng Nam", LicensePlate: "30F-111.22", VehicleType: "Hatchback", Amount: 200000, PaymentMethod: "cash", BookingDate: new Date(Date.now() + 1000 * 60 * 60 * 20), CancelCount: 0 },
  { PaymentID: 104, BookingID: 5004, CustomerID: 4, CustomerName: "Phạm Thu Hà", LicensePlate: "43K-333.44", VehicleType: "Sedan", Amount: 420000, PaymentMethod: "vnpay", BookingDate: new Date(Date.now() + 1000 * 60 * 60 * 1), CancelCount: 2 },
];

let mockSeq = 5;
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

function computeProposal(payment) {
  const now = new Date();
  const hoursLeft = Math.max(0, (new Date(payment.BookingDate) - now) / (1000 * 60 * 60));
  const isDeposit = payment.PaymentMethod === "cash" && payment.Amount > 0;
  let refundPercent = 0;
  if (!isDeposit) {
    if (hoursLeft >= 24 && payment.CancelCount === 0) refundPercent = 100;
    else if (hoursLeft >= 2 && payment.CancelCount <= 1) refundPercent = 50;
    else refundPercent = 0;
  }
  const refundAmount = Math.round(payment.Amount * refundPercent / 100);
  return { isDeposit, refundPercent, refundAmount, hoursLeft };
}

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
  async create({ paymentId, reason }) {
    await wait();
    const payment = MOCK_PAYMENTS.find((p) => p.PaymentID === Number(paymentId));
    if (!payment) throw new Error("Không tìm thấy payment");
    if (mockDb.some((r) => r.PaymentID === Number(paymentId) && ["Pending", "UnderReview"].includes(r.Status))) {
      throw new Error("Payment này đã có yêu cầu hoàn tiền đang xử lý (chờ duyệt hoặc đang xem xét)");
    }
    const { isDeposit, refundPercent, refundAmount } = computeProposal(payment);
    const row = {
      RefundID: mockSeq++, PaymentID: payment.PaymentID, BookingID: payment.BookingID,
      Status: "Pending", RefundAmount: refundAmount, RefundPercent: refundPercent, Reason: reason,
      Note: null, CreatedAt: new Date(), UpdatedAt: new Date(),
      CustomerName: payment.CustomerName, CustomerEmail: "-", RequestedByName: "Bạn (Staff)", ApprovedByName: null,
      OriginalAmount: payment.Amount, PaymentMethod: payment.PaymentMethod, BookingDate: payment.BookingDate,
      LicensePlate: payment.LicensePlate, VehicleType: payment.VehicleType, BookingStatus: 1,
    };
    mockDb.unshift(row);
    return {
      message: "Tạo yêu cầu hoàn tiền thành công, đang chờ chuyển xem xét",
      refundId: row.RefundID, paymentId: payment.PaymentID, bookingId: payment.BookingID,
      customerName: payment.CustomerName, originalAmount: payment.Amount, refundPercent, refundAmount, isDeposit, status: "Pending",
    };
  },
  async startReview(id) {
    await wait();
    const row = mockDb.find((r) => r.RefundID === Number(id));
    if (!row) throw new Error("Không tìm thấy yêu cầu hoàn tiền");
    if (row.Status !== "Pending") throw new Error(`Chỉ có thể chuyển từ Pending (hiện tại: ${row.Status})`);
    row.Status = "UnderReview";
    row.UpdatedAt = new Date();
    return { message: "Đã chuyển sang UnderReview, chờ Admin duyệt", refundId: row.RefundID, status: "UnderReview" };
  },
  async confirmRefunded(id) {
    await wait();
    const row = mockDb.find((r) => r.RefundID === Number(id));
    if (!row) throw new Error("Không tìm thấy yêu cầu hoàn tiền");
    if (row.Status !== "Approved") throw new Error(`Chỉ xác nhận được khi đã Approved (hiện tại: ${row.Status})`);
    row.Status = "Refunded";
    row.UpdatedAt = new Date();
    return { message: "Đã xác nhận hoàn tiền mặt thành công", refundId: row.RefundID, status: "Refunded" };
  },
  async listPayments() {
    await wait(200);
    return { data: MOCK_PAYMENTS };
  },
};

const Api = {
  list: (q) => USE_MOCK ? mockApi.list(q) : apiFetch(`/?${new URLSearchParams(q)}`),
  getById: (id) => USE_MOCK ? mockApi.getById(id) : apiFetch(`/${id}`),
  create: (body) => USE_MOCK ? mockApi.create(body) : apiFetch(`/`, { method: "POST", body: JSON.stringify(body) }),
  startReview: (id) => USE_MOCK ? mockApi.startReview(id) : apiFetch(`/${id}/review-start`, { method: "PATCH" }),
  confirmRefunded: (id) => USE_MOCK ? mockApi.confirmRefunded(id) : apiFetch(`/${id}/confirm-refunded`, { method: "PATCH" }),
  listPayments: () => USE_MOCK ? mockApi.listPayments() : apiFetchUrl(PAYMENTS_ENDPOINT),
};

/* ============================================================================
   DESIGN TOKENS / HELPERS
============================================================================ */
const STATUS_META = {
  Pending: { label: "Chờ duyệt", color: "#B8732A", step: 0 },
  UnderReview: { label: "Đang xem xét", color: "#3E6B96", step: 1 },
  Approved: { label: "Đã duyệt", color: "#2F7D5E", step: 2 },
  RefundProcessing: { label: "Đang hoàn tiền", color: "#6B5B95", step: 3 },
  Refunded: { label: "Đã hoàn tiền", color: "#1F5C43", step: 4 },
  Rejected: { label: "Từ chối", color: "#B23A34", step: -1 },
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
        <span>Yêu cầu đã bị Admin từ chối</span>
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
   MAIN APP — STAFF
============================================================================ */

const RQ_DARK_CSS = `
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
  .rq-field input:focus,.rq-field textarea:focus,.rq-field select:focus{border-color:#f97316}
  .rq-field select{color-scheme:light}
  .rq-field select option{color:#0f172a !important;background:#fff !important}
  .rq-field select option:checked,.rq-field select option:hover{color:#fff !important;background:#f97316 !important}
  .rq-field textarea{resize:vertical;min-height:72px}
  .rq-form-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;max-width:640px}
  .rq-form-title{font-size:17px;font-weight:700;color:#f1f5f9;margin:0 0 4px}
  .rq-form-sub{font-size:12.5px;color:#94a3b8;margin:0 0 20px}
  .rq-perm-note{display:flex;gap:8px;align-items:flex-start;background:rgba(249,115,22,0.1);color:#fb923c;padding:10px 13px;border-radius:8px;font-size:12px;margin-bottom:18px;border:1px solid rgba(249,115,22,0.2)}
  .rq-payment-preview{background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.12);border-radius:9px;padding:14px;margin:10px 0 18px;font-size:12.5px}
  .rq-payment-preview .row{display:flex;justify-content:space-between;padding:4px 0;color:#94a3b8}
  .rq-payment-preview .row span:last-child{font-weight:600;color:#e2e8f0}
  .rq-result-card{border:1px solid rgba(16,185,129,0.3);background:rgba(16,185,129,0.08);border-radius:9px;padding:16px;margin-top:18px;color:#e2e8f0}
  .rq-result-card.zero{border-color:rgba(249,115,22,0.3);background:rgba(249,115,22,0.08)}
  .rq-spin{animation:rqSpin .9s linear infinite}
  @keyframes rqSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  .rq-combo{position:relative}
  .rq-combo-trigger{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:9px 11px;font-size:13.5px;color:#e2e8f0;background:rgba(255,255,255,0.06);cursor:pointer;text-align:left}
  .rq-combo-trigger:hover{border-color:rgba(255,255,255,0.22)}
  .rq-combo-trigger:disabled{opacity:.5;cursor:not-allowed}
  .rq-combo-trigger-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rq-combo-placeholder{color:#64748b}
  .rq-combo-chevron{transition:transform .15s;color:#64748b;flex-shrink:0}
  .rq-combo-chevron.open{transform:rotate(90deg)}
  .rq-combo-dropdown{position:absolute;top:calc(100% + 6px);left:0;right:0;background:#1e293b;border:1px solid rgba(255,255,255,0.12);border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.45);z-index:20;overflow:hidden}
  .rq-combo-search{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.08);color:#64748b}
  .rq-combo-search input{border:none;outline:none;background:transparent;font-size:13px;width:100%;color:#e2e8f0}
  .rq-combo-search input::placeholder{color:#64748b}
  .rq-combo-list{max-height:260px;overflow-y:auto}
  .rq-combo-item{display:flex;align-items:center;gap:10px;padding:10px 12px;font-size:12.5px;color:#cbd5e1;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.04)}
  .rq-combo-item:last-child{border-bottom:none}
  .rq-combo-item:hover{background:rgba(255,255,255,0.06)}
  .rq-combo-item.active{background:rgba(249,115,22,0.12)}
  .rq-combo-item-id{font-family:monospace;color:#94a3b8;font-weight:600;flex-shrink:0}
  .rq-combo-item-name{font-weight:600;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}
  .rq-combo-item-name-wrap{display:flex;flex-direction:column;gap:1px;flex:1;min-width:0}
  .rq-combo-item-name-wrap .rq-combo-item-name{flex:none}
  .rq-combo-item-sub{font-size:10.5px;color:#64748b}
  .rq-combo-item-plate{color:#94a3b8;font-family:monospace;flex-shrink:0}
  .rq-combo-item-amt{font-family:monospace;font-weight:600;color:#f1f5f9;flex-shrink:0}
  .rq-combo-item-method{font-size:10px;color:#64748b;text-transform:uppercase;flex-shrink:0}
  .rq-combo-empty{padding:20px;text-align:center;color:#64748b;font-size:12.5px}
`;

if (typeof document !== "undefined") {
  let s = document.getElementById("rq-dark");
  if (!s) {
    s = document.createElement("style");
    s.id = "rq-dark";
    document.head.appendChild(s);
  }
  s.textContent = RQ_DARK_CSS;
}


export default function RefundRequestStaff() {
  const [tab, setTab] = useState("list");
  const [rows, setRows] = useState(mockDb);
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

  const selected = rows.find((r) => r.RefundID === selectedId) || mockDb.find((r) => r.RefundID === selectedId);

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
              <h1 className="payment-title" style={{ marginTop: "0.5rem" }}>Yêu cầu hoàn tiền</h1>
              <p className="payment-subtitle">Tạo yêu cầu và chuyển sang xem xét để Admin duyệt</p>
            </div>
          </div>

          {/* TABS */}
          <div className="ph-filter-tabs" style={{ marginBottom: 24 }}>
            <button className={`ph-tab ${tab === "list" ? "active" : ""}`} onClick={() => setTab("list")}>
              📋 Danh sách
            </button>
            <button className={`ph-tab ${tab === "create" ? "active" : ""}`} onClick={() => setTab("create")}>
              ➕ Tạo yêu cầu
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

          {tab === "create" && (
            <CreateView
              onCreated={(msg) => { notify(msg); setTab("list"); }}
              onError={(msg) => notify(msg, "error")}
            />
          )}

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
      <div className="toolbar">
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
   PAYMENT COMBOBOX — dropdown chọn giao dịch có ô tìm kiếm
   (Search chỉ theo BookingID + tên khách + biển số — bỏ PaymentID theo yêu cầu)
============================================================================ */
function PaymentCombobox({ payments, loading, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = React.useRef(null);

  const selected = payments.find((p) => String(p.PaymentID) === String(value));

  React.useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    if (!q) return payments;
    return payments.filter((p) =>
      String(p.BookingID ?? "").toLowerCase().includes(q) ||
      p.CustomerName?.toLowerCase().includes(q) ||
      p.LicensePlate?.toLowerCase().includes(q)
    );
  }, [payments, query]);

  const label = (p) => `Đơn #${p.BookingID} · ${p.CustomerName} · ${p.LicensePlate} · ${money(p.Amount)} (${p.PaymentMethod})`;

  return (
    <div className="rq-combo" ref={wrapRef}>
      <button
        type="button"
        className="rq-combo-trigger"
        disabled={loading}
        onClick={() => { setOpen((o) => !o); setQuery(""); }}
      >
        <span className={`rq-combo-trigger-label ${selected ? "" : "rq-combo-placeholder"}`}>
          {loading ? "Đang tải danh sách giao dịch…" : selected ? label(selected) : "— Chọn giao dịch —"}
        </span>
        <ChevronRight size={14} className={`rq-combo-chevron ${open ? "open" : ""}`} />
      </button>

      {open && !loading && (
        <div className="rq-combo-dropdown">
          <div className="rq-combo-search">
            <Search size={14} />
            <input
              autoFocus
              placeholder="Tìm theo mã đơn, tên khách, biển số…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="rq-combo-list">
            {filtered.length === 0 ? (
              <div className="rq-combo-empty">Không tìm thấy giao dịch phù hợp.</div>
            ) : (
              filtered.map((p) => (
                <div
                  key={p.PaymentID}
                  className={`rq-combo-item ${String(p.PaymentID) === String(value) ? "active" : ""}`}
                  onClick={() => { onChange(String(p.PaymentID)); setOpen(false); setQuery(""); }}
                >
                  <span className="rq-combo-item-id">#{p.BookingID}</span>
                  <span className="rq-combo-item-name-wrap">
                    <span className="rq-combo-item-name">{p.CustomerName}</span>
                  </span>
                  <span className="rq-combo-item-plate">{p.LicensePlate}</span>
                  <span className="rq-combo-item-amt">{money(p.Amount)}</span>
                  <span className="rq-combo-item-method">{p.PaymentMethod === "cash" ? "Cash" : p.PaymentMethod}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   CREATE VIEW
============================================================================ */
function CreateView({ onCreated, onError }) {
  const [payments, setPayments] = useState(USE_MOCK ? MOCK_PAYMENTS : []);
  const [loadingPayments, setLoadingPayments] = useState(!USE_MOCK);
  const [paymentId, setPaymentId] = useState("");
  const [reason, setReason] = useState("");
  const [incidentType, setIncidentType] = useState(""); // "" = hủy thường, có giá trị = sự cố cửa hàng
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await Api.listPayments();
        if (!cancelled) setPayments(res.data || res || []);
      } catch (e) {
        if (!cancelled) onError(`Không tải được danh sách giao dịch: ${e.message}`);
      } finally {
        if (!cancelled) setLoadingPayments(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isShopFault = incidentType !== "";
  const payment = payments.find((p) => String(p.PaymentID) === String(paymentId));
  // Nếu sự cố cửa hàng → luôn 100%, bỏ qua bảng %
  const proposal = payment
    ? isShopFault
      ? { isDeposit: false, refundPercent: 100, refundAmount: payment.Amount, hoursLeft: null }
      : computeProposal(payment)
    : null;

  const submit = async (e) => {
    e.preventDefault();
    if (!paymentId || !reason.trim()) { onError("Thiếu paymentId hoặc lý do hoàn tiền"); return; }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await Api.create({
        paymentId: Number(paymentId),
        reason: reason.trim(),
        initiatedBy: "staff",
        incidentType: incidentType || null,
      });
      setResult(res);
      onCreated(res.message);
      setReason("");
      setIncidentType("");
    } catch (e2) {
      onError(e2.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rq-form-card">
      <div className="rq-form-title">Tạo yêu cầu hoàn tiền</div>
      <p className="rq-form-sub">Hệ thống tự tính % hoàn tiền đề xuất — Admin sẽ điều chỉnh khi duyệt.</p>
      <div className="rq-perm-note">
        <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
        <span>Sau khi tạo, yêu cầu ở trạng thái <strong>Chờ duyệt</strong>. Vào mục Danh sách để bấm <strong>Chuyển sang xem xét</strong> khi bạn đã kiểm tra xong.</span>
      </div>

      <form onSubmit={submit}>
        {/* Loại yêu cầu: Hủy thường hay Sự cố cửa hàng */}
        <div className="rq-field">
          <label>Loại yêu cầu</label>
          <select value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
            <option value="">👤 Khách hàng yêu cầu hủy</option>
            <option value="machine_failure">🔧 Sự cố máy móc hư hỏng</option>
            <option value="power_outage">⚡ Mất điện</option>
            <option value="weather">🌧️ Thời tiết xấu</option>
            <option value="other">⚠️ Sự cố khác</option>
          </select>
        </div>

        {/* Badge cảnh báo nếu là sự cố cửa hàng */}
        {isShopFault && (
          <div style={{
            display: "flex", gap: 8, alignItems: "flex-start",
            background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: 8, padding: "10px 13px", marginBottom: 14, fontSize: 12.5, color: "#10b981",
          }}>
            <span>✅</span>
            <span>Sự cố từ phía cửa hàng → hệ thống tự động đề xuất hoàn <strong>100%</strong> cho khách. Admin sẽ xác nhận cuối cùng.</span>
          </div>
        )}

        <div className="rq-field">
          <label>Giao dịch thanh toán</label>
          <PaymentCombobox
            payments={payments}
            loading={loadingPayments}
            value={paymentId}
            onChange={setPaymentId}
          />
          {!loadingPayments && payments.length === 0 && (
            <div className="hint">Không có giao dịch nào đủ điều kiện tạo yêu cầu hoàn tiền.</div>
          )}
        </div>

        {payment && proposal && (
          <div className="rq-payment-preview">
            <div className="row"><span>Khách hàng</span><span>{payment.CustomerName}</span></div>
            <div className="row"><span>Booking</span><span>#{payment.BookingID} · {dOnly(payment.BookingDate)}</span></div>
            <div className="row"><span>Số tiền đã trả</span><span>{money(payment.Amount)}</span></div>
            <div className="row"><span>Phương thức</span><span>{payment.PaymentMethod === "cash" ? "Tiền mặt (cọc)" : "VNPay"}</span></div>
            <div className="row">
              <span>% hoàn đề xuất</span>
              <span style={{ color: proposal.refundPercent === 100 ? "#10b981" : proposal.refundPercent === 0 ? "#ef4444" : "#f59e0b", fontWeight: 700 }}>
                {isShopFault ? "100% (sự cố cửa hàng)" : proposal.isDeposit ? "0% (tiền cọc mất khi hủy)" : `${proposal.refundPercent}%`}
              </span>
            </div>
            <div className="row"><span>Số tiền hoàn đề xuất</span><span style={{ fontWeight: 700 }}>{money(proposal.refundAmount)}</span></div>
          </div>
        )}

        <div className="rq-field">
          <label>Lý do hoàn tiền</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mô tả lý do khách yêu cầu hoàn tiền…" maxLength={500} />
        </div>

        <button className="rq-btn rq-btn-accent" type="submit" disabled={submitting || !paymentId || !reason.trim()}>
          {submitting ? <RotateCw size={14} className="rq-spin" /> : <Send size={14} />}
          {submitting ? "Đang gửi…" : "Tạo yêu cầu"}
        </button>
      </form>

      {result && (
        <div className={`result-card ${result.refundAmount === 0 ? "zero" : ""}`}>
          <strong>Đã tạo yêu cầu #{result.refundId}</strong>
          <div style={{ fontSize: 12.5, marginTop: 4, color: "var(--ink-soft)" }}>
            Đề xuất hoàn {result.refundPercent}% — {money(result.refundAmount)} cho {result.customerName}.
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   DETAIL DRAWER
============================================================================ */
function DetailDrawer({ row, onClose, onChanged, onError }) {
  const [busy, setBusy] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const canStartReview = row.Status === "Pending";
  const canConfirmRefunded = row.Status === "Approved"; // Staff xác nhận thủ công đã trả tiền mặt tại quầy

  const doStartReview = async () => {
    setBusy(true);
    try {
      const res = await Api.startReview(row.RefundID);
      await onChanged(res.message);
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  };

  const doConfirmRefunded = async () => {
    setBusy(true);
    try {
      const res = await Api.confirmRefunded(row.RefundID);
      window.dispatchEvent(new Event("noti:refresh"));
      await onChanged(res.message);
      setConfirmModal(false);
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

          {/* Banner Approved — nhắc Staff cần hoàn tiền mặt */}
          {canConfirmRefunded && (
            <div style={{
              display: "flex", gap: 10, alignItems: "flex-start",
              background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: 10, padding: "12px 14px", marginBottom: 16,
            }}>
              <span style={{ fontSize: 20 }}>💵</span>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: "#10b981", margin: "0 0 3px" }}>
                  Yêu cầu đã được Admin duyệt!
                </p>
                <p style={{ fontSize: 12.5, color: "#6ee7b7", margin: 0 }}>
                  Vui lòng hoàn <strong>{money(row.RefundAmount)}</strong> tiền mặt cho khách tại quầy,
                  sau đó bấm xác nhận bên dưới.
                </p>
              </div>
            </div>
          )}

          <div className="rq-amount-box">
            <div className="rq-amount-row"><span>Số tiền hoàn đề xuất</span><span className="big">{money(row.RefundAmount)}</span></div>
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
                <label>Ghi chú từ Admin</label>
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
        </div>

        {/* Footer: nút theo từng trạng thái */}
        {canStartReview && (
          <div className="rq-drawer-foot">
            <button className="rq-btn rq-btn-accent" style={{ width: "100%", justifyContent: "center" }} onClick={doStartReview} disabled={busy}>
              {busy ? <RotateCw size={14} className="rq-spin" /> : <ChevronRight size={14} />}
              Chuyển sang xem xét
            </button>
          </div>
        )}

        {canConfirmRefunded && (
          <div className="rq-drawer-foot">
            <button
              className="rq-btn rq-btn-success"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => setConfirmModal(true)}
              disabled={busy}
            >
              <Check size={14} />
              Xác nhận đã hoàn tiền mặt cho khách
            </button>
          </div>
        )}
      </div>

      {/* Modal xác nhận hoàn tiền mặt */}
      {confirmModal && (
        <div className="rq-drawer-overlay" style={{ zIndex: 50 }} onClick={() => !busy && setConfirmModal(false)}>
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "#1e293b", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14, padding: "28px 28px 24px", width: "min(420px,90vw)", zIndex: 51,
          }} onClick={(e) => e.stopPropagation()}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>
              💵 Xác nhận hoàn tiền mặt
            </p>
            <p style={{ fontSize: 13.5, color: "#94a3b8", marginBottom: 16 }}>
              Bạn xác nhận đã trả <strong style={{ color: "#10b981" }}>{money(row.RefundAmount)}</strong> tiền mặt
              cho khách <strong style={{ color: "#f1f5f9" }}>{row.CustomerName}</strong> tại quầy?
            </p>
            <div style={{
              background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: 8, padding: "10px 13px", fontSize: 12.5, color: "#6ee7b7", marginBottom: 20,
            }}>
              Sau khi xác nhận, khách sẽ nhận được thông báo "Đã hoàn tiền thành công". Hành động này không thể hoàn tác.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="rq-btn rq-btn-outline" style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setConfirmModal(false)} disabled={busy}>
                Huỷ
              </button>
              <button className="rq-btn rq-btn-success" style={{ flex: 2, justifyContent: "center" }}
                onClick={doConfirmRefunded} disabled={busy}>
                {busy ? <RotateCw size={14} className="rq-spin" /> : <Check size={14} />}
                {busy ? "Đang xử lý..." : "Xác nhận đã hoàn tiền"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
