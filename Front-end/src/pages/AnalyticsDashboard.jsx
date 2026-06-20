// ============================================================
// AnalyticsDashboard.jsx - Trọng thêm mới (Sprint Analytics)
// Trang thống kê tổng quan dành cho Admin:
//   - Gọi API của Thái: GET /api/analytics/dashboard
//   - Hiển thị biểu đồ doanh thu, booking, điểm loyalty, v.v.
//   - Dùng thư viện Recharts để vẽ biểu đồ
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "./AnalyticsDashboard.css";
import {
  LineChart, Line,       // Biểu đồ đường (doanh thu, loyalty)
  BarChart, Bar,         // Biểu đồ cột (booking, top dịch vụ)
  PieChart, Pie, Cell,   // Biểu đồ tròn (trạng thái, loại xe)
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";

// Địa chỉ API analytics do Thái xây dựng ở Back-end/routes/analytics.js
const API_BASE = "http://127.0.0.1:5000/api/analytics";

// Danh sách lựa chọn khoảng thời gian lọc dữ liệu
const RANGE_OPTIONS = [
  { value: "7d",    label: "7 ngày qua" },
  { value: "30d",   label: "30 ngày qua" },
  { value: "90d",   label: "90 ngày qua" },
  { value: "month", label: "Tháng này" },
  { value: "year",  label: "Năm này" },
  { value: "all",   label: "Tất cả" },
];

// Danh sách lựa chọn cách nhóm dữ liệu (theo ngày hoặc tháng)
const GROUP_OPTIONS = [
  { value: "day",   label: "Theo ngày" },
  { value: "month", label: "Theo tháng" },
];

// Bảng màu dùng cho biểu đồ tròn (Pie chart)
const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

// ─── Component tooltip tùy chỉnh cho biểu đồ ─────────────────
// Hiện popup khi hover vào điểm dữ liệu trên chart
function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="value" style={{ color: p.color }}>
          {/* Nếu có hàm formatter thì định dạng giá trị (VD: số tiền → VNĐ) */}
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

// ─── Hàm định dạng hiển thị ───────────────────────────────────
const fmtVND = (v) => Number(v || 0).toLocaleString("vi-VN") + " đ"; // Format tiền VNĐ
const fmtNum = (v) => Number(v || 0).toLocaleString("vi-VN");         // Format số nguyên

// ─── Component thẻ tóm tắt (Summary Card) ─────────────────────
// Hiện 4 thẻ tổng quan: tổng booking, doanh thu, đánh giá, điểm tích lũy
function SummaryCard({ icon, label, value, sub, color }) {
  return (
    <div className={`analytics-card ${color}`}>
      <div className="analytics-card-header">
        <span className="analytics-card-label">{label}</span>
        <div className="analytics-card-icon">{icon}</div>
      </div>
      <div className="analytics-card-value">{value}</div>
      {/* Dòng phụ bên dưới giá trị chính (VD: số đã hoàn thành / đã hủy) */}
      {sub && <div className="analytics-card-sub">{sub}</div>}
    </div>
  );
}

// ─── Component chính: AnalyticsDashboard ──────────────────────
// Trọng thêm mới - Trang Analytics chỉ dành cho Admin
export default function AnalyticsDashboard() {
  const [data, setData]       = useState(null);    // Dữ liệu trả về từ API
  const [loading, setLoading] = useState(true);    // Đang tải hay không
  const [error, setError]     = useState(null);    // Lỗi nếu có
  const [range, setRange]     = useState("30d");   // Khoảng thời gian lọc (mặc định 30 ngày)
  const [groupBy, setGroupBy] = useState("day");   // Nhóm theo ngày hay tháng

  // ─── Hàm gọi API lấy dữ liệu analytics ───────────────────
  // useCallback để tránh tạo lại hàm khi re-render (chỉ tạo lại khi range/groupBy thay đổi)
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Lấy token đăng nhập để xác thực với server
      const token = localStorage.getItem("token") || localStorage.getItem("TOKEN") || "";
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Gọi API analytics dashboard của Thái (Back-end/routes/analytics.js)
      // Truyền tham số range và groupBy để lọc dữ liệu
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
  }, [range, groupBy]); // Tự động gọi lại khi thay đổi bộ lọc

  // ─── Khởi tạo: load font, icon và gọi API lần đầu ────────
  useEffect(() => {
    // Nạp font chữ từ Google Fonts
    const linkFont = document.createElement("link");
    linkFont.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
    linkFont.rel = "stylesheet";
    document.head.appendChild(linkFont);

    // Nạp icon FontAwesome
    const linkIcons = document.createElement("link");
    linkIcons.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    linkIcons.rel = "stylesheet";
    document.head.appendChild(linkIcons);

    fetchData(); // Gọi API lần đầu khi component mount
  }, [fetchData]);

  // Shortcut để truy cập phần summary trong data trả về
  const s = data?.summary || {};

  return (
    <div className="analytics-page">
      <Sidebar />
      <main className="analytics-content">

        {/* ── Phần đầu trang: tiêu đề + bộ lọc thời gian ── */}
        <div className="analytics-header">
          <div className="analytics-title-block">
            <h1>📊 Analytics Dashboard</h1>
            <p>Thống kê tổng quan hệ thống rửa xe</p>
          </div>
          <div className="analytics-filters">
            {/* Dropdown chọn khoảng thời gian (7d / 30d / 90d / tháng / năm / tất cả) */}
            <select
              className="analytics-select"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              {RANGE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Dropdown chọn cách nhóm dữ liệu (theo ngày hoặc theo tháng) */}
            <select
              className="analytics-select"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
            >
              {GROUP_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Nút làm mới dữ liệu thủ công */}
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

        {/* ── Trạng thái đang tải ── */}
        {loading && (
          <div className="analytics-loading">
            <div className="analytics-spinner" />
            <span>Đang tải dữ liệu analytics...</span>
          </div>
        )}

        {/* ── Trạng thái lỗi (VD: server chưa bật, API 404...) ── */}
        {!loading && error && (
          <div className="analytics-error">
            <div className="analytics-error-icon">⚠️</div>
            <span>{error}</span>
            <button className="analytics-retry-btn" onClick={fetchData}>
              Thử lại
            </button>
          </div>
        )}

        {/* ── Hiển thị dữ liệu khi tải thành công ── */}
        {!loading && !error && data && (
          <>
            {/* ① 4 Thẻ tóm tắt tổng quan (Summary Cards) */}
            <div className="analytics-summary-grid">
              {/* Tổng số lượng booking trong khoảng thời gian */}
              <SummaryCard
                icon="📋" color="blue" label="Tổng Booking"
                value={fmtNum(s.totalBookings)}
                sub={`Hoàn thành: ${fmtNum(s.completedBookings)} | Hủy: ${fmtNum(s.cancelledBookings)}`}
              />
              {/* Tổng doanh thu từ các lần thanh toán */}
              <SummaryCard
                icon="💰" color="green" label="Doanh Thu"
                value={Number(s.totalRevenue || 0).toLocaleString("vi-VN") + " đ"}
                sub={`Từ ${data.meta?.range || range}`}
              />
              {/* Điểm đánh giá trung bình từ feedback khách hàng */}
              <SummaryCard
                icon="⭐" color="yellow" label="Đánh Giá TB"
                value={`${s.averageRating || 0} / 5`}
                sub={`${fmtNum(s.totalFeedbacks)} đánh giá`}
              />
              {/* Tổng điểm loyalty khách hàng đã tích lũy */}
              <SummaryCard
                icon="🎯" color="purple" label="Điểm Tích Lũy"
                value={fmtNum(s.pointsEarned)}
                sub={`Đã đổi: ${fmtNum(s.pointsRedeemed)} PTS`}
              />
            </div>

            {/* ② Biểu đồ xu hướng: Doanh thu (Line) + Số booking (Bar) */}
            <div className="analytics-grid-2">
              {/* Biểu đồ đường - xu hướng doanh thu theo ngày/tháng */}
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
                      {/* Trục Y hiển thị đơn vị nghìn đồng (VD: 500k) */}
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

              {/* Biểu đồ cột - số lượng booking theo ngày/tháng */}
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

            {/* ③ Biểu đồ tròn: Trạng thái booking + Loại xe */}
            <div className="analytics-grid-2">
              {/* Pie chart - phân bố trạng thái booking (Chờ duyệt / Hoàn thành / Hủy...) */}
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
                        outerRadius={80} innerRadius={40} // Donut chart (có lỗ ở giữa)
                        paddingAngle={3}
                      >
                        {/* Mỗi phần được tô màu theo PIE_COLORS */}
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

              {/* Pie chart - tỷ lệ xe máy vs ô tô */}
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

            {/* ④ Biểu đồ cột ngang - Top 10 dịch vụ được đặt nhiều nhất */}
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
                    layout="vertical" // Cột nằm ngang để hiện tên dịch vụ dễ đọc
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

            {/* ⑤ Biểu đồ đường - điểm loyalty tích lũy và điểm đã đổi theo ngày/tháng */}
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
                    {/* Đường xanh = điểm tích lũy, đường vàng đứt đoạn = điểm đã đổi */}
                    <Line type="monotone" dataKey="pointsEarned"   name="Tích lũy" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="pointsRedeemed" name="Đổi điểm" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <div className="analytics-empty">Không có dữ liệu</div>}
            </div>

            {/* ⑥ Bảng voucher + Đánh giá feedback */}
            <div className="analytics-grid-2">
              {/* Bảng top voucher được dùng nhiều nhất */}
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

              {/* Phần đánh giá: thanh phân bố sao + 5 feedback mới nhất */}
              <div className="analytics-section">
                <div className="analytics-section-header">
                  <div className="analytics-section-title">
                    <span>⭐</span> Đánh giá khách hàng
                  </div>
                </div>

                {/* Thanh ngang phân bố số lượng từng mức sao (5→1) */}
                {data.feedback?.ratingDistribution?.length > 0 && (() => {
                  // Tìm giá trị lớn nhất để tính % chiều dài thanh
                  const maxVal = Math.max(...data.feedback.ratingDistribution.map(r => r.total), 1);
                  return [5, 4, 3, 2, 1].map((star) => {
                    const row = data.feedback.ratingDistribution.find(r => r.rating === star);
                    const count = row?.total || 0;
                    return (
                      <div className="rating-row" key={star}>
                        <div className="rating-label">{"⭐".repeat(star)}</div>
                        <div className="rating-bar-wrap">
                          {/* Chiều dài thanh = (số lượng / max) * 100% */}
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

                {/* Danh sách các feedback mới nhất từ khách hàng (hỗ trợ cuộn) */}
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

                {/* Thông báo khi không có dữ liệu feedback */}
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
