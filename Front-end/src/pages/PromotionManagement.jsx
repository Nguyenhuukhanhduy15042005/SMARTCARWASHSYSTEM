import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://127.0.0.1:5000/api";
const emptyForm = { PromoName: "", DiscountPercent: 10, EndDate: "" };

export default function PromotionManagement() {
  const [promotions, setPromotions] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [expireTarget, setExpireTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

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
    style.innerHTML = promotionManagementCss;
    document.head.appendChild(style);

    fetchPromotions();
    return () => style.remove();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchPromotions(), 350);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const getHeaders = () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("TOKEN");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await axios.get(`${API_BASE}/promotions`, {
        params,
        headers: getHeaders(),
      });
      setPromotions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      showToast(
        err.response?.data?.message || "Không tải được danh sách khuyến mãi",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalMode("create");
  };

  const openEdit = (promotion) => {
    setForm({
      PromoName: promotion.PromoName || "",
      DiscountPercent: Number(promotion.DiscountPercent || 0),
      EndDate: promotion.EndDate
        ? new Date(promotion.EndDate).toISOString().slice(0, 10)
        : "",
    });
    setEditingId(promotion.PromotionID);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setForm(emptyForm);
  };

  const validateForm = () => {
    if (!form.PromoName.trim()) {
      showToast("Tên khuyến mãi không được để trống", "error");
      return false;
    }
    const discount = Number(form.DiscountPercent);
    if (Number.isNaN(discount) || discount < 0 || discount > 100) {
      showToast("Phần trăm giảm phải từ 0 đến 100", "error");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      PromoName: form.PromoName.trim(),
      DiscountPercent: Number(form.DiscountPercent),
      EndDate: form.EndDate || null,
    };

    try {
      if (modalMode === "edit") {
        await axios.put(`${API_BASE}/promotions/${editingId}`, payload, {
          headers: getHeaders(),
        });
        showToast("Cập nhật khuyến mãi thành công");
      } else {
        await axios.post(`${API_BASE}/promotions`, payload, {
          headers: getHeaders(),
        });
        showToast("Tạo khuyến mãi thành công");
      }
      closeModal();
      fetchPromotions();
    } catch (err) {
      console.error(err);
      showToast(
        err.response?.data?.message || "Lưu khuyến mãi thất bại",
        "error",
      );
    }
  };

  const handleExpire = async () => {
    if (!expireTarget) return;
    try {
      await axios.patch(
        `${API_BASE}/promotions/${expireTarget.PromotionID}/expire`,
        {},
        { headers: getHeaders() },
      );
      showToast("Đã chuyển khuyến mãi sang hết hạn");
      setExpireTarget(null);
      fetchPromotions();
    } catch (err) {
      console.error(err);
      showToast(
        err.response?.data?.message || "Tắt khuyến mãi thất bại",
        "error",
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await axios.delete(`${API_BASE}/promotions/${deleteTarget.PromotionID}`, {
        headers: getHeaders(),
      });

      showToast("Xóa khuyến mãi thành công");
      setDeleteTarget(null);
      fetchPromotions();
    } catch (err) {
      console.error(err);
      showToast(
        err.response?.data?.message || "Xóa khuyến mãi thất bại",
        "error",
      );
    }
  };


  const formatDate = (value) => {
    if (!value) return "Không giới hạn";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  };

  const stats = useMemo(() => {
    const total = promotions.length;
    const active = promotions.filter((p) => p.Status === "Active").length;
    const expired = promotions.filter((p) => p.Status === "Expired").length;
    const avgDiscount = total
      ? promotions.reduce((sum, p) => sum + Number(p.DiscountPercent || 0), 0) /
        total
      : 0;
    return { total, active, expired, avgDiscount };
  }, [promotions]);

  return (
    <div className="pm-page">
      <Sidebar />
      <main className="pm-main">
        {toast && (
          <div className={`pm-toast ${toast.type}`}>{toast.message}</div>
        )}

        <section className="pm-hero">
          <div>
            <p className="pm-eyebrow">Promotion Management</p>
            <h1>Quản lý khuyến mãi</h1>
            <p>
              Tạo, cập nhật và theo dõi mã giảm giá đang áp dụng trong hệ thống.
            </p>
          </div>
          <button type="button" className="pm-create-btn" onClick={openCreate}>
            <i className="fa-solid fa-plus"></i>
            Thêm khuyến mãi
          </button>
        </section>

        <section className="pm-stat-grid">
          <article className="pm-stat-card">
            <span>Tổng khuyến mãi</span>
            <strong>{stats.total}</strong>
            <small>Đang quản lý</small>
          </article>
          <article className="pm-stat-card green">
            <span>Đang hiệu lực</span>
            <strong>{stats.active}</strong>
            <small>Còn hạn sử dụng</small>
          </article>
          <article className="pm-stat-card orange">
            <span>Hết hạn</span>
            <strong>{stats.expired}</strong>
            <small>Cần kiểm tra</small>
          </article>
          <article className="pm-stat-card blue">
            <span>Giảm TB</span>
            <strong>{stats.avgDiscount.toFixed(1)}%</strong>
            <small>Trên danh sách hiện tại</small>
          </article>
        </section>

        <section className="pm-table-card">
          <div className="pm-toolbar">
            <div>
              <h2>Danh sách khuyến mãi</h2>
              <p>
                Không xóa cứng để tránh lỗi khóa ngoại với MEMBER_PROMOTION.
              </p>
            </div>
            <div className="pm-actions">
              <div className="pm-search">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm tên khuyến mãi..."
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="active">Đang hiệu lực</option>
                <option value="expired">Hết hạn</option>
              </select>
              <button
                type="button"
                onClick={fetchPromotions}
                className="pm-refresh-btn"
              >
                <i className="fa-solid fa-rotate-right"></i>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="pm-empty">Đang tải khuyến mãi...</div>
          ) : promotions.length === 0 ? (
            <div className="pm-empty">Chưa có khuyến mãi phù hợp.</div>
          ) : (
            <div className="pm-table-wrap">
              <table className="pm-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tên khuyến mãi</th>
                    <th>Giảm giá</th>
                    <th>Ngày hết hạn</th>
                    <th>Trạng thái</th>
                    <th>Ví member</th>
                    <th>Đã dùng</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((item) => (
                    <tr key={item.PromotionID}>
                      <td>
                        <b>PR-{item.PromotionID}</b>
                      </td>
                      <td>
                        <div className="pm-name-cell">
                          <strong>{item.PromoName}</strong>
                          <span>Khuyến mãi hệ thống</span>
                        </div>
                      </td>
                      <td>
                        <span className="pm-discount">
                          -{Number(item.DiscountPercent || 0)}%
                        </span>
                      </td>
                      <td>{formatDate(item.EndDate)}</td>
                      <td>
                        <span
                          className={`pm-status ${item.Status === "Active" ? "active" : "expired"}`}
                        >
                          {item.Status === "Active"
                            ? "Đang hiệu lực"
                            : "Hết hạn"}
                        </span>
                      </td>
                      <td>{item.WalletCount || 0}</td>
                      <td>{item.UsedCount || 0}</td>
                      <td>
                        <div className="pm-row-actions">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            title="Sửa"
                          >
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpireTarget(item)}
                            className="warning"
                            disabled={item.Status === "Expired"}
                            title="Chuyển hết hạn"
                          >
                            <i className="fa-solid fa-ban"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="danger"
                            disabled={Number(item.WalletCount || 0) > 0}
                            title={
                              Number(item.WalletCount || 0) > 0
                                ? "Không thể xóa vì đã nằm trong ví member"
                                : "Xóa khuyến mãi"
                            }
                          >
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
      </main>

      {modalMode && (
        <div className="pm-modal-backdrop" onClick={closeModal}>
          <form
            className="pm-modal"
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pm-modal-head">
              <h2>
                {modalMode === "edit"
                  ? "Cập nhật khuyến mãi"
                  : "Thêm khuyến mãi"}
              </h2>
              <button type="button" onClick={closeModal}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <label className="pm-form-group">
              <span>Tên khuyến mãi</span>
              <input
                value={form.PromoName}
                onChange={(e) =>
                  setForm({ ...form, PromoName: e.target.value })
                }
                placeholder="VD: Summer Wash 20%"
                maxLength={255}
              />
            </label>

            <label className="pm-form-group">
              <span>Phần trăm giảm</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.DiscountPercent}
                onChange={(e) =>
                  setForm({ ...form, DiscountPercent: e.target.value })
                }
              />
            </label>

            <label className="pm-form-group">
              <span>Ngày hết hạn</span>
              <input
                type="date"
                value={form.EndDate}
                onChange={(e) => setForm({ ...form, EndDate: e.target.value })}
              />
            </label>

            <div className="pm-modal-actions">
              <button type="button" onClick={closeModal}>
                Hủy
              </button>
              <button type="submit" className="primary">
                {modalMode === "edit" ? "Lưu thay đổi" : "Tạo mới"}
              </button>
            </div>
          </form>
        </div>
      )}

      {expireTarget && (
        <div
          className="pm-modal-backdrop"
          onClick={() => setExpireTarget(null)}
        >
          <div className="pm-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="pm-confirm-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h2>Chuyển khuyến mãi sang hết hạn?</h2>
            <p>
              {expireTarget.PromoName} sẽ không còn được xem là promotion
              active.
            </p>
            <div className="pm-confirm-actions">
              <button type="button" onClick={() => setExpireTarget(null)}>
                Hủy
              </button>
              <button type="button" className="danger" onClick={handleExpire}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteTarget && (
        <div
          className="pm-modal-backdrop"
          onClick={() => setDeleteTarget(null)}
        >
          <div className="pm-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="pm-confirm-icon danger">
              <i className="fa-solid fa-trash"></i>
            </div>
            <h2>Xóa khuyến mãi?</h2>
            <p>
              {deleteTarget.PromoName} sẽ bị xóa vĩnh viễn khỏi hệ thống.
              Chỉ xóa được khuyến mãi chưa nằm trong ví member.
            </p>
            <div className="pm-confirm-actions">
              <button type="button" onClick={() => setDeleteTarget(null)}>
                Hủy
              </button>
              <button type="button" className="danger" onClick={handleDelete}>
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const promotionManagementCss = ` .pm-page{
    min-height:100vh;
    background:var(--bg-primary);
    font-family:'Plus Jakarta Sans',sans-serif;
    color:var(--text-primary)
}
.pm-main{
    margin-left:76px;
    padding:32px;
    min-height:100vh
}
.pm-toast{
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
.pm-toast.success{
    background:#0f9f6e
}
.pm-toast.error{
    background:#e5484d
}
.pm-hero{
    display:flex;
    justify-content:space-between;
    gap:24px;
    align-items:center;
    padding:32px;
    border-radius:28px;
    background:linear-gradient(135deg,#7c3aed,#2563eb);
    color:#fff;
    box-shadow:0 24px 70px rgba(37,99,235,.22)
}
.pm-eyebrow{
    margin:0 0 8px;
    text-transform:uppercase;
    letter-spacing:.14em;
    font-size:12px;
    font-weight:900;
    opacity:.78
}
.pm-hero h1{
    margin:0;
    font-size:34px
}
.pm-hero p{
    margin:10px 0 0;
    opacity:.86
}
.pm-create-btn{
    border:0;
    border-radius:18px;
    padding:15px 18px;
    background:#fff;
    color:#172033;
    font-weight:900;
    display:flex;
    align-items:center;
    gap:10px;
    cursor:pointer;
    box-shadow:0 14px 34px rgba(15,23,42,.18)
}
.pm-stat-grid{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:18px;
    margin:24px 0
}
.pm-stat-card{
    background:var(--bg-card);
    border:1px solid var(--border);
    border-radius:24px;
    padding:22px;
    box-shadow:0 18px 50px rgba(16,24,40,.07)
}
.pm-stat-card span{
    color:var(--text-secondary);
    font-weight:800
}
.pm-stat-card strong{
    display:block;
    font-size:32px;
    margin:8px 0 4px
}
.pm-stat-card small{
    color:var(--text-secondary);
    font-weight:700
}
.pm-stat-card.green strong{
    color:#0f9f6e
}
.pm-stat-card.orange strong{
    color:#f59e0b
}
.pm-stat-card.blue strong{
    color:#2563eb
}
.pm-table-card{
    background:var(--bg-card);
    border:1px solid #e6edf5;
    border-radius:26px;
    box-shadow:0 18px 50px rgba(16,24,40,.08);
    padding:24px
}
.pm-toolbar{
    display:flex;
    justify-content:space-between;
    gap:16px;
    align-items:flex-start;
    margin-bottom:18px
}
.pm-toolbar h2{
    margin:0;
    font-size:22px
}
.pm-toolbar p{
    margin:6px 0 0;
    color:#687386
}
.pm-actions{
    display:flex;
    gap:10px;
    align-items:center;
    flex-wrap:wrap;
    justify-content:flex-end
}
.pm-search{
    height:46px;
    display:flex;
    align-items:center;
    gap:10px;
    padding:0 14px;
    border:1px solid #dce5ef;
    border-radius:16px;
    background:#f8fafc;
    min-width:280px
}
.pm-search input{
    border:0;
    outline:0;
    background:transparent;
    width:100%;
    font-weight:700;
    color:#172033
}
.pm-actions select{
    height:46px;
    border:1px solid #dce5ef;
    border-radius:16px;
    padding:0 14px;
    background:#fff;
    font-weight:800;
    color:#172033
}
.pm-refresh-btn{
    height:46px;
    width:46px;
    border:0;
    border-radius:16px;
    background:#172033;
    color:#fff;
    cursor:pointer
}
.pm-empty{
    padding:44px;
    text-align:center;
    color:#64748b;
    font-weight:800;
    background:#f8fafc;
    border-radius:20px
}
.pm-table-wrap{
    overflow:auto
}
.pm-table{
    width:100%;
    border-collapse:separate;
    border-spacing:0 10px
}
.pm-table th{
    text-align:left;
    color:#64748b;
    font-size:12px;
    text-transform:uppercase;
    letter-spacing:.08em;
    padding:0 14px
}
.pm-table td{
    background:var(--bg-secondary);
    padding:16px 14px;
    border-top:1px solid #edf2f7;
    border-bottom:1px solid #edf2f7;
    vertical-align:middle
}
.pm-table td b{
    color:var(--text-primary)
}
.pm-table td:first-child{
    border-left:1px solid #edf2f7;
    border-radius:16px 0 0 16px
}
.pm-table td:last-child{
    border-right:1px solid #edf2f7;
    border-radius:0 16px 16px 0
}
.pm-name-cell{
    display:flex;
    flex-direction:column;
    gap:4px
}
.pm-name-cell strong{
    color:var(--text-primary);
}
.pm-name-cell span{
    color:#64748b;
    font-size:13px;
    font-weight:700
}
.pm-discount{
    display:inline-flex;
    padding:8px 12px;
    border-radius:999px;
    background:#ede9fe;
    color:#6d28d9;
    font-weight:900
}
.pm-status{
    display:inline-flex;
    padding:8px 12px;
    border-radius:999px;
    font-weight:900;
    font-size:13px
}
.pm-status.active{
    background:#dcfce7;
    color:#15803d
}
.pm-status.expired{
    background:#fee2e2;
    color:#b91c1c
}
.pm-row-actions{
    display:flex;
    gap:8px
}
.pm-row-actions button{
    width:38px;
    height:38px;
    border:0;
    border-radius:12px;
    background:#e7f0ff;
    color:#2563eb;
    cursor:pointer
}
.pm-row-actions button.warning{
    background:#fff7ed;
    color:#ea580c
}
.pm-row-actions button.danger{
    background:#fee2e2;
    color:#dc2626
}
.pm-row-actions button:disabled{
    opacity:.45;
    cursor:not-allowed
}
.pm-modal-backdrop{
    position:fixed;
    inset:0;
    background:rgba(15,23,42,.55);
    z-index:90;
    display:grid;
    place-items:center;
    padding:20px
}
.pm-modal,.pm-confirm{
    width:min(520px,96vw);
    background:#fff;
    border-radius:26px;
    padding:24px;
    box-shadow:0 30px 90px rgba(15,23,42,.35)
}
.pm-modal-head{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:18px
}
.pm-modal-head h2,.pm-confirm h2{
    margin:0
}
.pm-modal-head button{
    width:40px;
    height:40px;
    border:0;
    border-radius:14px;
    background:#f1f5f9;
    cursor:pointer
}
.pm-form-group{
    display:grid;
    gap:8px;
    margin-bottom:16px
}
.pm-form-group span{
    font-weight:900;
    color:#334155
}
.pm-form-group input{
    height:48px;
    border:1px solid #dce5ef;
    border-radius:16px;
    padding:0 14px;
    font-weight:800;
    color:#172033;
    outline:none
}
.pm-form-group input:focus{
    border-color:#7c3aed;
    box-shadow:0 0 0 4px rgba(124,58,237,.12)
}
.pm-modal-actions,.pm-confirm-actions{
    display:flex;
    gap:12px;
    margin-top:20px
}
.pm-modal-actions button,.pm-confirm-actions button{
    flex:1;
    border:0;
    border-radius:16px;
    padding:13px 16px;
    font-weight:900;
    cursor:pointer;
    background:#e2e8f0;
    color:#172033
}
.pm-modal-actions button.primary{
    background:#7c3aed;
    color:#fff
}
.pm-confirm{
    text-align:center
}
.pm-confirm-icon{
    width:70px;
    height:70px;
    margin:0 auto 14px;
    border-radius:24px;
    display:grid;
    place-items:center;
    background:#fff7ed;
    color:#ea580c;
    font-size:30px
}
.pm-confirm-icon.danger{
    background:#fee2e2;
    color:#dc2626
}
.pm-confirm p{
    color:#64748b;
    font-weight:700
}
.pm-confirm-actions button.danger{
    background:#ea580c;
    color:#fff
}
@media(max-width:1100px){
    .pm-main{
        margin-left:0;
        padding:18px
    }
    .pm-hero,.pm-toolbar{
        flex-direction:column;
        align-items:stretch
    }
    .pm-stat-grid{
        grid-template-columns:1fr 1fr
    }
    .pm-actions{
        width:100%;
        justify-content:flex-start
    }
    .pm-search{
        min-width:100%;
        width:100%
    }
}
@media(max-width:700px){
    .pm-stat-grid{
        grid-template-columns:1fr
    }
}
`;
 