import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import SurveyPage from "./SurveyPage";

const API_BASE = "http://127.0.0.1:5000/api";

const DEFAULT_FORM = {
  title: "Khảo Sát Khách Hàng Dịch Vụ Rửa Xe",
  description:
    "Khảo sát người dùng ngoài hệ thống để bổ sung external research dataset cho đề tài loyalty tier progression.",
  formUrl: "",
  responseSheetUrl: "",
  targetAudience: "Sinh viên FPT, nhân viên FPT, chủ xe, người dùng dịch vụ rửa xe",
  status: true,
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token") || localStorage.getItem("TOKEN") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const css = `
.survey-page { min-height: 100vh; background: #0f172a; color: #e2e8f0; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
.survey-content { margin-left: var(--sidebar-collapsed-width, 76px); min-height: 100vh; padding: 36px 40px; box-sizing: border-box; display: flex; justify-content: center; }
.survey-inner { width: 100%; max-width: 1080px; }
.survey-eyebrow { display: inline-flex; align-items: center; gap: 8px; background: rgba(16,185,129,.12); color: #34d399; padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 800; border: 1px solid rgba(16,185,129,.22); }
.survey-title { margin: 14px 0 6px; font-size: 30px; color: #f8fafc; font-weight: 900; }
.survey-subtitle { margin: 0 0 24px; color: #94a3b8; max-width: 850px; line-height: 1.6; }
.survey-panel { background: #1e293b; border: 1px solid rgba(255,255,255,.07); border-radius: 20px; padding: 22px; margin-bottom: 20px; box-shadow: 0 18px 40px rgba(0,0,0,.16); }
.survey-panel-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 18px; }
.survey-panel-header h2 { margin: 0 0 6px; font-size: 18px; color: #f8fafc; }
.survey-panel-header p { margin: 0; color: #94a3b8; line-height: 1.55; }
.survey-section-kicker { color: #34d399 !important; font-weight: 900; text-transform: uppercase; font-size: 12px; letter-spacing: .05em; margin-bottom: 6px !important; }
.survey-status { padding: 7px 12px; border-radius: 999px; font-size: 12px; font-weight: 900; white-space: nowrap; }
.survey-status.active { color: #34d399; background: rgba(16,185,129,.12); border: 1px solid rgba(16,185,129,.25); }
.survey-status.inactive { color: #f87171; background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.25); }
.survey-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.survey-form-grid label { display: flex; flex-direction: column; gap: 7px; color: #94a3b8; font-size: 13px; font-weight: 700; }
.survey-form-grid label.full { grid-column: 1 / -1; }
.survey-form-grid input, .survey-form-grid textarea { background: #0f172a; border: 1px solid rgba(255,255,255,.09); border-radius: 12px; color: #e2e8f0; padding: 11px 12px; outline: none; font-family: inherit; font-size: 13px; }
.survey-form-grid input:focus, .survey-form-grid textarea:focus { border-color: rgba(16,185,129,.55); }
.survey-checkbox { grid-column: 1 / -1; flex-direction: row !important; align-items: center; }
.survey-checkbox input { width: 16px; height: 16px; }
.survey-actions, .dataset-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
button { font-family: inherit; }
.btn-primary, .btn-secondary { border: none; border-radius: 12px; padding: 10px 16px; font-size: 13px; font-weight: 900; cursor: pointer; color: #fff; }
.btn-primary { background: linear-gradient(135deg, #10b981, #059669); }
.btn-secondary { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.10); color: #e2e8f0; }
button:disabled { opacity: .5; cursor: not-allowed; }
.dataset-layout { display: grid; grid-template-columns: 1.1fr .9fr; gap: 16px; }
.dataset-list { margin: 14px 0 0; padding-left: 18px; color: #94a3b8; line-height: 1.75; font-size: 13px; }
.survey-current-card { background: #1e293b; border: 1px solid rgba(255,255,255,.08); border-radius: 18px; padding: 20px; }
.survey-current-card .icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 18px; background: rgba(16,185,129,.16); color: #34d399; }
.survey-label { color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; margin: 0; }
.survey-value { color: #f8fafc; font-size: 26px; font-weight: 900; margin: 6px 0 0; }
.survey-sub { color: #64748b; font-size: 12px; margin: 4px 0 0; }
.toast { position: fixed; top: 22px; right: 28px; z-index: 9999; padding: 12px 18px; border-radius: 12px; font-weight: 900; color: white; box-shadow: 0 18px 40px rgba(0,0,0,.35); }
.toast.success { background: #059669; }
.toast.error { background: #dc2626; }
@media (max-width: 1000px) {
  .survey-content { padding: 24px 18px; }
  .dataset-layout, .survey-form-grid { grid-template-columns: 1fr; }
}
`;

export default function SurveyDashboard() {
  const [form, setForm] = useState(null);
  const [draft, setDraft] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = css;
    document.head.appendChild(style);

    const font = document.createElement("link");
    font.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap";
    font.rel = "stylesheet";
    document.head.appendChild(font);

    const icons = document.createElement("link");
    icons.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    icons.rel = "stylesheet";
    document.head.appendChild(icons);

    return () => style.remove();
  }, []);

  const fetchForm = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/surveys/form`, { headers: getAuthHeaders() });
      const formData = res.data?.data || DEFAULT_FORM;
      setForm(formData.SurveyFormID ? formData : null);
      setDraft({
        title: formData.title || DEFAULT_FORM.title,
        description: formData.description || DEFAULT_FORM.description,
        formUrl: formData.formUrl || DEFAULT_FORM.formUrl,
        responseSheetUrl: formData.responseSheetUrl || "",
        targetAudience: formData.targetAudience || DEFAULT_FORM.targetAudience,
        status: formData.status !== false,
      });
    } catch (err) {
      console.error(err);
      showToast("Không thể tải thông tin survey form", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForm();
  }, []);

  const handleSaveForm = async () => {
    setSaving(true);
    try {
      const res = form?.SurveyFormID
        ? await axios.put(`${API_BASE}/surveys/form/${form.SurveyFormID}`, draft, { headers: getAuthHeaders() })
        : await axios.post(`${API_BASE}/surveys/form`, draft, { headers: getAuthHeaders() });

      const saved = res.data?.data;
      setForm(saved);
      setDraft({
        title: saved.title,
        description: saved.description,
        formUrl: saved.formUrl,
        responseSheetUrl: saved.responseSheetUrl,
        targetAudience: saved.targetAudience,
        status: saved.status,
      });
      showToast("Đã lưu thông tin survey form");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Lưu survey form thất bại", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="survey-page">
      <Sidebar />
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <main className="survey-content">
        <div className="survey-inner">
          <div className="survey-eyebrow">
            <i className="fa-solid fa-clipboard-question"></i>
            Survey Data Collection
          </div>

          <h1 className="survey-title">External Survey Collection</h1>
          <p className="survey-subtitle">
            Module này quản lý Google Form và Response Sheet để thu thập khảo sát ngoài hệ thống
            từ sinh viên FPT, chủ xe và người dùng dịch vụ rửa xe.
          </p>

          <SurveyPage
            form={form}
            draft={draft}
            setDraft={setDraft}
            onSave={handleSaveForm}
            saving={saving}
          />

          <section className="survey-panel">
            <div className="survey-panel-header">
              <div>
                <p className="survey-section-kicker">Collection action panel</p>
                <h2>External Survey Collection</h2>
                <p>
                  Sau khi cấu hình form, admin/staff mở Google Form để gửi người dùng điền
                  hoặc mở Response Sheet để kiểm tra dữ liệu khảo sát đã thu thập.
                </p>
              </div>
            </div>

            <div className="dataset-layout">
              <div>
                <ul className="dataset-list">
                  <li>Đối tượng: {draft.targetAudience || "Chưa cấu hình"}</li>
                  <li>Mục tiêu: thu thập dữ liệu ngoài hệ thống phục vụ research dataset.</li>
                  <li>Output: Google Sheet/CSV chứa responses từ Google Form.</li>
                </ul>

                <div className="dataset-actions">
                  <button
                    className="btn-primary"
                    disabled={!draft.formUrl}
                    onClick={() => window.open(draft.formUrl, "_blank", "noopener,noreferrer")}
                  >
                    Mở form khảo sát
                  </button>

                  <button
                    className="btn-secondary"
                    disabled={!draft.responseSheetUrl}
                    onClick={() => window.open(draft.responseSheetUrl, "_blank", "noopener,noreferrer")}
                  >
                    Mở response sheet
                  </button>
                </div>
              </div>

              <div className="survey-current-card">
                <div className="icon"><i className="fa-solid fa-link"></i></div>
                <p className="survey-label">Current form</p>
                <p className="survey-value">{loading ? "—" : draft.status ? "Active" : "Inactive"}</p>
                <p className="survey-sub">{draft.title || "No title"}</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
