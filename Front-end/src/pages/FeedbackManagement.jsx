import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://127.0.0.1:5000/api";

const emptyStats = {
  TotalFeedback: 0,
  AverageRating: 0,
  FiveStar: 0,
  FourStar: 0,
  ThreeStar: 0,
  TwoStar: 0,
  OneStar: 0,
};

export default function FeedbackManagement() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const font = document.createElement("link");
    font.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap";
    font.rel = "stylesheet";
    document.head.appendChild(font);

    const icons = document.createElement("link");
    icons.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    icons.rel = "stylesheet";
    document.head.appendChild(icons);

    const style = document.createElement("style");
    style.innerHTML = feedbackManagementCss;
    document.head.appendChild(style);

    fetchFeedbacks();
    return () => style.remove();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchFeedbacks(), 350);
    return () => clearTimeout(timer);
  }, [search, ratingFilter]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getHeaders = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("TOKEN");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (ratingFilter !== "all") params.rating = ratingFilter;

      const res = await axios.get(`${API_BASE}/feedbacks`, {
        params,
        headers: getHeaders(),
      });

      setFeedbacks(Array.isArray(res.data?.data) ? res.data.data : []);
      setStats(res.data?.stats || emptyStats);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Không tải được danh sách feedback", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API_BASE}/feedbacks/${deleteTarget.FeedbackID}`, {
        headers: getHeaders(),
      });
      showToast("Xóa feedback thành công");
      setDeleteTarget(null);
      fetchFeedbacks();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Xóa feedback thất bại", "error");
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "--";
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  };

  const money = (value) => new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number(value || 0));

  const bookingStatus = (status) => {
    const map = {
      1: "Created",
      2: "Checked-In",
      3: "In Progress",
      4: "Completed",
      5: "Cancelled",
    };
    return map[status] || "Unknown";
  };

  const renderStars = (rating) => {
    const value = Number(rating || 0);
    return (
      <span className="fb-stars" title={`${value}/5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <i key={star} className={`${star <= value ? "fa-solid" : "fa-regular"} fa-star`}></i>
        ))}
      </span>
    );
  };

  const starRows = useMemo(() => ([
    { label: "5 sao", value: Number(stats.FiveStar || 0) },
    { label: "4 sao", value: Number(stats.FourStar || 0) },
    { label: "3 sao", value: Number(stats.ThreeStar || 0) },
    { label: "2 sao", value: Number(stats.TwoStar || 0) },
    { label: "1 sao", value: Number(stats.OneStar || 0) },
  ]), [stats]);

  const totalFeedback = Number(stats.TotalFeedback || 0);

  return (
    <div className="fb-page">
      <Sidebar />
      <main className="fb-main">
        {toast && <div className={`fb-toast ${toast.type}`}>{toast.message}</div>}

        <section className="fb-hero">
          <div>
            <p className="fb-eyebrow">Feedback System</p>
            <h1>Quản lý đánh giá khách hàng</h1>
            <p>Theo dõi đánh giá sau khi booking hoàn tất, lọc theo số sao và xử lý phản hồi kém.</p>
          </div>
          <div className="fb-rating-card">
            <span>Điểm trung bình</span>
            <strong>{Number(stats.AverageRating || 0).toFixed(1)}</strong>
            {renderStars(Math.round(Number(stats.AverageRating || 0)))}
          </div>
        </section>

        <section className="fb-stat-grid">
          <article className="fb-stat-card">
            <span>Tổng feedback</span>
            <strong>{totalFeedback}</strong>
            <small>Toàn hệ thống</small>
          </article>
          <article className="fb-stat-card green">
            <span>5 sao</span>
            <strong>{Number(stats.FiveStar || 0)}</strong>
            <small>Khách hàng hài lòng</small>
          </article>
          <article className="fb-stat-card orange">
            <span>1-2 sao</span>
            <strong>{Number(stats.OneStar || 0) + Number(stats.TwoStar || 0)}</strong>
            <small>Cần kiểm tra dịch vụ</small>
          </article>
        </section>

        <section className="fb-layout">
          <aside className="fb-side-card">
            <h2>Thống kê sao</h2>
            <div className="fb-rating-bars">
              {starRows.map((item) => {
                const percent = totalFeedback ? Math.round((item.value / totalFeedback) * 100) : 0;
                return (
                  <div className="fb-bar-row" key={item.label}>
                    <div className="fb-bar-head">
                      <span>{item.label}</span>
                      <b>{item.value}</b>
                    </div>
                    <div className="fb-bar-track">
                      <div className="fb-bar-fill" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="fb-table-card">
            <div className="fb-toolbar">
              <div>
                <h2>Danh sách feedback</h2>
                <p>Booking chỉ có tối đa 1 feedback.</p>
              </div>
              <div className="fb-actions">
                <div className="fb-search">
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm comment, khách hàng, biển số..."
                  />
                </div>
                <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
                  <option value="all">Tất cả sao</option>
                  <option value="5">5 sao</option>
                  <option value="4">4 sao</option>
                  <option value="3">3 sao</option>
                  <option value="2">2 sao</option>
                  <option value="1">1 sao</option>
                </select>
                <button type="button" onClick={fetchFeedbacks} className="fb-refresh-btn">
                  <i className="fa-solid fa-rotate-right"></i>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="fb-empty">Đang tải feedback...</div>
            ) : feedbacks.length === 0 ? (
              <div className="fb-empty">Chưa có feedback phù hợp.</div>
            ) : (
              <div className="fb-table-wrap">
                <table className="fb-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Khách hàng</th>
                      <th>Booking</th>
                      <th>Đánh giá</th>
                      <th>Bình luận</th>
                      <th>Ngày tạo</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbacks.map((item) => (
                      <tr key={item.FeedbackID}>
                        <td><b>FB-{item.FeedbackID}</b></td>
                        <td>
                          <div className="fb-user-cell">
                            <strong>{item.CustomerName}</strong>
                            <span>{item.PhoneNumber || item.Email || "--"}</span>
                          </div>
                        </td>
                        <td>
                          <div className="fb-booking-cell">
                            <b>BK-{item.BookingID}</b>
                            <span>{item.ServiceName || item.VehicleType || "--"}</span>
                          </div>
                        </td>
                        <td>{renderStars(item.Rating)}</td>
                        <td className="fb-comment-cell">{item.Comment || "Không có bình luận"}</td>
                        <td>{formatDateTime(item.CreatedDate)}</td>
                        <td>
                          <div className="fb-row-actions">
                            <button type="button" onClick={() => setSelectedFeedback(item)} title="Xem chi tiết">
                              <i className="fa-solid fa-eye"></i>
                            </button>
                            <button type="button" onClick={() => setDeleteTarget(item)} className="danger" title="Xóa">
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </main>

      {selectedFeedback && (
        <div className="fb-modal-backdrop" onClick={() => setSelectedFeedback(null)}>
          <div className="fb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fb-modal-head">
              <h2>Chi tiết feedback</h2>
              <button type="button" onClick={() => setSelectedFeedback(null)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="fb-detail-grid">
              <div><span>Mã feedback</span><b>FB-{selectedFeedback.FeedbackID}</b></div>
              <div><span>Mã booking</span><b>BK-{selectedFeedback.BookingID}</b></div>
              <div><span>Khách hàng</span><b>{selectedFeedback.CustomerName}</b></div>
              <div><span>SĐT</span><b>{selectedFeedback.PhoneNumber || "--"}</b></div>
              <div><span>Dịch vụ</span><b>{selectedFeedback.ServiceName || "--"}</b></div>
              <div><span>Máy</span><b>{selectedFeedback.MachineName || "--"}</b></div>
              <div><span>Biển số</span><b>{selectedFeedback.LicensePlate || "--"}</b></div>
              <div><span>Trạng thái booking</span><b>{bookingStatus(selectedFeedback.BookingStatus)}</b></div>
              <div><span>Ngày booking</span><b>{formatDateTime(selectedFeedback.BookingDate)}</b></div>
              <div><span>Thành tiền</span><b>{money(selectedFeedback.FinalPrice || selectedFeedback.TotalPrice)}</b></div>
            </div>
            <div className="fb-detail-comment">
              <span>Đánh giá</span>
              {renderStars(selectedFeedback.Rating)}
              <p>{selectedFeedback.Comment || "Không có bình luận"}</p>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fb-modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="fb-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="fb-confirm-icon"><i className="fa-solid fa-triangle-exclamation"></i></div>
            <h2>Xóa feedback?</h2>
            <p>Feedback FB-{deleteTarget.FeedbackID} sẽ bị xóa khỏi hệ thống.</p>
            <div className="fb-confirm-actions">
              <button type="button" onClick={() => setDeleteTarget(null)}>Hủy</button>
              <button type="button" onClick={handleDelete} className="danger">Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const feedbackManagementCss = `
.fb-page{
    min-height:100vh;
    background:var(--bg-primary);
    font-family:'Plus Jakarta Sans',sans-serif;
    color:var(--text-primary)
}

.fb-main{
    margin-left:76px;
    padding:32px;
    min-height:100vh
}

.fb-toast{
    position:fixed;
    top:20px;
    right:24px;
    z-index:100;
    padding:14px 18px;
    border-radius:16px;
    color:#fff;
    font-weight:800;
    box-shadow:0 14px 40px rgba(15,23,42,.2)
}

.fb-toast.success{
    background:#0f9f6e
}

.fb-toast.error{
    background:#e5484d
}

.fb-hero{
    display:flex;
    justify-content:space-between;
    gap:24px;
    align-items:stretch;
    padding:32px;
    border-radius:28px;
    background:linear-gradient(135deg,#172033,#334155);
    color:#fff;
    box-shadow:0 24px 70px rgba(15,23,42,.22)
}

.fb-eyebrow{
    margin:0 0 8px;
    text-transform:uppercase;
    letter-spacing:.14em;
    font-size:12px;
    font-weight:900;
    opacity:.78
}

.fb-hero h1{
    margin:0;
    font-size:34px;
    color:#fff
}

.fb-hero p{
    margin:10px 0 0;
    opacity:.86;
    max-width:760px;
    color:#fff
}

.fb-rating-card{
    min-width:230px;
    border:1px solid rgba(255,255,255,.25);
    border-radius:24px;
    padding:22px;
    background:rgba(255,255,255,.12);
    backdrop-filter:blur(8px)
}

.fb-rating-card span{
    display:block;
    opacity:.82;
    color:#fff
}

.fb-rating-card strong{
    display:block;
    font-size:48px;
    line-height:1.1;
    margin:8px 0;
    color:#fff
}

.fb-stars{
    display:inline-flex;
    gap:3px;
    color:#f6b73c;
    white-space:nowrap
}

.fb-stat-grid{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:18px;
    margin:24px 0
}

.fb-stat-card{
    background:var(--bg-card);
    border:1px solid var(--border);
    border-radius:24px;
    padding:22px;
    box-shadow:0 18px 50px rgba(16,24,40,.07)
}

.fb-stat-card span{
    color:var(--text-secondary);
    font-weight:800
}

.fb-stat-card strong{
    display:block;
    font-size:34px;
    margin:8px 0 4px;
    color:var(--text-primary)
}

.fb-stat-card small{
    color:var(--text-secondary);
    font-weight:700
}

.fb-stat-card.green strong{
    color:#0f9f6e
}

.fb-stat-card.orange strong{
    color:#f59e0b
}

.fb-layout{
    display:grid;
    grid-template-columns:320px minmax(0,1fr);
    gap:24px
}

.fb-side-card,
.fb-table-card{
    background:var(--bg-card);
    border:1px solid var(--border);
    border-radius:26px;
    box-shadow:0 18px 50px rgba(16,24,40,.08)
}

.fb-side-card{
    padding:24px;
    height:max-content
}

.fb-side-card h2,
.fb-table-card h2{
    margin:0;
    font-size:22px;
    color:var(--text-primary)
}

.fb-rating-bars{
    display:grid;
    gap:16px;
    margin-top:20px
}

.fb-bar-head{
    display:flex;
    justify-content:space-between;
    font-weight:800;
    color:var(--text-primary)
}

.fb-bar-track{
    height:10px;
    background:var(--bg-secondary);
    border-radius:999px;
    overflow:hidden;
    margin-top:8px
}

.fb-bar-fill{
    height:100%;
    background:linear-gradient(90deg,#f59e0b,#f6c34a);
    border-radius:999px
}

.fb-table-card{
    padding:24px
}

.fb-toolbar{
    display:flex;
    justify-content:space-between;
    gap:16px;
    align-items:flex-start;
    margin-bottom:18px
}

.fb-toolbar p{
    margin:6px 0 0;
    color:var(--text-secondary)
}

.fb-actions{
    display:flex;
    gap:10px;
    align-items:center;
    flex-wrap:wrap;
    justify-content:flex-end
}

.fb-search{
    height:46px;
    display:flex;
    align-items:center;
    gap:10px;
    padding:0 14px;
    border:1px solid var(--border);
    border-radius:16px;
    background:var(--bg-secondary);
    min-width:300px;
    color:var(--text-primary)
}

.fb-search input{
    border:0;
    outline:0;
    background:transparent;
    width:100%;
    font-weight:700;
    color:var(--text-primary)
}

.fb-search input::placeholder{
    color:var(--text-secondary)
}

.fb-actions select{
    height:46px;
    border:1px solid var(--border);
    border-radius:16px;
    padding:0 14px;
    background:var(--bg-secondary);
    font-weight:800;
    color:var(--text-primary)
}

.fb-refresh-btn{
    height:46px;
    width:46px;
    border:0;
    border-radius:16px;
    background:var(--accent);
    color:#fff;
    cursor:pointer
}

.fb-empty{
    padding:44px;
    text-align:center;
    color:var(--text-secondary);
    font-weight:800;
    background:var(--bg-secondary);
    border-radius:20px
}

.fb-table-wrap{
    overflow:auto
}

.fb-table{
    width:100%;
    border-collapse:separate;
    border-spacing:0 10px
}

.fb-table th{
    text-align:left;
    color:var(--text-secondary);
    font-size:12px;
    text-transform:uppercase;
    letter-spacing:.08em;
    padding:0 14px
}

.fb-table td{
    background:var(--bg-secondary);
    color:var(--text-primary);
    padding:16px 14px;
    border-top:1px solid var(--border);
    border-bottom:1px solid var(--border);
    vertical-align:middle
}

.fb-table td:first-child{
    border-left:1px solid var(--border);
    border-radius:16px 0 0 16px
}

.fb-table td:last-child{
    border-right:1px solid var(--border);
    border-radius:0 16px 16px 0
}

.fb-user-cell,
.fb-booking-cell{
    display:flex;
    flex-direction:column;
    gap:4px
}

.fb-user-cell strong,
.fb-booking-cell b{
    color:var(--text-primary)
}

.fb-user-cell span,
.fb-booking-cell span{
    color:var(--text-secondary);
    font-size:13px;
    font-weight:700
}

.fb-comment-cell{
    max-width:320px;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    color:var(--text-primary);
    font-weight:700
}

.fb-row-actions{
    display:flex;
    gap:8px
}

.fb-row-actions button{
    width:38px;
    height:38px;
    border:0;
    border-radius:12px;
    background:rgba(59,130,246,.16);
    color:#2563eb;
    cursor:pointer
}

.fb-row-actions button.danger{
    background:rgba(220,38,38,.16);
    color:#dc2626
}

.fb-modal-backdrop{
    position:fixed;
    inset:0;
    background:rgba(15,23,42,.55);
    z-index:90;
    display:grid;
    place-items:center;
    padding:20px
}

.fb-modal,
.fb-confirm{
    width:min(760px,96vw);
    background:var(--bg-card);
    color:var(--text-primary);
    border:1px solid var(--border);
    border-radius:26px;
    padding:24px;
    box-shadow:0 30px 90px rgba(15,23,42,.35)
}

.fb-modal-head{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:18px
}

.fb-modal-head h2,
.fb-confirm h2{
    margin:0;
    color:var(--text-primary)
}

.fb-modal-head button{
    width:40px;
    height:40px;
    border:0;
    border-radius:14px;
    background:var(--bg-secondary);
    color:var(--text-primary);
    cursor:pointer
}

.fb-detail-grid{
    display:grid;
    grid-template-columns:repeat(2,1fr);
    gap:12px
}

.fb-detail-grid div{
    padding:14px;
    border:1px solid var(--border);
    border-radius:16px;
    background:var(--bg-secondary)
}

.fb-detail-grid span,
.fb-detail-comment span{
    display:block;
    color:var(--text-secondary);
    font-size:12px;
    font-weight:900;
    text-transform:uppercase;
    letter-spacing:.06em;
    margin-bottom:6px
}

.fb-detail-grid b{
    color:var(--text-primary)
}

.fb-detail-comment{
    margin-top:14px;
    padding:16px;
    border-radius:18px;
    background:var(--bg-secondary);
    border:1px solid var(--border)
}

.fb-detail-comment p{
    margin:12px 0 0;
    line-height:1.6;
    color:var(--text-primary);
    font-weight:700
}

.fb-confirm{
    text-align:center;
    max-width:420px
}

.fb-confirm-icon{
    width:70px;
    height:70px;
    margin:0 auto 14px;
    border-radius:24px;
    display:grid;
    place-items:center;
    background:rgba(220,38,38,.16);
    color:#dc2626;
    font-size:30px
}

.fb-confirm p{
    color:var(--text-secondary);
    font-weight:700
}

.fb-confirm-actions{
    display:flex;
    gap:12px;
    margin-top:22px
}

.fb-confirm-actions button{
    flex:1;
    border:0;
    border-radius:16px;
    padding:13px 16px;
    font-weight:900;
    cursor:pointer;
    background:var(--bg-secondary);
    color:var(--text-primary)
}

.fb-confirm-actions button.danger{
    background:#dc2626;
    color:#fff
}

@media(max-width:1100px){
    .fb-main{
        margin-left:0;
        padding:18px
    }

    .fb-hero,
    .fb-toolbar{
        flex-direction:column
    }

    .fb-stat-grid,
    .fb-layout{
        grid-template-columns:1fr
    }

    .fb-actions{
        width:100%;
        justify-content:flex-start
    }

    .fb-search{
        min-width:100%;
        width:100%
    }

    .fb-detail-grid{
        grid-template-columns:1fr
    }
}
`;
 