import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://127.0.0.1:5000/api";

export default function RewardRedemption() {
  const [profile, setProfile] = useState({
    FullName: "Khách hàng",
    CurrentPoints: 0,
    TierName: "Standard",
  });
  const [rewards, setRewards] = useState([]);
  const [selectedReward, setSelectedReward] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [myVouchers, setMyVouchers] = useState([]);
  const [walletLoading, setWalletLoading] = useState(false);

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

  const getHeaders = () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("TOKEN");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const normalizePromotionToReward = (promotion) => {
    const discountPercent = Number(promotion.DiscountPercent || 0);

    return {
      RewardID: promotion.PromotionID,
      RewardCode: `PR-${promotion.PromotionID}`,
      RewardName:
        promotion.PromoName || `Khuyến mãi PR-${promotion.PromotionID}`,
      PointsRequired: Number(promotion.RequiredPoints || promotion.requiredPoints || 0),
      DiscountPercent: discountPercent,
      MaxRedemptions: Number(
        promotion.MaxRedemptions ?? promotion.maxRedemptions ?? 1,
      ),
      Description: `Voucher giảm ${discountPercent}% khi thanh toán booking.`,
      RawPromotion: promotion,
    };
  };

  const normalizeMyVoucher = (voucher) => {
    const promotionId =
      voucher.PromotionID ??
      voucher.PromotionId ??
      voucher.promotionID ??
      voucher.promotionId ??
      voucher.promotion_id;

    const memberPromoId =
      voucher.MemberPromoID ??
      voucher.MemberPromoId ??
      voucher.memberPromoID ??
      voucher.memberPromoId ??
      voucher.member_promo_id;

    const promoName =
      voucher.PromoName ??
      voucher.promoName ??
      voucher.RewardName ??
      voucher.rewardName ??
      voucher.Name ??
      voucher.name;

    const discountPercent =
      voucher.DiscountPercent ??
      voucher.discountPercent ??
      voucher.Discount ??
      voucher.discount ??
      0;

    return {
      MemberPromoID: memberPromoId,
      PromotionID: promotionId,
      RewardCode:
        voucher.RewardCode ||
        voucher.rewardCode ||
        voucher.PromoCode ||
        voucher.promoCode ||
        (promotionId ? `PR-${promotionId}` : "PR-N/A"),
      RewardName:
        promoName || (promotionId ? `Khuyến mãi PR-${promotionId}` : "Khuyến mãi"),
      DiscountPercent: Number(discountPercent || 0),
      IsUsed: Boolean(voucher.IsUsed ?? voucher.isUsed ?? false),
      AcquiredDate:
        voucher.AcquiredDate ||
        voucher.acquiredDate ||
        voucher.CreatedAt ||
        voucher.createdAt,
      EndDate:
        voucher.EndDate ||
        voucher.endDate ||
        voucher.ExpiredAt ||
        voucher.expiredAt,
    };
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMyVouchers = async () => {
    const userId = getCustomerId();
    const headers = getHeaders();
    setWalletLoading(true);

    try {
      const walletRes = await axios.get(
        `${API_BASE}/loyalty/my-vouchers?userId=${userId}`,
        { headers },
      );

      const data = Array.isArray(walletRes.data)
        ? walletRes.data
        : walletRes.data?.vouchers || [];

      setMyVouchers(data.map(normalizeMyVoucher));
    } catch (err) {
      console.error("Lỗi lấy ví voucher:", err);
      setMyVouchers([]);
    } finally {
      setWalletLoading(false);
    }
  };

  const fetchRewardData = async () => {
    setLoading(true);
    const userId = getCustomerId();
    const headers = getHeaders();

    // 1. TẢI ĐIỂM ĐỘC LẬP (Sử dụng lại API /users/profile đang chạy cực tốt bên LoyaltyHistory)
    try {
      const profileRes = await axios.get(
        `${API_BASE}/users/profile?userId=${userId}`,
        { headers },
      );
      if (profileRes.data) {
        setProfile({
          FullName:
            profileRes.data.FullName ||
            profileRes.data.fullName ||
            "Khách hàng",
          CurrentPoints: Number(
            profileRes.data.CurrentPoints ?? profileRes.data.currentPoints ?? 0,
          ),
          TierName:
            profileRes.data.TierName || profileRes.data.tierName || "Standard",
        });
      }
    } catch (err) {
      console.error("Lỗi lấy thông tin Profile:", err);
    }

    // 2. TẢI VOUCHER ĐỘC LẬP
    try {
      const promotionRes = await axios.get(
        `${API_BASE}/promotions?status=active`,
        { headers },
      );
      const mappedRewards = Array.isArray(promotionRes.data)
        ? promotionRes.data.map(normalizePromotionToReward)
        : [];
      setRewards(mappedRewards);
    } catch (err) {
      console.error("Lỗi lấy danh sách Voucher:", err);
      showToast("Không tải được dữ liệu voucher.", "error");
      setRewards([]);
    } finally {
      setLoading(false);
      fetchMyVouchers();
    }
  };

  const getRedeemedCount = (reward) => {
    return myVouchers.filter(
      (voucher) =>
        Number(voucher.PromotionID) === Number(reward.RewardID),
    ).length;
  };

  const hasReachedRedemptionLimit = (reward) => {
    return (
      getRedeemedCount(reward) >= Number(reward.MaxRedemptions || 1)
    );
  };

  const canUseReward = (reward) => {
    return (
      profile.CurrentPoints >= Number(reward.PointsRequired || 0) &&
      !hasReachedRedemptionLimit(reward)
    );
  };

  const checkoutSummary = useMemo(() => {
    return {
      pointsUsed: selectedReward
        ? Number(selectedReward.PointsRequired || 0)
        : 0,
      remainingPoints: selectedReward
        ? profile.CurrentPoints - Number(selectedReward.PointsRequired || 0)
        : profile.CurrentPoints,
    };
  }, [profile.CurrentPoints, selectedReward]);

  const handleApplyReward = (reward) => {
    if (hasReachedRedemptionLimit(reward)) {
      showToast(
        `Bạn đã đổi voucher này đủ ${reward.MaxRedemptions} lần.`,
        "error",
      );
      return;
    }

    if (!canUseReward(reward)) {
      showToast("Bạn chưa đủ điểm để đổi voucher này.", "error");
      return;
    }
    setSelectedReward(reward);
    showToast(
      `Đã chọn mã ${reward.RewardCode}. Bấm đổi điểm để nhận voucher.`,
      "success",
    );
  };

  const handleCheckout = async () => {
    if (!selectedReward || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      // 1. Tạo payload gửi xuống BE
      const payloadForBE = {
        userId: getCustomerId(),
        bookingId: null,
        RewardCode: selectedReward.RewardCode,
        promotionId: selectedReward.RewardID,
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
        setSelectedReward(null);
        fetchRewardData();
      } else {
        showToast(
          response.data.message || "Không thể đổi voucher này.",
          "error",
        );
        setSelectedReward(null);
        fetchRewardData();
      }
    } catch (error) {
      console.error("Lỗi gọi API Redeem:", error);
      showToast(
        error.response?.data?.message || "Đã xảy ra lỗi khi đổi điểm!",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const walletStats = useMemo(() => {
    const unused = myVouchers.filter((v) => !v.IsUsed).length;
    const used = myVouchers.filter((v) => v.IsUsed).length;
    return {
      total: myVouchers.length,
      unused,
      used,
    };
  }, [myVouchers]);

  const formatDate = (value) => {
    if (!value) return "Không giới hạn";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Không giới hạn";
    return date.toLocaleDateString("vi-VN");
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
            <p>Dùng điểm khả dụng để lấy mã giảm giá khi thanh toán booking.</p>
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
                <p>Voucher đang hiệu lực từ hệ thống khuyến mãi.</p>
              </div>
              <div className="reward-mode-box">
                <span>Chế độ</span>
                <strong>Đổi điểm nhận voucher</strong>
              </div>
            </div>

            {loading ? (
              <div className="reward-empty">Đang tải dữ liệu...</div>
            ) : rewards.length === 0 ? (
              <div className="reward-empty">
                Hiện chưa có voucher đang hiệu lực từ hệ thống.
              </div>
            ) : (
              <div className="reward-list">
                {rewards.map((reward) => {
                  const limitReached = hasReachedRedemptionLimit(reward);
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
                            <i className="fa-solid fa-tags"></i> Giảm{" "}
                            {reward.DiscountPercent}%
                          </small>
                          <small>
                            <i className="fa-solid fa-repeat"></i>{" "}
                            Đã đổi {getRedeemedCount(reward)}/
                            {reward.MaxRedemptions}
                          </small>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyReward(reward)}
                        disabled={disabled}
                      >
                        {active
                          ? "Đã chọn"
                          : limitReached
                            ? "Đã đủ lượt"
                            : disabled
                              ? "Chưa đủ điểm"
                              : "Đổi điểm"}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="reward-summary">
            <h2>Tóm tắt đổi điểm</h2>
            <div className="summary-code">
              <span>Mã đang chọn</span>
              <b>{selectedReward?.RewardCode || "Chưa chọn"}</b>
            </div>
            <div className="summary-code">
              <span>Điểm cần dùng</span>
              <b>{checkoutSummary.pointsUsed}</b>
            </div>
            <div className="summary-code">
              <span>Điểm còn lại</span>
              <b>{checkoutSummary.remainingPoints}</b>
            </div>
            <div className="summary-code">
              <span>Voucher khả dụng</span>
              <b>
                {rewards.filter(canUseReward).length}/{rewards.length}
              </b>
            </div>
            <button
              className="summary-btn"
              onClick={handleCheckout}
              disabled={!selectedReward || submitting}
            >
              {submitting
                ? "Đang đổi điểm..."
                : selectedReward
                  ? "Đổi điểm nhận voucher"
                  : "Chọn voucher để đổi"}
            </button>
          </aside>
        </section>

        <section className="wallet-card">
          <div className="wallet-header">
            <div>
              <h2>Ví voucher của tôi</h2>
              <p>Danh sách voucher đã đổi bằng điểm và trạng thái sử dụng.</p>
            </div>
            <div className="wallet-stats">
              <div>
                <strong>{walletStats.total}</strong>
                <span>Tổng voucher</span>
              </div>
              <div>
                <strong>{walletStats.unused}</strong>
                <span>Chưa dùng</span>
              </div>
              <div>
                <strong>{walletStats.used}</strong>
                <span>Đã dùng</span>
              </div>
            </div>
          </div>

          {walletLoading ? (
            <div className="wallet-empty">Đang tải ví voucher...</div>
          ) : myVouchers.length === 0 ? (
            <div className="wallet-empty">
              Bạn chưa có voucher nào trong ví. Hãy đổi điểm để nhận voucher.
            </div>
          ) : (
            <div className="wallet-list">
              {myVouchers.map((voucher) => (
                <article
                  key={voucher.MemberPromoID || `${voucher.PromotionID || "promo"}-${voucher.RewardCode}`}
                  className={`wallet-item ${voucher.IsUsed ? "used" : ""}`}
                >
                  <div className="wallet-icon">
                    <i className="fa-solid fa-ticket"></i>
                  </div>
                  <div className="wallet-info">
                    <div className="wallet-row">
                      <h3>{voucher.RewardName}</h3>
                      <span>{voucher.RewardCode || "PR-N/A"}</span>
                    </div>
                    <p>Giảm {voucher.DiscountPercent}% khi thanh toán booking.</p>
                    <div className="wallet-meta">
                      <small>
                        <i className="fa-solid fa-calendar-plus"></i>{" "}
                        Nhận: {formatDate(voucher.AcquiredDate)}
                      </small>
                      <small>
                        <i className="fa-solid fa-calendar-xmark"></i>{" "}
                        HSD: {formatDate(voucher.EndDate)}
                      </small>
                    </div>
                  </div>
                  <div className={`wallet-status ${voucher.IsUsed ? "used" : "available"}`}>
                    {voucher.IsUsed ? "Đã dùng" : "Chưa dùng"}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

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

.reward-mode-box{
  min-width:220px;
  border:1px solid var(--border);
  background:var(--bg-primary);
  color:var(--text-primary);
  border-radius:16px;
  padding:12px 14px;
  display:flex;
  flex-direction:column;
  gap:4px;
}

.reward-mode-box span{
  color:var(--text-secondary);
  font-size:12px;
  font-weight:800;
}

.reward-mode-box strong{
  color:var(--text-primary);
  font-size:15px;
  font-weight:900;
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

.wallet-card{
  margin-top:24px;
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:26px;
  padding:24px;
  box-shadow:0 18px 50px rgba(16,24,40,.04);
}

.wallet-header{
  display:flex;
  justify-content:space-between;
  gap:18px;
  align-items:flex-start;
  margin-bottom:18px;
}

.wallet-header h2{
  margin:0;
  font-size:22px;
  color:var(--text-primary);
}

.wallet-header p{
  margin:6px 0 0;
  color:var(--text-secondary);
}

.wallet-stats{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.wallet-stats div{
  min-width:94px;
  padding:10px 12px;
  border-radius:16px;
  background:var(--bg-primary);
  border:1px solid var(--border);
  display:flex;
  flex-direction:column;
  gap:3px;
}

.wallet-stats strong{
  color:var(--text-primary);
  font-size:20px;
  font-weight:900;
}

.wallet-stats span{
  color:var(--text-secondary);
  font-size:11px;
  font-weight:800;
}

.wallet-empty{
  padding:36px;
  border:1px dashed var(--border);
  border-radius:18px;
  color:var(--text-secondary);
  text-align:center;
  font-weight:700;
}

.wallet-list{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:14px;
}

.wallet-item{
  display:grid;
  grid-template-columns:54px 1fr auto;
  gap:14px;
  align-items:center;
  padding:16px;
  border:1px solid var(--border);
  border-radius:20px;
  background:var(--bg-card);
}

.wallet-item.used{
  opacity:.58;
}

.wallet-icon{
  width:54px;
  height:54px;
  border-radius:18px;
  background:var(--bg-primary);
  color:#0b8f6b;
  display:grid;
  place-items:center;
  font-size:22px;
}

.wallet-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
}

.wallet-row h3{
  margin:0;
  color:var(--text-primary);
  font-size:16px;
  font-weight:900;
}

.wallet-row span{
  padding:5px 9px;
  border-radius:999px;
  background:rgba(245,158,11,.15);
  color:#e5a500;
  font-size:12px;
  font-weight:900;
}

.wallet-info p{
  margin:7px 0;
  color:var(--text-secondary);
}

.wallet-meta{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}

.wallet-meta small{
  padding:6px 9px;
  border-radius:999px;
  background:var(--bg-primary);
  color:var(--text-secondary);
  font-weight:700;
}

.wallet-status{
  white-space:nowrap;
  padding:8px 10px;
  border-radius:999px;
  font-size:12px;
  font-weight:900;
}

.wallet-status.available{
  background:rgba(16,185,129,.14);
  color:#10b981;
}

.wallet-status.used{
  background:rgba(148,163,184,.18);
  color:var(--text-secondary);
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
  .reward-mode-box{
    width:100%;
  }
  .wallet-header{
    flex-direction:column;
  }
  .wallet-stats{
    width:100%;
  }
  .wallet-stats div{
    flex:1;
  }
  .wallet-list{
    grid-template-columns:1fr;
  }
  .wallet-item{
    grid-template-columns:1fr;
  }
  .wallet-icon{
    display:none;
  }
}
`;
