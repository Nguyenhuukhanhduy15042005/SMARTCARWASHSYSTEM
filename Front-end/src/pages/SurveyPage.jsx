import { useState, useEffect, useCallback } from "react";

// ─── API helpers ──────────────────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

function buildQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v !== null && v !== undefined) q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STAR_COLORS = {
  5: "#22c55e",
  4: "#84cc16",
  3: "#f59e0b",
  2: "#f97316",
  1: "#ef4444",
};

const BOOKING_STATUS = {
  1: "Chờ duyệt",
  2: "Đã xác nhận",
  3: "Đang làm dịch vụ",
  4: "Hoàn thành",
  5: "Đã hủy",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ value, max = 5, size = 16 }) {
  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
      {Array.from({ length: max }).map((_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill={i < value ? "#f59e0b" : "#d1d5db"}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statAccent, background: accent }} />
      <p style={styles.statLabel}>{label}</p>
      <p style={styles.statValue}>{value}</p>
      {sub && <p style={styles.statSub}>{sub}</p>}
    </div>
  );
}

function RatingBar({ star, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={styles.ratingBarRow}>
      <span style={styles.ratingBarLabel}>{star}★</span>
      <div style={styles.ratingBarTrack}>
        <div
          style={{
            ...styles.ratingBarFill,
            width: `${pct}%`,
            background: STAR_COLORS[star],
          }}
        />
      </div>
      <span style={styles.ratingBarCount}>{count}</span>
    </div>
  );
}

function SurveyRow({ row, onView }) {
  const statusLabel = BOOKING_STATUS[row.BookingStatus] || "—";
  const statusColor =
    row.BookingStatus === 4
      ? "#22c55e"
      : row.BookingStatus === 5
      ? "#ef4444"
      : "#6b7280";

  return (
    <tr style={styles.tr}>
      <td style={styles.td}>
        <div style={styles.customerName}>{row.CustomerName}</div>
        <div style={styles.customerMeta}>{row.PhoneNumber}</div>
        <div style={styles.customerMeta}>{row.Email}</div>
      </td>
      <td style={styles.td}>
        <StarRating value={row.Rating} size={14} />
        <span style={{ marginLeft: 4, fontSize: 13, color: "#374151" }}>
          ({row.Rating}/5)
        </span>
      </td>
      <td style={{ ...styles.td, maxWidth: 240 }}>
        <p style={styles.comment}>{row.Comment || <em style={{ color: "#9ca3af" }}>Không có nhận xét</em>}</p>
      </td>
      <td style={styles.td}>
        <div style={styles.badge}>{row.VehicleType || "—"}</div>
        <div style={styles.customerMeta}>{row.LicensePlate}</div>
      </td>
      <td style={styles.td}>
        <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>
          {row.ServiceName || "—"}
        </div>
        {row.MachineName && (
          <div style={styles.customerMeta}>🔧 {row.MachineName}</div>
        )}
      </td>
      <td style={styles.td}>
        <span style={{ ...styles.statusPill, color: statusColor, borderColor: statusColor }}>
          {statusLabel}
        </span>
      </td>
      <td style={styles.td}>
        <div style={{ fontSize: 12, color: "#374151" }}>
          {new Date(row.CreatedDate).toLocaleDateString("vi-VN")}
        </div>
        <div style={styles.customerMeta}>
          Đặt: {row.BookingDate ? new Date(row.BookingDate).toLocaleDateString("vi-VN") : "—"}
        </div>
      </td>
      <td style={styles.td}>
        <button style={styles.viewBtn} onClick={() => onView(row)}>
          Chi tiết
        </button>
      </td>
    </tr>
  );
}

function DetailModal({ row, onClose }) {
  if (!row) return null;
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>Chi tiết khảo sát #{row.FeedbackID}</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.modalBody}>
          <Section label="Khách hàng">
            <Row label="Tên" value={row.CustomerName} />
            <Row label="SĐT" value={row.PhoneNumber} />
            <Row label="Email" value={row.Email} />
          </Section>
          <Section label="Đánh giá">
            <div style={{ marginBottom: 8 }}>
              <StarRating value={row.Rating} size={22} />
              <span style={{ marginLeft: 8, fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>
                {row.Rating}/5
              </span>
            </div>
            <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, background: "#f9fafb", padding: "10px 14px", borderRadius: 8, border: "1px solid #e5e7eb" }}>
              {row.Comment || <em style={{ color: "#9ca3af" }}>Không có nhận xét</em>}
            </div>
          </Section>
          <Section label="Thông tin đặt xe">
            <Row label="Mã booking" value={`#${row.BookingID}`} />
            <Row label="Loại xe" value={row.VehicleType || "—"} />
            <Row label="Biển số" value={row.LicensePlate || "—"} />
            <Row label="Dịch vụ" value={row.ServiceName || "—"} />
            <Row label="Máy rửa" value={row.MachineName || "—"} />
            <Row
              label="Trạng thái"
              value={BOOKING_STATUS[row.BookingStatus] || "—"}
            />
            <Row label="Tổng tiền" value={`${Number(row.TotalPrice).toLocaleString("vi-VN")}₫`} />
            <Row label="Thực trả" value={`${Number(row.FinalPrice).toLocaleString("vi-VN")}₫`} />
          </Section>
          <Section label="Thời gian">
            <Row label="Ngày đặt" value={row.BookingDate ? new Date(row.BookingDate).toLocaleString("vi-VN") : "—"} />
            <Row label="Ngày phản hồi" value={row.CreatedDate ? new Date(row.CreatedDate).toLocaleString("vi-VN") : "—"} />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={styles.sectionLabel}>{label}</p>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SurveyPage() {
  const [filters, setFilters] = useState({
    rating: "",
    search: "",
    fromDate: "",
    toDate: "",
  });
  const [applied, setApplied] = useState({});
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  const fetchData = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const q = buildQuery(params);
      const json = await apiFetch(`/api/surveys${q}`);
      setData(json.data || []);
      setStats(json.stats || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData({});
  }, [fetchData]);

  function handleApply() {
    setApplied({ ...filters });
    fetchData(filters);
  }

  function handleReset() {
    const empty = { rating: "", search: "", fromDate: "", toDate: "" };
    setFilters(empty);
    setApplied({});
    fetchData({});
  }

  async function handleExport() {
    setExporting(true);
    setExportMsg("");
    try {
      const q = buildQuery(applied);
      const json = await apiFetch(`/api/surveys/export${q}`);
      const rows = json.data || [];
      if (!rows.length) {
        setExportMsg("Không có dữ liệu để xuất.");
        return;
      }
      const headers = [
        "ID", "Khách hàng", "SĐT", "Email",
        "Đánh giá", "Nhận xét",
        "Loại xe", "Biển số", "Dịch vụ", "Máy rửa",
        "Trạng thái", "Tổng tiền", "Thực trả",
        "Ngày đặt", "Ngày phản hồi",
      ];
      const csvRows = [
        headers.join(","),
        ...rows.map((r) =>
          [
            r.FeedbackID,
            `"${r.CustomerName}"`,
            r.PhoneNumber,
            r.Email,
            r.Rating,
            `"${(r.Comment || "").replace(/"/g, '""')}"`,
            r.VehicleType,
            r.LicensePlate,
            `"${(r.ServiceName || "").replace(/"/g, '""')}"`,
            `"${(r.MachineName || "").replace(/"/g, '""')}"`,
            BOOKING_STATUS[r.BookingStatus] || r.BookingStatus,
            r.TotalPrice,
            r.FinalPrice,
            r.BookingDate ? new Date(r.BookingDate).toLocaleDateString("vi-VN") : "",
            r.CreatedDate ? new Date(r.CreatedDate).toLocaleDateString("vi-VN") : "",
          ].join(",")
        ),
      ].join("\n");

      const bom = "\uFEFF";
      const blob = new Blob([bom + csvRows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `khaosat_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg(`✓ Đã xuất ${rows.length} khảo sát.`);
    } catch (e) {
      setExportMsg("Lỗi khi xuất dữ liệu.");
    } finally {
      setExporting(false);
    }
  }

  const total = stats ? Number(stats.TotalFeedback || stats.TotalSurvey || 0) : 0;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Khảo sát khách hàng</h1>
          <p style={styles.pageDesc}>Thu thập & phân tích phản hồi từ khách hàng sau dịch vụ</p>
        </div>
        <button
          style={{ ...styles.exportBtn, opacity: exporting ? 0.7 : 1 }}
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? "Đang xuất…" : "⬇ Xuất CSV"}
        </button>
      </div>
      {exportMsg && <p style={styles.exportMsg}>{exportMsg}</p>}

      {/* Stats cards */}
      {stats && (
        <div style={styles.statsGrid}>
          <StatCard
            label="Tổng phản hồi"
            value={total.toLocaleString("vi-VN")}
            accent="#6366f1"
          />
          <StatCard
            label="Điểm TB"
            value={
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <StarRating value={Math.round(Number(stats.AverageRating))} size={18} />
                <strong>{Number(stats.AverageRating).toFixed(2)}</strong>
              </span>
            }
            accent="#f59e0b"
          />
          <StatCard
            label="Hài lòng (≥4★)"
            value={`${Number(stats.SatisfactionRate).toFixed(1)}%`}
            sub={`${stats.SatisfiedCount} lượt`}
            accent="#22c55e"
          />
          <StatCard
            label="Cần cải thiện (≤2★)"
            value={`${Number(stats.IssueRate).toFixed(1)}%`}
            sub={`${stats.IssueCount} lượt`}
            accent="#ef4444"
          />
        </div>
      )}

      {/* Rating distribution */}
      {stats && total > 0 && (
        <div style={styles.ratingDistCard}>
          <p style={styles.cardTitle}>Phân bố đánh giá</p>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 240px" }}>
              {[5, 4, 3, 2, 1].map((s) => (
                <RatingBar
                  key={s}
                  star={s}
                  count={Number(stats[`${["", "One", "Two", "Three", "Four", "Five"][s]}Star`] || 0)}
                  total={total}
                />
              ))}
            </div>
            <div style={styles.avgCircle}>
              <span style={styles.avgBig}>{Number(stats.AverageRating).toFixed(1)}</span>
              <StarRating value={Math.round(Number(stats.AverageRating))} size={20} />
              <span style={styles.avgSub}>{total} đánh giá</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={styles.filterCard}>
        <p style={styles.cardTitle}>Bộ lọc</p>
        <div style={styles.filterRow}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Tìm kiếm</label>
            <input
              style={styles.input}
              placeholder="Tên, SĐT, email, biển số, dịch vụ…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
            />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Đánh giá</label>
            <select
              style={styles.select}
              value={filters.rating}
              onChange={(e) => setFilters((f) => ({ ...f, rating: e.target.value }))}
            >
              <option value="">Tất cả</option>
              {[5, 4, 3, 2, 1].map((s) => (
                <option key={s} value={s}>{s} sao</option>
              ))}
            </select>
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Từ ngày</label>
            <input
              type="date"
              style={styles.input}
              value={filters.fromDate}
              onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
            />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Đến ngày</label>
            <input
              type="date"
              style={styles.input}
              value={filters.toDate}
              onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
            />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <button style={styles.primaryBtn} onClick={handleApply}>
              Tìm kiếm
            </button>
            <button style={styles.ghostBtn} onClick={handleReset}>
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <p style={styles.cardTitle}>
            Danh sách phản hồi{" "}
            <span style={styles.countBadge}>{data.length}</span>
          </p>
        </div>

        {error && <div style={styles.errorBox}>⚠ {error}</div>}

        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <span style={{ marginLeft: 10, color: "#6b7280" }}>Đang tải…</span>
          </div>
        ) : data.length === 0 ? (
          <div style={styles.emptyBox}>
            <span style={{ fontSize: 40 }}>📋</span>
            <p style={{ marginTop: 8, color: "#6b7280" }}>Không có dữ liệu khảo sát</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["Khách hàng", "Đánh giá", "Nhận xét", "Xe", "Dịch vụ", "Trạng thái", "Ngày", ""].map(
                    (h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <SurveyRow key={row.FeedbackID} row={row} onView={setSelected} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <DetailModal row={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: {
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: "24px 28px",
    background: "#f3f4f6",
    minHeight: "100vh",
    color: "#111827",
  },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  pageTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: "#111827",
  },
  pageDesc: {
    margin: "4px 0 0",
    fontSize: 14,
    color: "#6b7280",
  },
  exportBtn: {
    padding: "9px 18px",
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  exportMsg: {
    margin: "0 0 14px",
    fontSize: 13,
    color: "#374151",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    padding: "8px 14px",
    borderRadius: 8,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 16,
  },
  statCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "16px 18px",
    boxShadow: "0 1px 3px rgba(0,0,0,.08)",
    position: "relative",
    overflow: "hidden",
  },
  statAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: "12px 12px 0 0",
  },
  statLabel: {
    margin: "0 0 6px",
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  statValue: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: "#111827",
  },
  statSub: {
    margin: "4px 0 0",
    fontSize: 12,
    color: "#9ca3af",
  },
  ratingDistCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "18px 20px",
    boxShadow: "0 1px 3px rgba(0,0,0,.08)",
    marginBottom: 16,
  },
  ratingBarRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  ratingBarLabel: {
    width: 28,
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    textAlign: "right",
  },
  ratingBarTrack: {
    flex: 1,
    height: 10,
    background: "#e5e7eb",
    borderRadius: 99,
    overflow: "hidden",
  },
  ratingBarFill: {
    height: "100%",
    borderRadius: 99,
    transition: "width .4s ease",
  },
  ratingBarCount: {
    width: 28,
    fontSize: 12,
    color: "#6b7280",
    textAlign: "right",
  },
  avgCircle: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    background: "#fafafa",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "16px 28px",
  },
  avgBig: {
    fontSize: 40,
    fontWeight: 800,
    color: "#f59e0b",
    lineHeight: 1,
  },
  avgSub: {
    fontSize: 12,
    color: "#9ca3af",
  },
  filterCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "16px 20px",
    boxShadow: "0 1px 3px rgba(0,0,0,.08)",
    marginBottom: 16,
  },
  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "flex-end",
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: "1 1 160px",
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
  },
  input: {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    color: "#111827",
    background: "#fff",
  },
  select: {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    color: "#111827",
    background: "#fff",
    cursor: "pointer",
  },
  primaryBtn: {
    padding: "8px 18px",
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  ghostBtn: {
    padding: "8px 14px",
    background: "transparent",
    color: "#6b7280",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    cursor: "pointer",
  },
  tableCard: {
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,.08)",
    overflow: "hidden",
  },
  tableHeader: {
    padding: "16px 20px 0",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    margin: "0 0 12px",
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  countBadge: {
    background: "#e0e7ff",
    color: "#4338ca",
    fontSize: 12,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 99,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },
  th: {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: 600,
    color: "#6b7280",
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #f3f4f6",
  },
  td: {
    padding: "12px 14px",
    verticalAlign: "top",
  },
  customerName: {
    fontWeight: 600,
    color: "#111827",
    fontSize: 14,
  },
  customerMeta: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  comment: {
    margin: 0,
    fontSize: 13,
    color: "#374151",
    lineHeight: 1.5,
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  badge: {
    display: "inline-block",
    padding: "2px 8px",
    background: "#f3f4f6",
    borderRadius: 99,
    fontSize: 12,
    color: "#374151",
    fontWeight: 500,
  },
  statusPill: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 99,
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid",
    whiteSpace: "nowrap",
  },
  viewBtn: {
    padding: "5px 12px",
    background: "#eff6ff",
    color: "#3b82f6",
    border: "1px solid #bfdbfe",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 500,
  },
  errorBox: {
    margin: "16px 20px",
    padding: "12px 16px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#ef4444",
    borderRadius: 8,
    fontSize: 14,
  },
  loadingBox: {
    padding: 48,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  spinner: {
    width: 24,
    height: 24,
    border: "3px solid #e5e7eb",
    borderTopColor: "#6366f1",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  emptyBox: {
    padding: 48,
    textAlign: "center",
    color: "#9ca3af",
  },
  // Modal
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.45)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    background: "#fff",
    borderRadius: 14,
    width: "100%",
    maxWidth: 520,
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0,0,0,.25)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #e5e7eb",
    position: "sticky",
    top: 0,
    background: "#fff",
    zIndex: 1,
  },
  modalTitle: {
    fontWeight: 700,
    fontSize: 16,
    color: "#111827",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 18,
    color: "#9ca3af",
    cursor: "pointer",
    padding: "2px 6px",
    borderRadius: 6,
  },
  modalBody: {
    padding: "16px 20px",
  },
  sectionLabel: {
    margin: "0 0 8px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "#9ca3af",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "7px 0",
    borderBottom: "1px solid #f3f4f6",
    fontSize: 14,
  },
  detailLabel: {
    color: "#6b7280",
    fontWeight: 500,
  },
  detailValue: {
    color: "#111827",
    fontWeight: 500,
    textAlign: "right",
    maxWidth: "60%",
  },
};

// Spinner keyframe (injected once)
if (typeof document !== "undefined" && !document.getElementById("survey-spin")) {
  const s = document.createElement("style");
  s.id = "survey-spin";
  s.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(s);
}

