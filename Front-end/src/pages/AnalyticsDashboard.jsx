import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "./AnalyticsDashboard.css";
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";

const API_BASE = "http://127.0.0.1:5000/api/analytics";

const RANGE_OPTIONS = [
  { value: "7d",    label: "7 ngày qua" },
  { value: "30d",   label: "30 ngày qua" },
  { value: "90d",   label: "90 ngày qua" },
  { value: "month", label: "Tháng này" },
  { value: "year",  label: "Năm này" },
  { value: "all",   label: "Tất cả" },
];

const GROUP_OPTIONS = [
  { value: "day",   label: "Theo ngày" },
  { value: "month", label: "Theo tháng" },
];

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

// ─── Custom Tooltip ────────────────────────────────────────
function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="value" style={{ color: p.color }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

// ─── Format helpers ────────────────────────────────────────
const fmtVND = (v) => Number(v || 0).toLocaleString("vi-VN") + " đ";
const fmtNum = (v) => Number(v || 0).toLocaleString("vi-VN");

// ─── Summary Card ──────────────────────────────────────────
function SummaryCard({ icon, label, value, sub, color }) {
  return (
    <div className={`analytics-card ${color}`}>
      <div className="analytics-card-header">
        <span className="analytics-card-label">{label}</span>
        <div className="analytics-card-icon">{icon}</div>
      </div>
      <div className="analytics-card-value">{value}</div>
      {sub && <div className="analytics-card-sub">{sub}</div>}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [range, setRange]     = useState("30d");
  const [groupBy, setGroupBy] = useState("day");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("TOKEN") || "";
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_BASE}/dashboard`, {
        params: { range, groupBy },
        headers,
      });
      setData(res.data);
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError(err.response?.data?.message || err.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [range, groupBy]);

  useEffect(() => {
    // Load fonts & icons
    const linkFont = document.createElement("link");
    linkFont.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
    linkFont.rel = "stylesheet";
    document.head.appendChild(linkFont);

    const linkIcons = document.createElement("link");
    linkIcons.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    linkIcons.rel = "stylesheet";
    document.head.appendChild(linkIcons);

    fetchData();
  }, [fetchData]);

  const s = data?.summary || {};

  // ── Booking status map
  const statusMap = {
    1: "Chờ duyệt", 2: "Đã xác nhận",
    3: "Đang làm",  4: "Hoàn thành", 5: "Đã hủy"
  };

  return (
    <div className="analytics-page">
      <Sidebar />
      <main className="analytics-content">

        {/* ── Header ── */}
        <div className="analytics-header">
          <div className="analytics-title-block">
            <h1>📊 Analytics Dashboard</h1>
            <p>Thống kê tổng quan hệ thống rửa xe</p>
          </div>
          <div className="analytics-filters">
            <select
              className="analytics-select"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              {RANGE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              className="analytics-select"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
            >
              {GROUP_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              className="analytics-refresh-btn"
              onClick={fetchData}
              disabled={loading}
            >
              <i className={`fa-solid fa-rotate-right ${loading ? "fa-spin" : ""}`}></i>
              {loading ? "Đang tải..." : "Làm mới"}
            </button>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="analytics-loading">
            <div className="analytics-spinner" />
            <span>Đang tải dữ liệu analytics...</span>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="analytics-error">
            <div className="analytics-error-icon">⚠️</div>
            <span>{error}</span>
            <button className="analytics-retry-btn" onClick={fetchData}>
              Thử lại
            </button>
          </div>
        )}

        {/* ── Data ── */}
        {!loading && !error && data && (
          <>
            {/* ① Summary Cards */}
            <div className="analytics-summary-grid">
              <SummaryCard
                icon="📋" color="blue" label="Tổng Booking"
                value={fmtNum(s.totalBookings)}
                sub={`Hoàn thành: ${fmtNum(s.completedBookings)} | Hủy: ${fmtNum(s.cancelledBookings)}`}
              />
              <SummaryCard
                icon="💰" color="green" label="Doanh Thu"
                value={Number(s.totalRevenue || 0).toLocaleString("vi-VN") + " đ"}
                sub={`Từ ${data.meta?.range || range}`}
              />
              <SummaryCard
                icon="⭐" color="yellow" label="Đánh Giá TB"
                value={`${s.averageRating || 0} / 5`}
                sub={`${fmtNum(s.totalFeedbacks)} đánh giá`}
              />
              <SummaryCard
                icon="🎯" color="purple" label="Điểm Tích Lũy"
                value={fmtNum(s.pointsEarned)}
                sub={`Đã đổi: ${fmtNum(s.pointsRedeemed)} PTS`}
              />
            </div>

            {/* ② Revenue Trend + Booking Trend */}
            <div className="analytics-grid-2">
              {/* Doanh thu */}
              <div className="analytics-section">
                <div className="analytics-section-header">
                  <div className="analytics-section-title">
                    <span>💰</span> Xu hướng doanh thu
                  </div>
                </div>
                {data.revenueTrend?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data.revenueTrend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="period" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={v => (v / 1000).toFixed(0) + "k"} />
                      <Tooltip content={<ChartTooltip formatter={fmtVND} />} />
                      <Line
                        type="monotone" dataKey="revenue" name="Doanh thu"
                        stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="analytics-empty">Không có dữ liệu</div>}
              </div>

              {/* Số booking */}
              <div className="analytics-section">
                <div className="analytics-section-header">
                  <div className="analytics-section-title">
                    <span>📋</span> Xu hướng booking
                  </div>
                </div>
                {data.bookingTrend?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.bookingTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="period" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="bookingCount" name="Số booking" fill="#3b82f6" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="analytics-empty">Không có dữ liệu</div>}
              </div>
            </div>

            {/* ③ Booking Status + Vehicle Type */}
            <div className="analytics-grid-2">
              {/* Trạng thái booking - Pie */}
              <div className="analytics-section">
                <div className="analytics-section-header">
                  <div className="analytics-section-title">
                    <span>🔵</span> Phân bố trạng thái booking
                  </div>
                </div>
                {data.bookingStatus?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.bookingStatus}
                        dataKey="total"
                        nameKey="status"
                        cx="50%" cy="50%"
                        outerRadius={80} innerRadius={40}
                        paddingAngle={3}
                      >
                        {data.bookingStatus.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [fmtNum(v), n]} />
                      <Legend
                        formatter={(value) => <span style={{ color: "var(--text-secondary, #9ca3af)", fontSize: 12 }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="analytics-empty">Không có dữ liệu</div>}
              </div>

              {/* Loại xe - Pie */}
              <div className="analytics-section">
                <div className="analytics-section-header">
                  <div className="analytics-section-title">
                    <span>🚗</span> Loại xe
                  </div>
                </div>
                {data.vehicleTypeUsage?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.vehicleTypeUsage}
                        dataKey="total"
                        nameKey="vehicleType"
                        cx="50%" cy="50%"
                        outerRadius={80} innerRadius={40}
                        paddingAngle={3}
                      >
                        {data.vehicleTypeUsage.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [fmtNum(v), n]} />
                      <Legend
                        formatter={(value) => <span style={{ color: "var(--text-secondary, #9ca3af)", fontSize: 12 }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="analytics-empty">Không có dữ liệu</div>}
              </div>
            </div>

            {/* ④ Top Services */}
            <div className="analytics-section">
              <div className="analytics-section-header">
                <div className="analytics-section-title">
                  <span>🏆</span> Top dịch vụ phổ biến
                </div>
              </div>
              {data.serviceUsage?.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={data.serviceUsage}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 120, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis
                      type="category" dataKey="serviceName"
                      tick={{ fill: "#9ca3af", fontSize: 12 }} width={115}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="usageCount" name="Lượt dùng" fill="#8b5cf6" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="analytics-empty">Không có dữ liệu</div>}
            </div>

            {/* ⑤ Loyalty Usage */}
            <div className="analytics-section">
              <div className="analytics-section-header">
                <div className="analytics-section-title">
                  <span>🎯</span> Điểm tích lũy & đổi điểm
                </div>
              </div>
              {data.loyaltyUsage?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.loyaltyUsage} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="period" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      formatter={(value) => <span style={{ color: "var(--text-secondary, #9ca3af)", fontSize: 12 }}>{value}</span>}
                    />
                    <Line type="monotone" dataKey="pointsEarned"    name="Tích lũy" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="pointsRedeemed"  name="Đổi điểm" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <div className="analytics-empty">Không có dữ liệu</div>}
            </div>

            {/* ⑥ Voucher Table + Feedback */}
            <div className="analytics-grid-2">
              {/* Voucher */}
              <div className="analytics-section">
                <div className="analytics-section-header">
                  <div className="analytics-section-title">
                    <span>🎟️</span> Top voucher được dùng
                  </div>
                </div>
                {data.promotionUsage?.length > 0 ? (
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Tên voucher</th>
                        <th>Giảm</th>
                        <th>Đã dùng</th>
                        <th>Còn lại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.promotionUsage.map((v) => (
                        <tr key={v.promotionId}>
                          <td>{v.promoName}</td>
                          <td>
                            <span className="analytics-badge" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                              -{v.discountPercent}%
                            </span>
                          </td>
                          <td style={{ color: "#3b82f6", fontWeight: 600 }}>{fmtNum(v.usedCount)}</td>
                          <td style={{ color: "#9ca3af" }}>{fmtNum(v.unusedCount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <div className="analytics-empty">Không có dữ liệu</div>}
              </div>

              {/* Feedback */}
              <div className="analytics-section">
                <div className="analytics-section-header">
                  <div className="analytics-section-title">
                    <span>⭐</span> Đánh giá khách hàng
                  </div>
                </div>

                {/* Rating distribution */}
                {data.feedback?.ratingDistribution?.length > 0 && (() => {
                  const maxVal = Math.max(...data.feedback.ratingDistribution.map(r => r.total), 1);
                  return [5, 4, 3, 2, 1].map((star) => {
                    const row = data.feedback.ratingDistribution.find(r => r.rating === star);
                    const count = row?.total || 0;
                    return (
                      <div className="rating-row" key={star}>
                        <div className="rating-label">{"⭐".repeat(star)}</div>
                        <div className="rating-bar-wrap">
                          <div
                            className="rating-bar-fill"
                            style={{ width: `${(count / maxVal) * 100}%` }}
                          />
                        </div>
                        <div className="rating-count">{count}</div>
                      </div>
                    );
                  });
                })()}

                {/* Latest feedback */}
                {data.feedback?.latest?.length > 0 && (
                  <div className="feedback-list">
                    {data.feedback.latest.map((fb) => (
                      <div className="feedback-item" key={fb.feedbackId}>
                        <div className="feedback-item-header">
                          <span className="feedback-name">{fb.fullName}</span>
                          <span className="feedback-stars">{"⭐".repeat(fb.rating)}</span>
                        </div>
                        {fb.comment && <div className="feedback-comment">"{fb.comment}"</div>}
                        <div className="feedback-date">
                          {fb.createdDate ? new Date(fb.createdDate).toLocaleDateString("vi-VN") : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!data.feedback?.ratingDistribution?.length && !data.feedback?.latest?.length && (
                  <div className="analytics-empty">Không có đánh giá</div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
