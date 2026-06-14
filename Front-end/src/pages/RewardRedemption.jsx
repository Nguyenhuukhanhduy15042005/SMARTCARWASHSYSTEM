import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://127.0.0.1:5000/api";

const mockRewards = [
  {
    RewardID: 1,
    RewardCode: "WASH10",
    RewardName: "Giảm 10.000đ",
    PointsRequired: 100,
    DiscountAmount: 10000,
    MinOrderValue: 50000,
    Description: "Dùng cho mọi gói rửa xe",
  },
  {
    RewardID: 2,
    RewardCode: "WASH25",
    RewardName: "Giảm 25.000đ",
    PointsRequired: 220,
    DiscountAmount: 25000,
    MinOrderValue: 90000,
    Description: "Phù hợp gói Premium / Combo",
  },
  {
    RewardID: 3,
    RewardCode: "VIP50",
    RewardName: "Giảm 50.000đ",
    PointsRequired: 420,
    DiscountAmount: 50000,
    MinOrderValue: 150000,
    Description: "Ưu đãi thành viên tích điểm cao",
  },
];

export default function RewardRedemption() {
  const [profile, setProfile] = useState({
    FullName: "Khách hàng",
    CurrentPoints: 0,
    TierName: "Standard",
  });
  const [rewards, setRewards] = useState(mockRewards);
  const [selectedReward, setSelectedReward] = useState(null);
  const [orderValue, setOrderValue] = useState(120000);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
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
    style.innerHTML = rewardRedemptionCss;
    document.head.appendChild(style);

    fetchRewardData();
    return () => style.remove();
  }, []);

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
        console.warn("Không decode được token, dùng customer test.", err);
      }
    }
    return 12;
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRewardData = async () => {
    setLoading(true);
    const userId = getCustomerId();
    const headers = {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
    try {
      const [pRes, vRes] = await Promise.all([
        axios.get(`${API_BASE}/loyalty/profile?userId=${userId}`, { headers }),
        axios.get(`${API_BASE}/loyalty/my-vouchers?userId=${userId}`, {
          headers,
        }),
      ]);
      setProfile(pRes.data);
      setMyVouchers(vRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const money = (value) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(Number(value || 0));

  const canUseReward = (reward) => {
    return (
      profile.CurrentPoints >= reward.PointsRequired &&
      orderValue >= reward.MinOrderValue
    );
  };

  const checkoutSummary = useMemo(() => {
    const discount = selectedReward
      ? Math.min(
          Number(selectedReward.DiscountAmount || 0),
          Number(orderValue || 0),
        )
      : 0;
    return {
      discount,
      finalPrice: Math.max(Number(orderValue || 0) - discount, 0),
      remainingPoints: selectedReward
        ? profile.CurrentPoints - selectedReward.PointsRequired
        : profile.CurrentPoints,
    };
  }, [orderValue, profile.CurrentPoints, selectedReward]);

  const handleApplyReward = (reward) => {
    if (!canUseReward(reward)) {
      showToast(
        "Chưa đủ điểm hoặc đơn hàng chưa đạt giá trị tối thiểu.",
        "error",
      );
      return;
    }
    setSelectedReward(reward);
    showToast(
      `Đã chọn mã ${reward.RewardCode}. Chờ BE apply khi thanh toán.`,
      "success",
    );
  };

  const handleCheckout = async () => {
    if (!selectedReward) {
      showToast("Bạn chưa chọn reward để đổi điểm.", "error");
      return;
    }

    try {
      // 1. Tạo payload gửi xuống BE
      const payloadForBE = {
        userId: getCustomerId(),
        bookingId: null,
        RewardCode: selectedReward.RewardCode,
        RewardPointsUsed: selectedReward.PointsRequired,
      };

      // 2. Gọi API POST xuống Backend của Thắng
      const token =
        localStorage.getItem("token") || localStorage.getItem("TOKEN");
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.post(
        `${API_BASE}/loyalty/redeem`,
        payloadForBE,
        { headers },
      );

      // 3. Xử lý khi thành công
      if (response.data.success) {
        showToast(response.data.message || "Đổi ưu đãi thành công!", "success");
        setSelectedReward(null); // Bỏ chọn voucher hiện tại
        fetchRewardData(); // Load lại điểm số mới nhất trên màn hình
      }
    } catch (error) {
      console.error("Lỗi gọi API Redeem:", error);
      showToast(
        error.response?.data?.message || "Đã xảy ra lỗi khi đổi điểm!",
        "error",
      );
    }
  };

  return (
    <div className="portal-layout-container">
      <Sidebar />
      <main className="portal-main-content">
        {toast && (
          <div className={`reward-toast ${toast.type}`}>{toast.message}</div>
        )}

        <section className="reward-hero">
          <div>
            <p className="reward-eyebrow">Loyalty Reward</p>
            <h1>Đổi điểm thưởng</h1>
            <p>Dùng điểm tích lũy để lấy mã giảm giá khi thanh toán booking.</p>
          </div>
          <div className="reward-point-card">
            <span>Điểm hiện có</span>
            <strong>{profile.CurrentPoints}</strong>
            <small>
              {profile.FullName} • {profile.TierName}
            </small>
          </div>
        </section>

        <section className="reward-layout">
          <div className="reward-left-card">
            <div className="reward-section-title">
              <div>
                <h2>Voucher khả dụng</h2>
                <p>Đổi điểm tích lũy để nhận ưu đãi phù hợp với đơn hàng.</p>
              </div>
              <input
                type="number"
                min="0"
                value={orderValue}
                onChange={(e) => setOrderValue(Number(e.target.value))}
                aria-label="Giá trị đơn hàng"
              />
            </div>

            {loading ? (
              <div className="reward-empty">Đang tải dữ liệu...</div>
            ) : (
              <div className="reward-list">
                {rewards.map((reward) => {
                  const disabled = !canUseReward(reward);
                  const active = selectedReward?.RewardID === reward.RewardID;
                  return (
                    <article
                      key={reward.RewardID}
                      className={`reward-item ${active ? "active" : ""} ${disabled ? "disabled" : ""}`}
                    >
                      <div className="reward-badge">
                        <i className="fa-solid fa-ticket"></i>
                      </div>
                      <div className="reward-info">
                        <div className="reward-row">
                          <h3>{reward.RewardName}</h3>
                          <span>{reward.RewardCode}</span>
                        </div>
                        <p>{reward.Description}</p>
                        <div className="reward-meta">
                          <small>
                            <i className="fa-solid fa-coins"></i>{" "}
                            {reward.PointsRequired} điểm
                          </small>
                          <small>
                            <i className="fa-solid fa-cart-shopping"></i> Tối
                            thiểu {money(reward.MinOrderValue)}
                          </small>
                          <small>
                            <i className="fa-solid fa-tags"></i> Giảm{" "}
                            {money(reward.DiscountAmount)}
                          </small>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyReward(reward)}
                        disabled={disabled}
                      >
                        {active ? "Đã chọn" : disabled ? "Chưa đủ" : "Đổi điểm"}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="reward-summary">
            <h2>Tóm tắt thanh toán</h2>
            <div className="summary-line">
              <span>Tạm tính</span>
              <strong>{money(orderValue)}</strong>
            </div>
            <div className="summary-line discount">
              <span>Giảm reward</span>
              <strong>-{money(checkoutSummary.discount)}</strong>
            </div>
            <div className="summary-total">
              <span>Cần thanh toán</span>
              <strong>{money(checkoutSummary.finalPrice)}</strong>
            </div>
            <div className="summary-code">
              <span>Mã đang chọn</span>
              <b>{selectedReward?.RewardCode || "Chưa chọn"}</b>
            </div>
            <div className="summary-code">
              <span>Điểm còn lại</span>
              <b>{checkoutSummary.remainingPoints}</b>
            </div>
            <button
              className="summary-btn"
              onClick={handleCheckout}
              disabled={!selectedReward}
            >
              {selectedReward
                ? "Áp dụng vào thanh toán"
                : "Chọn voucher để áp dụng"}
            </button>
            <button
              className="reward-back-btn"
              onClick={() => window.history.back()}
            >
              Quay lại
            </button>
          </aside>
        </section>
      </main>
    </div>
  );
}

// Trọng thêm: Cập nhật CSS sử dụng CSS Variables để đồng bộ giao diện sáng tối
const rewardRedemptionCss = `
.reward-page{
  min-height:100vh;
  background:var(--bg-primary);
  font-family:'Plus Jakarta Sans',sans-serif;
  color:var(--text-primary);
}

.reward-main{
  margin-left:0;
  padding:32px;
  min-height:100vh;
}

.reward-toast{
  position:fixed;
  top:20px;
  right:24px;
  z-index:50;
  padding:14px 18px;
  border-radius:16px;
  color:#fff;
  font-weight:700;
  box-shadow:0 14px 40px rgba(15,23,42,.2);
}

.reward-toast.success{
  background:#0f9f6e;
}

.reward-toast.error{
  background:#e5484d;
}

.reward-hero{
  display:flex;
  justify-content:space-between;
  gap:24px;
  align-items:stretch;
  padding:32px;
  border-radius:28px;
  background:linear-gradient(135deg,#0b6b58,#12a67a);
  color:#fff;
  box-shadow:0 24px 70px rgba(18,166,122,.25);
}

.reward-eyebrow{
  margin:0 0 8px;
  text-transform:uppercase;
  letter-spacing:.14em;
  font-size:12px;
  font-weight:800;
  opacity:.8;
}

.reward-hero h1{
  margin:0;
  font-size:36px;
}

.reward-hero p{
  margin:10px 0 0;
  opacity:.9;
}

.reward-point-card{
  min-width:220px;
  border:1px solid rgba(255,255,255,.28);
  border-radius:24px;
  padding:22px;
  background:rgba(255,255,255,.14);
  backdrop-filter:blur(8px);
}

.reward-point-card span,.reward-point-card small{
  display:block;
  opacity:.82;
}

.reward-point-card strong{
  display:block;
  font-size:46px;
  line-height:1.1;
  margin:8px 0;
}

.reward-layout{
  display:grid;
  grid-template-columns:minmax(0,1fr) 360px;
  gap:24px;
  margin-top:24px;
}

.reward-left-card,.reward-summary{
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:26px;
  box-shadow:0 18px 50px rgba(16,24,40,.04);
}

.reward-left-card{
  padding:24px;
}

.reward-section-title{
  display:flex;
  justify-content:space-between;
  gap:16px;
  align-items:center;
  margin-bottom:18px;
}

.reward-section-title h2,.reward-summary h2{
  margin:0;
  font-size:22px;
  color:var(--text-primary);
}

.reward-section-title p{
  margin:6px 0 0;
  color:var(--text-secondary);
}

.reward-section-title input{
  width:180px;
  border:1px solid var(--border);
  background:var(--bg-primary);
  color:var(--text-primary);
  border-radius:16px;
  padding:13px 14px;
  font-weight:800;
  outline:none;
}

.reward-list{
  display:grid;
  gap:14px;
}

.reward-item{
  display:grid;
  grid-template-columns:58px 1fr auto;
  gap:16px;
  align-items:center;
  padding:18px;
  border:1px solid var(--border);
  border-radius:22px;
  background:var(--bg-card);
  color:var(--text-primary);
  transition:.2s;
}

.reward-item:hover{
  transform:translateY(-2px);
  box-shadow:0 16px 40px rgba(15,23,42,.08);
  border-color:var(--accent);
}

.reward-item.active{
  border-color:#10a37f;
  background:rgba(16, 185, 129, 0.08);
}

.reward-item.disabled{
  opacity:.56;
}

.reward-badge{
  width:58px;
  height:58px;
  border-radius:20px;
  background:var(--bg-primary);
  color:#0b8f6b;
  display:grid;
  place-items:center;
  font-size:24px;
}

.reward-row{
  display:flex;
  gap:10px;
  align-items:center;
  justify-content:space-between;
}

.reward-row h3{
  margin:0;
  font-size:18px;
  color:var(--text-primary);
}

.reward-row span{
  padding:6px 10px;
  border-radius:999px;
  background:rgba(245, 158, 11, 0.15);
  color:#e5a500;
  font-weight:900;
  font-size:12px;
}

.reward-info p{
  margin:8px 0;
  color:var(--text-secondary);
}

.reward-meta{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
}

.reward-meta small{
  padding:7px 10px;
  border-radius:999px;
  background:var(--bg-primary);
  color:var(--text-secondary);
  font-weight:700;
}

.reward-item button,.summary-btn{
  border:0;
  border-radius:16px;
  padding:12px 16px;
  background:#0f9f6e;
  color:#fff;
  font-weight:900;
  cursor:pointer;
}

.reward-item button:disabled{
  background:var(--border);
  color:var(--text-secondary);
  cursor:not-allowed;
}

.reward-summary{
  padding:24px;
  height:max-content;
  position:sticky;
  top:24px;
}

.summary-line,.summary-code{
  display:flex;
  justify-content:space-between;
  gap:14px;
  padding:14px 0;
  border-bottom:1px dashed var(--border);
  color:var(--text-secondary);
}

.summary-line strong,.summary-code b{
  color:var(--text-primary);
}

.summary-line.discount strong{
  color:#0f9f6e;
}

.summary-total{
  display:flex;
  justify-content:space-between;
  align-items:flex-end;
  padding:20px 0;
  margin-top:4px;
}

.summary-total span{
  font-weight:800;
  color:var(--text-primary);
}

.summary-total strong{
  font-size:28px;
  color:#0b8f6b;
}

.summary-btn{
  width:100%;
  margin-top:18px;
  padding:15px 18px;
  border-radius:18px;
  background:var(--accent);
}

.summary-btn:disabled{
  background:var(--border);
  color:var(--text-secondary);
  cursor:not-allowed;
  opacity:.8;
}

@media(max-width:1000px){
  .reward-main{
    margin-left:0;
    padding:18px;
  }
  .reward-hero,.reward-section-title{
    flex-direction:column;
    align-items:stretch;
  }
  .reward-layout{
    grid-template-columns:1fr;
  }
  .reward-item{
    grid-template-columns:1fr;
  }
  .reward-badge{
    display:none;
  }
  .reward-section-title input{
    width:100%;
  }
}
  .reward-back-btn{
  width:100%;
  margin-top:12px;
  padding:15px 18px;
  border:0;
  border-radius:18px;
  background:#e2e8f0;
  color:#334155;
  font-weight:800;
  cursor:pointer;
  transition:.2s;
}

.reward-back-btn:hover{
  background:#cbd5e1;
}
  
`;
