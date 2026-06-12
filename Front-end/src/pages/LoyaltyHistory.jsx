import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://127.0.0.1:5000/api";

export default function LoyaltyHistory() {
  const [profile, setProfile] = useState({
    UserID: 12,
    FullName: "Khách hàng",
    PhoneNumber: "",
    Email: "",
    CurrentPoints: 0,
    AccumulatedPoints: 0,
    TierName: "Bronze",
    DiscountRate: 0,
  });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // All, Completed, Pending
  const [toast, setToast] = useState(null);

  // Helper to decode token safely to get customer ID
  const getCustomerId = () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("TOKEN");
    if (
      token &&
      token !== "mock-token" &&
      token !== "null" &&
      token !== "undefined"
    ) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.id || payload.userId || 12;
      } catch (err) {
        console.warn("Failed to decode token, using fallback ID 12.", err);
      }
    }
    return 12;
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    // Dynamic fonts & icons injection
    const font = document.createElement("link");
    font.href =
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap";
    font.rel = "stylesheet";
    document.head.appendChild(font);

    const icons = document.createElement("link");
    icons.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    icons.rel = "stylesheet";
    document.head.appendChild(icons);

    const style = document.createElement("style");
    style.innerHTML = loyaltyCss;
    document.head.appendChild(style);

    fetchData();

    return () => style.remove();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const userId = getCustomerId();
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("TOKEN") ||
      "mock-token";
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // 1. Fetch Profile info (points, current tier)
      const profileRes = await axios.get(
        `${API_BASE}/users/profile?userId=${userId}`,
        { headers },
      );
      if (profileRes.data) {
        setProfile({
          UserID:
            profileRes.data.UserID !== undefined
              ? profileRes.data.UserID
              : profileRes.data.userId || userId,
          FullName:
            profileRes.data.FullName ||
            profileRes.data.fullName ||
            "Khách hàng",
          PhoneNumber:
            profileRes.data.PhoneNumber || profileRes.data.phoneNumber || "",
          Email: profileRes.data.Email || profileRes.data.email || "",
          CurrentPoints: Number(
            profileRes.data.CurrentPoints ?? profileRes.data.currentPoints ?? 0,
          ),
          AccumulatedPoints: Number(
            profileRes.data.AccumulatedPoints ??
              profileRes.data.accumulatedPoints ??
              0,
          ),
          TierName:
            profileRes.data.TierName || profileRes.data.tierName || "Bronze",
          DiscountRate: Number(
            profileRes.data.DiscountRate ?? profileRes.data.discountRate ?? 0,
          ),
        });
      }

      // 2. Fetch bookings list
      const bookingsRes = await axios.get(
        `${API_BASE}/bookings?customerId=${userId}`,
        { headers },
      );
      const list = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
      // Trọng thêm: Chuẩn hóa dữ liệu trả về từ DB (hỗ trợ cả chữ hoa/thường)
      const normalizedList = list.map(b => {
        const id = b.id !== undefined ? b.id : b.BookingID;
        const licensePlate = b.licensePlate || b.LicensePlate || "N/A";
        const price = b.price !== undefined ? b.price : (b.FinalPrice || b.TotalPrice || 0);
        const status = b.status !== undefined ? b.status : b.Status;
        
        let rawDate = b.date || b.BookingDate;
        let dateStr = "";
        if (rawDate) {
          const d = new Date(rawDate);
          dateStr = d.toLocaleDateString("vi-VN") + " " + d.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit"
          });
        }
        
        // Tính điểm tích lũy: 1.000đ = 1 điểm
        const points = b.points !== undefined ? b.points : (b.Points !== undefined ? b.Points : Math.floor(price / 1000));
        
        return {
          id,
          licensePlate,
          price,
          status,
          date: dateStr,
          points
        };
      });
      setBookings(normalizedList);
    } catch (err) {
      console.error("Failed to load loyalty dashboard data:", err);
      showToast("Không thể tải thông tin tích điểm từ CSDL!", "error");
    } finally {
      setLoading(false);
    }
  };

  // Derive points transactions
  // Trọng thêm: Đơn giản hóa map từ danh sách đã chuẩn hóa
  const transactionsList = useMemo(() => {
    return bookings
      .map((b) => {
        let isCompleted = b.status === 4;
        let isCancelled = b.status === 5;
        return {
          id: b.id,
          date: b.date,
          licensePlate: b.licensePlate || "N/A",
          price: b.price || 0,
          points: b.points || 0,
          type: isCompleted ? "Earned" : isCancelled ? "Cancelled" : "Pending",
        };
      })
      .filter((t) => t.type !== "Cancelled");
  }, [bookings]);

  // Fix: Nếu API trả CurrentPoints/AccumulatedPoints = 0 nhưng có đơn hoàn thành, tự tính
  const displayCurrentPoints = useMemo(() => {
    if (profile.CurrentPoints > 0) return profile.CurrentPoints;
    return transactionsList
      .filter(t => t.type === "Earned")
      .reduce((sum, t) => sum + (t.points || 0), 0);
  }, [profile.CurrentPoints, transactionsList]);

  const displayAccumulatedPoints = useMemo(() => {
    if (profile.AccumulatedPoints > 0) return profile.AccumulatedPoints;
    return displayCurrentPoints;
  }, [profile.AccumulatedPoints, displayCurrentPoints]);

  // Filter & search logic
  const filteredTransactions = useMemo(() => {
    return transactionsList.filter((t) => {
      // Status filter
      if (statusFilter === "Completed" && t.type !== "Earned") return false;
      if (statusFilter === "Pending" && t.type !== "Pending") return false;

      // Search term
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        const matchesPlate = t.licensePlate.toLowerCase().includes(term);
        const matchesId = String(t.id).includes(term);
        return matchesPlate || matchesId;
      }
      return true;
    });
  }, [transactionsList, searchTerm, statusFilter]);

  // Calculate tier upgrade progression
  const tierProgress = useMemo(() => {
    const pts = displayAccumulatedPoints;

    // Tiers threshold configuration
    // Bronze: 0, Silver: 500, Gold: 1500, Platinum: 5000
    if (pts < 500) {
      return {
        nextTier: "Silver",
        required: 500,
        currentInTier: pts,
        percent: Math.min(100, Math.round((pts / 500) * 100)),
        remaining: 500 - pts,
      };
    } else if (pts < 1500) {
      return {
        nextTier: "Gold",
        required: 1500,
        currentInTier: pts,
        percent: Math.min(100, Math.round(((pts - 500) / (1500 - 500)) * 100)),
        remaining: 1500 - pts,
      };
    } else if (pts < 5000) {
      return {
        nextTier: "Platinum",
        required: 5000,
        currentInTier: pts,
        percent: Math.min(
          100,
          Math.round(((pts - 1500) / (5000 - 1500)) * 100),
        ),
        remaining: 5000 - pts,
      };
    } else {
      return {
        nextTier: "Maxed",
        required: 5000,
        currentInTier: pts,
        percent: 100,
        remaining: 0,
      };
    }
  }, [displayAccumulatedPoints]);

  const money = (val) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);

  return (
    <div className="portal-layout-container">
      <Sidebar />
      <main className="portal-main-content" style={{ padding: 0 }}>
        <div className="loyalty-main-wrapper" style={{ padding: "40px" }}>
          {/* Header section */}
          <header className="loyalty-header-section">
            <div className="header-badge">
              <i className="fa-solid fa-award"></i> Thành viên & Điểm thưởng
            </div>
            <h1 className="header-title">Hạng Thành Viên & Tích Điểm</h1>
            <p className="header-subtitle">
              Theo dõi quá trình nâng hạng, ưu đãi và lịch sử điểm tích lũy của
              bạn
            </p>
          </header>

          {/* Cards Row */}
          <section className="loyalty-cards-grid">
            {/* Card 1: Membership card */}
            <div
              className={`loyalty-membership-card tier-${profile.TierName.toLowerCase()}`}
            >
              <div className="card-header">
                <span className="card-brand">
                  <i className="fa-solid fa-gem"></i> MOTO SHINE
                </span>
                <span className="card-tier">{profile.TierName}</span>
              </div>
              <div className="card-body">
                <div className="points-box">
                  <span className="points-label">Điểm khả dụng hiện tại</span>
                  <h2 className="points-num">
                    {displayCurrentPoints} <span>PTS</span>
                  </h2>
                </div>
              </div>
              <div className="card-footer">
                <div className="holder-details">
                  <span className="holder-label">Chủ thẻ</span>
                  <span className="holder-name">{profile.FullName}</span>
                </div>
                <div className="holder-details" style={{ textAlign: "right" }}>
                  <span className="holder-label">Mã số khách hàng</span>
                  <span className="holder-name">#{profile.UserID}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Tier Upgrade Progress */}
            <div className="loyalty-progress-card">
              <div className="card-title-row">
                <h3>Tiến Trình Nâng Hạng</h3>
                <span className="progress-label">
                  Tổng tích lũy:{" "}
                  <strong>{displayAccumulatedPoints} PTS</strong>
                </span>
              </div>

              {tierProgress.nextTier === "Maxed" ? (
                <div className="max-tier-display">
                  <div className="trophy-icon">
                    <i className="fa-solid fa-crown text-yellow-500"></i>
                  </div>
                  <h4>Chúc mừng! Bạn đã đạt hạng cao nhất</h4>
                  <p>
                    Hạng Platinum của bạn hiện tại được giảm tối đa 15% cho mọi
                    dịch vụ đặt xe.
                  </p>
                </div>
              ) : (
                <div className="progress-content">
                  <div className="progress-info-row">
                    <span>
                      Hạng tiếp theo: <strong>{tierProgress.nextTier}</strong>
                    </span>
                    <span>
                      Cần thêm: <strong>{tierProgress.remaining} PTS</strong>
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${tierProgress.percent}%` }}
                    ></div>
                  </div>
                  <div className="progress-limits">
                    <span>{displayAccumulatedPoints} PTS</span>
                    <span>{tierProgress.required} PTS</span>
                  </div>
                  <div className="upgrade-bonus-tip">
                    <i className="fa-solid fa-lightbulb"></i>
                    <span>
                      Tích lũy thêm {tierProgress.remaining} điểm bằng cách đặt
                      rửa xe để nhận thêm nhiều quyền lợi ưu đãi hơn!
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Comparative Tiers Perks Grid */}
          <section className="tiers-perks-section">
            <h2 className="section-title">Thông Tin Các Hạng Thành Viên</h2>
            <div className="tiers-grid">
              {/* Bronze */}
              <div
                className={`tier-perk-item ${profile.TierName.toLowerCase() === "bronze" ? "active" : ""}`}
              >
                {profile.TierName.toLowerCase() === "bronze" && (
                  <span className="active-badge">Đang đạt</span>
                )}
                <div className="tier-icon-circle bronze">
                  <i className="fa-solid fa-award"></i>
                </div>
                <h3>Bronze (Đồng)</h3>
                <span className="tier-req">Yêu cầu: 0 PTS</span>
                <ul className="perks-list">
                  <li>
                    <i className="fa-solid fa-circle-check text-green-500"></i>{" "}
                    Không giảm giá dịch vụ
                  </li>
                  <li>
                    <i className="fa-solid fa-circle-check text-green-500"></i>{" "}
                    Hạn đặt trước: 1 ngày
                  </li>
                  <li>
                    <i className="fa-solid fa-circle-check text-green-500"></i>{" "}
                    Hỗ trợ đặt lịch cơ bản
                  </li>
                </ul>
              </div>

              {/* Silver */}
              <div
                className={`tier-perk-item ${profile.TierName.toLowerCase() === "silver" ? "active" : ""}`}
              >
                {profile.TierName.toLowerCase() === "silver" && (
                  <span className="active-badge">Đang đạt</span>
                )}
                <div className="tier-icon-circle silver">
                  <i className="fa-solid fa-gem"></i>
                </div>
                <h3>Silver (Bạc)</h3>
                <span className="tier-req">Yêu cầu: 500 PTS</span>
                <ul className="perks-list">
                  <li>
                    <i className="fa-solid fa-circle-check text-green-500"></i>{" "}
                    Giảm giá: <strong>5%</strong> đơn hàng
                  </li>
                  <li>
                    <i className="fa-solid fa-circle-check text-green-500"></i>{" "}
                    Hạn đặt trước: 3 ngày
                  </li>
                  <li>
                    <i className="fa-solid fa-circle-check text-green-500"></i>{" "}
                    Hỗ trợ ưu tiên
                  </li>
                </ul>
              </div>

              {/* Gold */}
              <div
                className={`tier-perk-item ${profile.TierName.toLowerCase() === "gold" ? "active" : ""}`}
              >
                {profile.TierName.toLowerCase() === "gold" && (
                  <span className="active-badge">Đang đạt</span>
                )}
                <div className="tier-icon-circle gold">
                  <i className="fa-solid fa-crown"></i>
                </div>
                <h3>Gold (Vàng)</h3>
                <span className="tier-req">Yêu cầu: 1,500 PTS</span>
                <ul className="perks-list">
                  <li>
                    <i className="fa-solid fa-circle-check text-green-500"></i>{" "}
                    Giảm giá: <strong>10%</strong> đơn hàng
                  </li>
                  <li>
                    <i className="fa-solid fa-circle-check text-green-500"></i>{" "}
                    Hạn đặt trước: 7 ngày
                  </li>
                  <li>
                    <i className="fa-solid fa-circle-check text-green-500"></i>{" "}
                    Quà tặng sinh nhật thành viên
                  </li>
                </ul>
              </div>

              {/* Platinum */}
              <div
                className={`tier-perk-item ${profile.TierName.toLowerCase() === "platinum" ? "active" : ""}`}
              >
                {profile.TierName.toLowerCase() === "platinum" && (
                  <span className="active-badge">Đang đạt</span>
                )}
                <div className="tier-icon-circle platinum">
                  <i className="fa-solid fa-certificate"></i>
                </div>
                <h3>Platinum (Bạch Kim)</h3>
                <span className="tier-req">Yêu cầu: 5,000 PTS</span>
                <ul className="perks-list">
                  <li>
                    <i className="fa-solid fa-circle-check text-green-500"></i>{" "}
                    Giảm giá: <strong>15%</strong> đơn hàng
                  </li>
                  <li>
                    <i className="fa-solid fa-circle-check text-green-500"></i>{" "}
                    Hạn đặt trước: 14 ngày
                  </li>
                  <li>
                    <i className="fa-solid fa-circle-check text-green-500"></i>{" "}
                    Rửa xe ưu tiên, không chờ đợi
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Transactions Log Section */}
          <section className="loyalty-transactions-section">
            <div className="section-header-row">
              <h2>Lịch Sử Tích Lũy Điểm</h2>
              <div className="filter-controls">
                <div className="search-box">
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <input
                    type="text"
                    placeholder="Tìm theo Mã đơn / Biển số..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="filter-buttons">
                  <button
                    className={`filter-btn ${statusFilter === "All" ? "active" : ""}`}
                    onClick={() => setStatusFilter("All")}
                  >
                    Tất cả
                  </button>
                  <button
                    className={`filter-btn ${statusFilter === "Completed" ? "active" : ""}`}
                    onClick={() => setStatusFilter("Completed")}
                  >
                    Tích lũy xong
                  </button>
                  <button
                    className={`filter-btn ${statusFilter === "Pending" ? "active" : ""}`}
                    onClick={() => setStatusFilter("Pending")}
                  >
                    Đang chờ duyệt
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="data-loading-spinner">
                <div className="spinner"></div>
                <span>Đang tải thông tin lịch sử điểm...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="empty-state-box">
                <i className="fa-solid fa-receipt"></i>
                <p>Không tìm thấy lịch sử tích điểm nào trong bộ lọc này.</p>
              </div>
            ) : (
              <div className="transactions-table-wrapper">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Mã Đơn Rửa Xe</th>
                      <th>Biển Số Xe</th>
                      <th>Thời Gian Giao Dịch</th>
                      <th>Loại Giao Dịch</th>
                      <th>Số Điểm</th>
                      <th>Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td style={{ fontWeight: 700 }}>#{tx.id}</td>
                        <td>
                          <span className="license-plate-badge">
                            {tx.licensePlate}
                          </span>
                        </td>
                        <td>{tx.date}</td>
                        <td style={{ fontWeight: 600 }}>
                          {tx.type === "Earned"
                            ? "Tích lũy từ đơn rửa xe"
                            : "Tích lũy dự kiến"}
                        </td>
                        <td>
                          <span
                            className={`points-val ${tx.type === "Earned" ? "positive" : "pending"}`}
                          >
                            +{tx.points} PTS
                          </span>
                        </td>
                        <td>
                          {tx.type === "Earned" ? (
                            <span className="status-badge success-badge">
                              <i className="fa-solid fa-circle-check"></i> Đã
                              tích điểm
                            </span>
                          ) : (
                            <span className="status-badge pending-badge">
                              <i className="fa-solid fa-spinner fa-spin"></i>{" "}
                              Chờ hoàn tất rửa xe
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Toast alert banner */}
      {toast && (
        <div
          className={`loyalty-toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}
        >
          <i
            className={
              toast.type === "error"
                ? "fa-solid fa-circle-exclamation"
                : "fa-regular fa-circle-check"
            }
          ></i>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

// Trọng thêm: Cập nhật CSS sử dụng CSS Variables để đồng bộ giao diện sáng tối
const loyaltyCss = `
.loyalty-page-container {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.loyalty-main-wrapper {
  padding: 32px;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: var(--text-primary);
}

.loyalty-header-section {
  margin-bottom: 32px;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  padding: 6px 14px;
  border-radius: 99px;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid rgba(99, 102, 241, 0.2);
  margin-bottom: 16px;
}

.header-title {
  font-size: 32px;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  letter-spacing: -0.02em;
}

.header-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
}

.loyalty-cards-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 24px;
  margin-bottom: 36px;
}

/* Glassmorphic Membership card */
.loyalty-membership-card {
  border-radius: 24px;
  padding: 28px;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 230px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.15);
  position: relative;
  overflow: hidden;
}

.loyalty-membership-card::after {
  content: "";
  position: absolute;
  top: -50%;
  left: -30%;
  width: 180%;
  height: 180%;
  background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%);
  pointer-events: none;
}

.tier-bronze {
  background: linear-gradient(135deg, #1e293b, #0f172a);
}
.tier-silver {
  background: linear-gradient(135deg, #475569, #1e293b);
  border-color: rgba(255, 255, 255, 0.2);
}
.tier-gold {
  background: linear-gradient(135deg, #b45309, #78350f);
  border-color: rgba(217, 119, 6, 0.3);
}
.tier-platinum {
  background: linear-gradient(135deg, #4338ca, #1e1b4b);
  border-color: rgba(99, 102, 241, 0.3);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-brand {
  font-weight: 800;
  letter-spacing: 0.1em;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-tier {
  text-transform: uppercase;
  font-weight: 900;
  font-size: 14px;
  letter-spacing: 0.08em;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 99px;
  backdrop-filter: blur(4px);
}

.points-box {
  margin: 20px 0;
}

.points-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.75;
  display: block;
  margin-bottom: 4px;
}

.points-num {
  font-size: 42px;
  font-weight: 800;
  margin: 0;
  line-height: 1;
}

.points-num span {
  font-size: 16px;
  font-weight: 500;
  opacity: 0.8;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.holder-details {
  display: flex;
  flex-direction: column;
}

.holder-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.6;
  margin-bottom: 2px;
}

.holder-name {
  font-weight: 600;
  font-size: 14px;
}

/* Progress card */
.loyalty-progress-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding-bottom: 16px;
}

.card-title-row h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.progress-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.progress-label strong {
  color: #818cf8;
}

.max-tier-display {
  text-align: center;
  padding: 20px 0;
}

.trophy-icon {
  font-size: 44px;
  margin-bottom: 12px;
}

.max-tier-display h4 {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 6px 0;
  color: var(--text-primary);
}

.max-tier-display p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.progress-content {
  margin-top: 20px;
}

.progress-info-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin-bottom: 10px;
  color: var(--text-secondary);
}

.progress-info-row strong {
  color: var(--text-primary);
}

.progress-bar-container {
  height: 10px;
  background: var(--bg-primary);
  border-radius: 99px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #818cf8);
  border-radius: 99px;
  transition: width 0.4s ease;
}

.progress-limits {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.upgrade-bonus-tip {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(99, 102, 241, 0.1);
  padding: 12px 16px;
  border-radius: 12px;
  border-left: 3px solid #6366f1;
}

.upgrade-bonus-tip i {
  color: #a5b4fc;
  margin-top: 2px;
}

.upgrade-bonus-tip span {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
}

/* Perks section */
.tiers-perks-section {
  margin-bottom: 44px;
}

.section-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 20px 0;
}

.tiers-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.tier-perk-item {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.2s ease;
}

.tier-perk-item.active {
  border-color: var(--accent);
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.05);
}

.active-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  background: var(--accent);
  color: #fff;
  padding: 2px 8px;
  border-radius: 99px;
  letter-spacing: 0.05em;
}

.tier-icon-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 20px;
  margin-bottom: 16px;
}

.tier-icon-circle.bronze { background: rgba(71, 85, 105, 0.15); color: #94a3b8; }
.tier-icon-circle.silver { background: rgba(148, 163, 184, 0.15); color: #cbd5e1; }
.tier-icon-circle.gold { background: rgba(217, 119, 6, 0.15); color: #fbbf24; }
.tier-icon-circle.platinum { background: rgba(99, 102, 241, 0.15); color: #a5b4fc; }

.tier-perk-item h3 {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: var(--text-primary);
}

.tier-req {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 18px;
}

.perks-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.perks-list li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.perks-list li strong {
  color: var(--text-primary);
}

/* Transactions list */
.loyalty-transactions-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 28px;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.section-header-row h2 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-box {
  position: relative;
  width: 260px;
}

.search-box i {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  font-size: 14px;
}

.search-box input {
  width: 100%;
  padding: 10px 14px 10px 38px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 14px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  box-sizing: border-box;
  outline: none;
}

.search-box input:focus {
  outline: none;
  border-color: var(--accent);
}

.filter-buttons {
  display: flex;
  gap: 8px;
}

.filter-btn {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 8px 14px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.data-loading-spinner {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(99, 102, 241, 0.1);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px auto;
}

.empty-state-box {
  text-align: center;
  padding: 48px 0;
  color: var(--text-secondary);
}

.empty-state-box i {
  font-size: 38px;
  margin-bottom: 12px;
}

.empty-state-box p {
  margin: 0;
  font-size: 14px;
}

.transactions-table-wrapper {
  overflow-x: auto;
}

.transactions-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;
}

.transactions-table th, .transactions-table td {
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.transactions-table th {
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--bg-primary);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.transactions-table td {
  color: var(--text-primary);
}

.transactions-table tbody tr {
  transition: background 0.15s ease;
}

.transactions-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

.license-plate-badge {
  background: var(--bg-primary);
  color: var(--accent);
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 800;
  border: 1px solid var(--border);
  font-size: 12px;
}

.points-val {
  font-weight: 800;
  font-size: 15px;
}

.points-val.positive {
  color: #10b981;
}

.points-val.pending {
  color: #f59e0b;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 700;
}

.success-badge {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.pending-badge {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

/* Toast alert */
.loyalty-toast {
  position: fixed;
  top: 20px;
  right: 24px;
  z-index: 999;
  padding: 14px 20px;
  border-radius: 12px;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 10px;
}

.loyalty-toast.toast-success { background: #059669; }
.loyalty-toast.toast-error { background: #dc2626; }

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  .loyalty-main-wrapper {
    padding: 16px;
  }
  .loyalty-cards-grid {
    grid-template-columns: 1fr;
  }
  .tiers-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .section-header-row {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-controls {
    flex-direction: column;
    align-items: stretch;
  }
  .search-box {
    width: 100%;
  }
}
@media (max-width: 550px) {
  .tiers-grid {
    grid-template-columns: 1fr;
  }
}
`;
