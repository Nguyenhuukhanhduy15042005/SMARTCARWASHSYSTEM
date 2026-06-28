import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://127.0.0.1:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token") || localStorage.getItem("TOKEN") || "";
  return { Authorization: `Bearer ${token}` };
};

// ── CSS ──────────────────────────────────────────────────────────────────────
const css = `
.survey-page { display: flex; min-height: 100vh; background: #0f172a; font-family: 'Plus Jakarta Sans', sans-serif; color: #e2e8f0; }
.survey-content { flex: 1; padding: 36px 40px; max-width: 1300px; overflow-y: auto; }

/* Header */
.survey-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(16,185,129,0.12); color: #34d399;
  padding: 6px 14px; border-radius: 99px; font-size: 13px;
  font-weight: 700; margin-bottom: 12px; border: 1px solid rgba(16,185,129,0.2);
}
.survey-title { margin: 0; font-size: 28px; font-weight: 800; color: #f8fafc; }
.survey-subtitle { margin: 6px 0 28px; color: #64748b; font-size: 14px; }

/* Stat cards */
.survey-stats-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 16px; margin-bottom: 24px;
}
.survey-stat-card {
  background: #1e293b; border-radius: 18px; padding: 22px 20px;
  border: 1px solid rgba(255,255,255,0.06); position: relative; overflow: hidden;
}
.survey-stat-card::before {
  content: ''; position: absolute; top: -24px; right: -24px;
  width: 90px; height: 90px; border-radius: 50%;
}
.survey-stat-card.green::before { background: rgba(16,185,129,0.08); }
.survey-stat-card.blue::before  { background: rgba(99,102,241,0.08); }
.survey-stat-card.yellow::before{ background: rgba(245,158,11,0.08); }
.survey-stat-card.red::before   { background: rgba(239,68,68,0.08); }
.survey-stat-card.purple::before{ background: rgba(139,92,246,0.08); }

.survey-stat-icon {
  width: 40px; height: 40px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; margin-bottom: 12px;
}
.green .survey-stat-icon  { background: rgba(16,185,129,0.15); color: #34d399; }
.blue .survey-stat-icon   { background: rgba(99,102,241,0.15); color: #a5b4fc; }
.yellow .survey-stat-icon { background: rgba(245,158,11,0.15); color: #fbbf24; }
.red .survey-stat-icon    { background: rgba(239,68,68,0.15);  color: #f87171; }
.purple .survey-stat-icon { background: rgba(139,92,246,0.15); color: #c4b5fd; }

.survey-stat-label { font-size: 12px; color: #64748b; font-weight: 600; margin: 0 0 4px; }
.survey-stat-value { font-size: 24px; font-weight: 800; color: #f1f5f9; margin: 0; }
.survey-stat-sub   { font-size: 12px; color: #475569; margin: 4px 0 0; }

/* Rating distribution bar */
.rating-dist { margin-top: 24px; }
.rating-dist-title { font-size: 13px; font-weight: 700; color: #94a3b8; margin-bottom: 12px; }
.rating-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.rating-stars { font-size: 12px; color: #fbbf24; min-width: 70px; }
.rating-bar-bg { flex: 1; height: 7px; background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden; }
.rating-bar-fill { height: 100%; background: linear-gradient(90deg, #fbbf24, #f59e0b); border-radius: 99px; transition: width 0.4s ease; }
.rating-bar-count { font-size: 12px; color: #64748b; min-width: 28px; text-align: right; }

/* Filters */
.survey-filters {
  background: #1e293b; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px; padding: 18px 20px;
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  margin-bottom: 20px;
}
.survey-search {
  position: relative; flex: 1; min-width: 200px;
}
.survey-search i {
  position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
  color: #64748b; font-size: 13px;
}
.survey-search input, .survey-select, .survey-date {
  background: #0f172a; border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; color: #e2e8f0; font-size: 13px;
  font-family: inherit; outline: none; transition: border-color 0.2s;
}
.survey-search input { width: 100%; padding: 9px 12px 9px 36px; box-sizing: border-box; }
.survey-select { padding: 9px 12px; cursor: pointer; }
.survey-date   { padding: 9px 12px; }
.survey-search input:focus, .survey-select:focus, .survey-date:focus {
  border-color: rgba(16,185,129,0.5);
}
.survey-filter-label { font-size: 12px; color: #64748b; font-weight: 600; white-space: nowrap; }

.btn-export {
  background: linear-gradient(135deg, #10b981, #059669);
  border: none; border-radius: 12px; color: #fff;
  padding: 9px 18px; font-size: 13px; font-weight: 700;
  cursor: pointer; font-family: inherit;
  display: flex; align-items: center; gap: 7px;
  transition: opacity 0.2s; white-space: nowrap;
}
.btn-export:hover { opacity: 0.88; }
.btn-export:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-clear {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; color: #94a3b8; padding: 9px 14px;
  font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
  transition: background 0.2s;
}
.btn-clear:hover { background: rgba(255,255,255,0.08); }

/* Table section */
.survey-table-section {
  background: #1e293b; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px; overflow: hidden;
}
.survey-table-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.survey-table-header h2 { margin: 0; font-size: 15px; font-weight: 700; color: #e2e8f0; display: flex; align-items: center; gap: 8px; }
.survey-table-header h2 i { color: #34d399; }
.survey-count-badge {
  background: rgba(16,185,129,0.12); color: #34d399;
  font-size: 12px; font-weight: 700; padding: 3px 10px;
  border-radius: 99px; border: 1px solid rgba(16,185,129,0.2);
}

.survey-table-wrap { overflow-x: auto; }
.survey-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.survey-table th {
  padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700;
  color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;
  background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.06);
}
.survey-table td {
  padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.04);
  color: #cbd5e1; vertical-align: middle;
}
.survey-table tbody tr:hover { background: rgba(255,255,255,0.02); }
.survey-table tbody tr:last-child td { border-bottom: none; }

.stars-display { color: #fbbf24; font-size: 14px; letter-spacing: 1px; }
.stars-num { font-size: 12px; color: #64748b; margin-left: 4px; }

.comment-cell {
  max-width: 280px; color: #94a3b8; font-size: 13px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.comment-cell.empty { color: #334155; font-style: italic; }

.customer-name { font-weight: 600; color: #e2e8f0; }
.booking-id-badge {
  background: rgba(99,102,241,0.12); color: #a5b4fc;
  padding: 3px 8px; border-radius: 7px; font-size: 12px; font-weight: 700;
  border: 1px solid rgba(99,102,241,0.2);
}
.date-cell { font-size: 13px; color: #64748b; }

/* Empty / loading / error */
.survey-state-box {
  text-align: center; padding: 56px 24px; color: #475569;
}
.survey-state-box i { font-size: 40px; margin-bottom: 14px; display: block; color: #334155; }
.survey-state-box p { margin: 0; font-size: 14px; }

.survey-loading {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; padding: 56px; color: #64748b; font-size: 14px;
}
.survey-spinner {
  width: 22px; height: 22px;
  border: 2.5px solid rgba(16,185,129,0.15);
  border-top-color: #10b981;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}

.survey-error {
  margin: 20px; background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 14px; padding: 18px 20px;
  display: flex; align-items: center; gap: 12px; color: #f87171;
}
.survey-error button {
  margin-left: auto; background: rgba(239,68,68,0.15);
  border: 1px solid rgba(239,68,68,0.3); color: #f87171;
  padding: 7px 14px; border-radius: 10px; font-size: 13px;
  font-weight: 600; cursor: pointer; font-family: inherit;
}

/* Pagination */
.survey-pagination {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 22px; border-top: 1px solid rgba(255,255,255,0.06);
  font-size: 13px; color: #64748b;
}
.pagination-btns { display: flex; gap: 6px; }
.page-btn {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: #94a3b8; padding: 6px 12px; border-radius: 9px;
  font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
  transition: all 0.15s;
}
.page-btn:hover { background: rgba(255,255,255,0.08); }
.page-btn.active { background: #10b981; border-color: #10b981; color: #fff; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Toast */
.survey-toast {
  position: fixed; top: 20px; right: 24px; z-index: 9999;
  padding: 12px 20px; border-radius: 12px; color: #fff;
  font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4);
  animation: notif-slide 0.2s ease both;
}
.survey-toast.success { background: #059669; }
.survey-toast.error   { background: #dc2626; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes notif-slide {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (max-width: 900px) {
  .survey-content { padding: 20px 16px; }
  .survey-stats-grid { grid-template-columns: repeat(2,1fr); }
  .survey-filters { flex-direction: column; align-items: stretch; }
  .survey-search { min-width: unset; }
}
`;

const PAGE_SIZE = 10;

const STAR_OPTIONS = [
  { value: "", label: "Tất cả sao" },
  { value: "5", label: "⭐⭐⭐⭐⭐ 5 sao" },
  { value: "4", label: "⭐⭐⭐⭐ 4 sao" },
  { value: "3", label: "⭐⭐⭐ 3 sao" },
  { value: "2", label: "⭐⭐ 2 sao" },
  { value: "1", label: "⭐ 1 sao" },
];

function renderStars(rating) {
  const n = Number(rating) || 0;
  return (
    <span>
      <span className="stars-display">{"★".repeat(n)}{"☆".repeat(5 - n)}</span>
      <span className="stars-num">{n}/5</span>
    </span>
  );
}

export default function SurveyDashboard() {
  const [surveys, setSurveys]   = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError]       = useState(null);
  const [toast, setToast]       = useState(null);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [search, setSearch]     = useState("");
  const [rating, setRating]     = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");

  // Pagination
  const [page, setPage]         = useState(1);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch stats ────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/surveys/stats`, { headers: getAuthHeaders() });
      setStats(res.data);
    } catch (err) {
      console.error("Stats fetch error:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Fetch survey list ──────────────────────────────────────────
  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (rating)   params.rating   = rating;
      if (search)   params.search   = search;
      if (fromDate) params.fromDate = fromDate;
      if (toDate)   params.toDate   = toDate;

      const res = await axios.get(`${API_BASE}/surveys`, {
        params,
        headers: getAuthHeaders(),
      });
      setSurveys(Array.isArray(res.data) ? res.data : res.data?.data || []);
      setPage(1);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [rating, search, fromDate, toDate]);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = css;
    document.head.appendChild(style);
    const font = document.createElement("link");
    font.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
    font.rel = "stylesheet";
    document.head.appendChild(font);
    const icons = document.createElement("link");
    icons.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    icons.rel = "stylesheet";
    document.head.appendChild(icons);
    fetchStats();
    fetchSurveys();
    return () => style.remove();
  }, []);

  // Re-fetch khi filter thay đổi (debounce search)
  useEffect(() => {
    const timer = setTimeout(() => fetchSurveys(), search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [rating, search, fromDate, toDate]);

  // ── Export ─────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await axios.get(`${API_BASE}/surveys/export`, {
        headers: getAuthHeaders(),
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      const contentDisposition = res.headers["content-disposition"] || "";
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      a.download = match ? match[1] : "survey-export.csv";
      a.click();
      URL.revokeObjectURL(url);
      showToast("Xuất dữ liệu thành công!");
    } catch (err) {
      showToast("Xuất dữ liệu thất bại!", "error");
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setRating("");
    setFromDate("");
    setToDate("");
  };

  // ── Pagination ─────────────────────────────────────────────────
  const totalPages = Math.ceil(surveys.length / PAGE_SIZE);
  const paged = surveys.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Rating distribution ────────────────────────────────────────
  const ratingDist = stats?.ratingDistribution || [];
  const maxDist = Math.max(...ratingDist.map(r => Number(r.total || r.count || 0)), 1);

  return (
    <div className="survey-page">
      <Sidebar />

      <main className="survey-content">

        {/* Header */}
        <div className="survey-eyebrow">
          <i className="fa-solid fa-star"></i> Survey
        </div>
        <h1 className="survey-title">Khảo Sát Khách Hàng</h1>
        <p className="survey-subtitle">Dữ liệu đánh giá và phản hồi sau mỗi lần sử dụng dịch vụ</p>

        {/* Stats cards */}
        <div className="survey-stats-grid">
          <div className="survey-stat-card green">
            <div className="survey-stat-icon"><i className="fa-solid fa-star"></i></div>
            <p className="survey-stat-label">Đánh giá trung bình</p>
            <p className="survey-stat-value">
              {statsLoading ? "—" : `${Number(stats?.averageRating || 0).toFixed(1)} ★`}
            </p>
            <p className="survey-stat-sub">{statsLoading ? "" : `${stats?.totalFeedbacks || 0} phản hồi`}</p>
          </div>
          <div className="survey-stat-card blue">
            <div className="survey-stat-icon"><i className="fa-solid fa-clipboard-list"></i></div>
            <p className="survey-stat-label">Tổng phản hồi</p>
            <p className="survey-stat-value">{statsLoading ? "—" : Number(stats?.totalFeedbacks || 0).toLocaleString("vi-VN")}</p>
            <p className="survey-stat-sub">kể từ khi hoạt động</p>
          </div>
          <div className="survey-stat-card yellow">
            <div className="survey-stat-icon"><i className="fa-solid fa-face-smile"></i></div>
            <p className="survey-stat-label">Tỉ lệ hài lòng</p>
            <p className="survey-stat-value">{statsLoading ? "—" : `${stats?.satisfactionRate ?? 0}%`}</p>
            <p className="survey-stat-sub">4-5 sao / tổng</p>
          </div>
          <div className="survey-stat-card red">
            <div className="survey-stat-icon"><i className="fa-solid fa-triangle-exclamation"></i></div>
            <p className="survey-stat-label">Tỉ lệ phàn nàn</p>
            <p className="survey-stat-value">{statsLoading ? "—" : `${stats?.issueRate ?? 0}%`}</p>
            <p className="survey-stat-sub">1-2 sao / tổng</p>
          </div>
          <div className="survey-stat-card purple">
            <div className="survey-stat-icon"><i className="fa-solid fa-message"></i></div>
            <p className="survey-stat-label">Có bình luận</p>
            <p className="survey-stat-value">{statsLoading ? "—" : Number(stats?.withComment || 0).toLocaleString("vi-VN")}</p>
            <p className="survey-stat-sub">trong tổng phản hồi</p>
          </div>
        </div>

        {/* Rating distribution */}
        {!statsLoading && ratingDist.length > 0 && (
          <div style={{
            background: "#1e293b", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 18, padding: "20px 22px", marginBottom: 20,
          }}>
            <p className="rating-dist-title">
              <i className="fa-solid fa-chart-bar" style={{ marginRight: 8, color: "#fbbf24" }}></i>
              Phân bố đánh giá
            </p>
            {[5, 4, 3, 2, 1].map(star => {
              const row = ratingDist.find(r => Number(r.rating) === star);
              const count = Number(row?.total || row?.count || 0);
              return (
                <div className="rating-row" key={star}>
                  <span className="rating-stars">{"★".repeat(star)}{"☆".repeat(5 - star)}</span>
                  <div className="rating-bar-bg">
                    <div className="rating-bar-fill" style={{ width: `${(count / maxDist) * 100}%` }} />
                  </div>
                  <span className="rating-bar-count">{count}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div className="survey-filters">
          <div className="survey-search">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Tìm theo tên khách hàng, bình luận..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="survey-select" value={rating} onChange={e => setRating(e.target.value)}>
            {STAR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span className="survey-filter-label">Từ:</span>
          <input className="survey-date" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <span className="survey-filter-label">Đến:</span>
          <input className="survey-date" type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          {(search || rating || fromDate || toDate) && (
            <button className="btn-clear" onClick={clearFilters}>
              <i className="fa-solid fa-xmark" style={{ marginRight: 5 }}></i>Xóa lọc
            </button>
          )}
          <button className="btn-export" onClick={handleExport} disabled={exporting}>
            <i className={`fa-solid ${exporting ? "fa-spinner fa-spin" : "fa-file-arrow-down"}`}></i>
            {exporting ? "Đang xuất..." : "Xuất CSV"}
          </button>
        </div>

        {/* Table */}
        <div className="survey-table-section">
          <div className="survey-table-header">
            <h2><i className="fa-solid fa-table-list"></i> Danh sách phản hồi</h2>
            <span className="survey-count-badge">{surveys.length} kết quả</span>
          </div>

          {error && (
            <div className="survey-error">
              <i className="fa-solid fa-circle-exclamation"></i>
              {error}
              <button onClick={fetchSurveys}>Thử lại</button>
            </div>
          )}

          {loading ? (
            <div className="survey-loading">
              <div className="survey-spinner"></div>
              Đang tải dữ liệu...
            </div>
          ) : !error && surveys.length === 0 ? (
            <div className="survey-state-box">
              <i className="fa-regular fa-face-meh"></i>
              <p>Không tìm thấy phản hồi nào{(search || rating || fromDate || toDate) ? " với bộ lọc hiện tại" : ""}</p>
            </div>
          ) : !error && (
            <>
              <div className="survey-table-wrap">
                <table className="survey-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Khách hàng</th>
                      <th>Mã đặt lịch</th>
                      <th>Đánh giá</th>
                      <th>Bình luận</th>
                      <th>Ngày</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((sv, idx) => {
                      const date = sv.createdDate || sv.CreatedDate || sv.date;
                      const name = sv.fullName || sv.FullName || sv.customerName || "Ẩn danh";
                      const bookingId = sv.bookingId || sv.BookingID || sv.bookingID;
                      const comment = sv.comment || sv.Comment || sv.content || "";
                      const ratingVal = sv.rating || sv.Rating || 0;
                      return (
                        <tr key={sv.feedbackId || sv.FeedbackID || idx}>
                          <td style={{ color: "#475569", fontWeight: 700 }}>
                            {(page - 1) * PAGE_SIZE + idx + 1}
                          </td>
                          <td className="customer-name">{name}</td>
                          <td>
                            {bookingId
                              ? <span className="booking-id-badge">BK-{bookingId}</span>
                              : <span style={{ color: "#334155" }}>—</span>}
                          </td>
                          <td>{renderStars(ratingVal)}</td>
                          <td>
                            <div className={`comment-cell ${!comment ? "empty" : ""}`}
                              title={comment}>
                              {comment || "Không có bình luận"}
                            </div>
                          </td>
                          <td className="date-cell">
                            {date ? new Date(date).toLocaleDateString("vi-VN", {
                              day: "2-digit", month: "2-digit", year: "numeric"
                            }) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="survey-pagination">
                  <span>
                    Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, surveys.length)} / {surveys.length} kết quả
                  </span>
                  <div className="pagination-btns">
                    <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                      <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const p = totalPages <= 5 ? i + 1 :
                        page <= 3 ? i + 1 :
                        page >= totalPages - 2 ? totalPages - 4 + i :
                        page - 2 + i;
                      return (
                        <button key={p} className={`page-btn ${page === p ? "active" : ""}`}
                          onClick={() => setPage(p)}>{p}</button>
                      );
                    })}
                    <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                      <i className="fa-solid fa-chevron-right"></i>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className={`survey-toast ${toast.type}`}>
          <i className={`fa-solid ${toast.type === "error" ? "fa-circle-xmark" : "fa-circle-check"}`}></i>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
