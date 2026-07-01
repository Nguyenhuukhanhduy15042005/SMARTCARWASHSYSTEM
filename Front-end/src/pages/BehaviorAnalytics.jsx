import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://127.0.0.1:5000/api/analytics/behavior";

export default function BehaviorAnalytics() {
  const [activeTab, setActiveTab] = useState("frequency"); // "frequency" | "spending" | "promotion"
  const [timeRange, setTimeRange] = useState("30d");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // Load Fonts & Icons
    const linkFont = document.createElement("link");
    linkFont.href =
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
    linkFont.rel = "stylesheet";
    document.head.appendChild(linkFont);

    const linkIcons = document.createElement("link");
    linkIcons.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    linkIcons.rel = "stylesheet";
    document.head.appendChild(linkIcons);
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, timeRange]);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const token =
        localStorage.getItem("token") || localStorage.getItem("TOKEN");
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.get(
        `${API_BASE}/${activeTab}?range=${timeRange}`,
        { headers },
      );
      setData(res.data.data || []);
    } catch (err) {
      console.error("Lỗi tải dữ liệu hành vi:", err);
      showToast("Không thể kết nối đến máy chủ phân tích.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  const getTierBadge = (tierName) => {
    const tier = tierName?.toLowerCase() || "";
    if (tier.includes("platinum"))
      return (
        <span className="ba-badge ba-tier-platinum">
          <i className="fa-solid fa-crown"></i> Platinum
        </span>
      );
    if (tier.includes("gold"))
      return (
        <span className="ba-badge ba-tier-gold">
          <i className="fa-solid fa-medal"></i> Gold
        </span>
      );
    if (tier.includes("silver"))
      return (
        <span className="ba-badge ba-tier-silver">
          <i className="fa-solid fa-star"></i> Silver
        </span>
      );
    return (
      <span className="ba-badge ba-tier-bronze">
        <i className="fa-solid fa-shield"></i> Bronze
      </span>
    );
  };

  // Local search filter
  const filteredData = data.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (item.fullName || "").toLowerCase().includes(q);
    const phoneMatch = (item.phone || "").toLowerCase().includes(q);
    return nameMatch || phoneMatch;
  });

  return (
    <div className="portal-layout-container ba-container">
      <Sidebar />
      <main className="portal-main-content">
        <header className="ba-header">
          <div className="ba-header-title">
            <div className="ba-icon-box">
              <i className="fa-solid fa-user-astronaut"></i>
            </div>
            <div>
              <h1>Phân Tích Hành Vi Khách Hàng</h1>
              <p>
                Theo dõi tần suất đặt lịch, thói quen chi tiêu và mức độ sử dụng
                ưu đãi
              </p>
            </div>
          </div>

          {/* Bộ lọc thời gian */}
          <div className="ba-range-selector">
            <label>
              <i className="fa-regular fa-calendar"></i> Thời gian:
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="7d">7 Ngày qua</option>
              <option value="30d">30 Ngày qua</option>
              <option value="90d">90 Ngày qua</option>
              <option value="month">Tháng này</option>
              <option value="year">Năm nay</option>
              <option value="all">Toàn thời gian</option>
            </select>
          </div>
        </header>

        {/* Thanh điều hướng Tabs & Tìm kiếm */}
        <section className="ba-toolbar">
          <div className="ba-tabs">
            <button
              className={`ba-tab-btn ${activeTab === "frequency" ? "active" : ""}`}
              onClick={() => setActiveTab("frequency")}
            >
              <i className="fa-solid fa-chart-line"></i> Tần Suất Đặt Lịch
            </button>
            <button
              className={`ba-tab-btn ${activeTab === "spending" ? "active" : ""}`}
              onClick={() => setActiveTab("spending")}
            >
              <i className="fa-solid fa-sack-dollar"></i> Phân Tích Chi Tiêu
            </button>
            <button
              className={`ba-tab-btn ${activeTab === "promotion" ? "active" : ""}`}
              onClick={() => setActiveTab("promotion")}
            >
              <i className="fa-solid fa-tags"></i> Sử Dụng Khuyến Mãi
            </button>
          </div>

          <div className="ba-search-box">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Tìm tên hoặc SĐT khách hàng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </section>

        {/* Bảng Dữ Liệu Động */}
        <section className="ba-table-card">
          <div className="ba-table-header">
            <h2>
              {activeTab === "frequency" && "Thống Kê Lượt Đặt Xe"}
              {activeTab === "spending" && "Báo Cáo Doanh Thu Theo Khách Hàng"}
              {activeTab === "promotion" &&
                "Chi Tiết Sử Dụng Ưu Đãi & Đổi Điểm"}
            </h2>
            <button
              className="ba-refresh-btn"
              onClick={fetchAnalyticsData}
              title="Làm mới"
            >
              <i className="fa-solid fa-rotate-right"></i>
            </button>
          </div>

          {loading ? (
            <div className="ba-loading">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <p>Đang phân tích dữ liệu...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="ba-empty">
              <i className="fa-solid fa-chart-pie"></i>
              <p>
                Không có dữ liệu trong khoảng thời gian này hoặc không tìm thấy
                khách hàng.
              </p>
            </div>
          ) : (
            <div className="ba-table-wrapper">
              <table className="ba-table">
                <thead>
                  {activeTab === "frequency" && (
                    <tr>
                      <th>Khách Hàng</th>
                      <th>Liên Hệ</th>
                      <th style={{ textAlign: "center" }}>Tổng Số Lịch</th>
                      <th style={{ textAlign: "center" }}>Hoàn Thành</th>
                      <th style={{ textAlign: "center" }}>Đã Hủy</th>
                      <th style={{ textAlign: "center" }}>Tỷ Lệ Hủy</th>
                    </tr>
                  )}
                  {activeTab === "spending" && (
                    <tr>
                      <th>Khách Hàng</th>
                      <th>Liên Hệ</th>
                      <th>Hạng Thành Viên</th>
                      <th style={{ textAlign: "center" }}>Số Đơn Đã Trả</th>
                      <th style={{ textAlign: "right" }}>Tổng Chi Tiêu</th>
                      <th style={{ textAlign: "right" }}>TB / Đơn</th>
                    </tr>
                  )}
                  {activeTab === "promotion" && (
                    <tr>
                      <th>Khách Hàng</th>
                      <th style={{ textAlign: "center" }}>Lượt Đặt</th>
                      <th style={{ textAlign: "center" }}>Dùng Voucher</th>
                      <th style={{ textAlign: "right" }}>Tiết Kiệm Được</th>
                      <th style={{ textAlign: "center" }}>Lần Đổi Điểm</th>
                      <th style={{ textAlign: "center" }}>Điểm Đã Tiêu</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {filteredData.map((row, index) => (
                    <tr key={row.userId || index}>
                      <td>
                        <strong>{row.fullName || "Khách Vãng Lai"}</strong>
                      </td>

                      {activeTab === "frequency" && (
                        <>
                          <td className="ba-text-dim">
                            <i className="fa-solid fa-phone"></i>{" "}
                            {row.phone || "N/A"}
                          </td>
                          <td
                            style={{
                              textAlign: "center",
                              fontWeight: 700,
                              fontSize: "16px",
                            }}
                          >
                            {row.totalBookings}
                          </td>
                          <td
                            style={{
                              textAlign: "center",
                              color: "#10b981",
                              fontWeight: 600,
                            }}
                          >
                            {row.completedBookings}
                          </td>
                          <td
                            style={{
                              textAlign: "center",
                              color: "#ef4444",
                              fontWeight: 600,
                            }}
                          >
                            {row.cancelledBookings}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              className={`ba-rate-badge ${row.cancelRate > 30 ? "high" : row.cancelRate > 0 ? "medium" : "low"}`}
                            >
                              {row.cancelRate}%
                            </span>
                          </td>
                        </>
                      )}

                      {activeTab === "spending" && (
                        <>
                          <td className="ba-text-dim">
                            <i className="fa-solid fa-phone"></i>{" "}
                            {row.phone || "N/A"}
                          </td>
                          <td>{getTierBadge(row.tierName)}</td>
                          <td style={{ textAlign: "center", fontWeight: 600 }}>
                            {row.paidBookingsCount}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              color: "#3b82f6",
                              fontWeight: 700,
                              fontSize: "15px",
                            }}
                          >
                            {formatMoney(row.totalSpent)}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>
                            {formatMoney(row.avgSpentPerBooking)}
                          </td>
                        </>
                      )}

                      {activeTab === "promotion" && (
                        <>
                          <td style={{ textAlign: "center", fontWeight: 600 }}>
                            {row.totalBookings}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div className="ba-progress-cell">
                              <span>{row.bookingsWithVoucher}</span>
                              <small>({row.voucherUsageRate}%)</small>
                            </div>
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              color: "#10b981",
                              fontWeight: 700,
                            }}
                          >
                            {formatMoney(row.totalDiscountAmount)}
                          </td>
                          <td style={{ textAlign: "center", fontWeight: 600 }}>
                            {row.pointsRedeemedCount}
                          </td>
                          <td
                            style={{
                              textAlign: "center",
                              color: "#f59e0b",
                              fontWeight: 700,
                            }}
                          >
                            -{row.totalPointsRedeemed} PTS
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Toast Alert */}
      {toast && (
        <div className="ba-toast">
          <i className="fa-solid fa-triangle-exclamation"></i> {toast.message}
        </div>
      )}

      {/* CSS Nhúng */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .ba-container {
          background: var(--bg-primary);
          font-family: 'Plus Jakarta Sans', sans-serif;
          min-height: 100vh;
        }
        .ba-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          padding: 32px 32px 0 32px; margin-bottom: 24px;
        }
        .ba-header-title { display: flex; align-items: center; gap: 16px; }
        .ba-icon-box {
          width: 52px; height: 52px; border-radius: 14px;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          color: white; display: grid; place-items: center; font-size: 24px;
          box-shadow: 0 8px 16px rgba(99, 102, 241, 0.25);
        }
        .ba-header-title h1 { margin: 0; font-size: 26px; color: var(--text-primary); font-weight: 800; letter-spacing: -0.5px; }
        .ba-header-title p { margin: 4px 0 0 0; font-size: 14px; color: var(--text-secondary); }
        
        .ba-range-selector {
          background: var(--bg-card); padding: 8px 16px; border-radius: 12px;
          border: 1px solid var(--border); display: flex; align-items: center; gap: 10px;
        }
        .ba-range-selector label { color: var(--text-secondary); font-size: 14px; font-weight: 600; }
        .ba-range-selector select {
          background: transparent; border: none; color: var(--text-primary);
          font-family: inherit; font-size: 15px; font-weight: 700; outline: none; cursor: pointer;
        }

        .ba-toolbar {
          padding: 0 32px; display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 24px; flex-wrap: wrap; gap: 16px;
        }
        .ba-tabs { display: flex; gap: 10px; }
        .ba-tab-btn {
          background: var(--bg-card); border: 1px solid var(--border);
          color: var(--text-secondary); padding: 12px 20px; border-radius: 12px;
          font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; gap: 8px;
        }
        .ba-tab-btn:hover { background: rgba(99, 102, 241, 0.1); color: #6366f1; border-color: rgba(99, 102, 241, 0.3); }
        .ba-tab-btn.active { background: #6366f1; color: white; border-color: #6366f1; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
        
        .ba-search-box {
          position: relative; width: 300px;
        }
        .ba-search-box i { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); }
        .ba-search-box input {
          width: 100%; height: 44px; padding: 0 16px 0 44px; border-radius: 12px;
          border: 1px solid var(--border); background: var(--bg-card);
          color: var(--text-primary); font-family: inherit; font-size: 14px; outline: none;
        }
        .ba-search-box input:focus { border-color: #6366f1; }

        .ba-table-card {
          margin: 0 32px 40px 32px; background: var(--bg-card); border-radius: 16px;
          border: 1px solid var(--border); box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden;
        }
        .ba-table-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .ba-table-header h2 { margin: 0; font-size: 18px; color: var(--text-primary); font-weight: 700; }
        .ba-refresh-btn { background: transparent; border: none; color: var(--text-secondary); font-size: 18px; cursor: pointer; transition: 0.2s; }
        .ba-refresh-btn:hover { color: #6366f1; transform: rotate(180deg); }

        .ba-table-wrapper { overflow-x: auto; width: 100%; }
        .ba-table { width: 100%; border-collapse: collapse; }
        .ba-table th { background: rgba(0,0,0,0.02); padding: 16px 24px; text-align: left; font-size: 12px; text-transform: uppercase; color: var(--text-secondary); border-bottom: 1px solid var(--border); white-space: nowrap; }
        .ba-table td { padding: 16px 24px; border-bottom: 1px solid var(--border); color: var(--text-primary); font-size: 14px; vertical-align: middle; }
        .ba-table tr:hover { background: rgba(0,0,0,0.015); }
        .ba-text-dim { color: var(--text-secondary); font-size: 13px; }

        .ba-badge { padding: 6px 12px; border-radius: 30px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
        .ba-tier-platinum { background: rgba(168, 85, 247, 0.15); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.3); }
        .ba-tier-gold { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
        .ba-tier-silver { background: rgba(156, 163, 175, 0.15); color: #9ca3af; border: 1px solid rgba(156, 163, 175, 0.3); }
        .ba-tier-bronze { background: rgba(180, 83, 9, 0.15); color: #b45309; border: 1px solid rgba(180, 83, 9, 0.3); }

        .ba-rate-badge { padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 700; }
        .ba-rate-badge.high { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .ba-rate-badge.medium { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .ba-rate-badge.low { background: rgba(16, 185, 129, 0.1); color: #10b981; }

        .ba-progress-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .ba-progress-cell span { font-weight: 700; font-size: 15px; }
        .ba-progress-cell small { color: var(--text-secondary); font-size: 12px; }

        .ba-loading, .ba-empty { text-align: center; padding: 80px 20px; color: var(--text-secondary); }
        .ba-loading i { font-size: 32px; color: #6366f1; margin-bottom: 16px; }
        .ba-empty i { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }

        .ba-toast {
          position: fixed; bottom: 24px; right: 24px; background: #ef4444; color: white;
          padding: 12px 24px; border-radius: 12px; font-weight: 600; box-shadow: 0 10px 25px rgba(239, 68, 68, 0.4);
          display: flex; align-items: center; gap: 10px; animation: slideUp 0.3s ease-out; z-index: 9999;
        }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `,
        }}
      />
    </div>
  );
}
