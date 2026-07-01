import React from "react";

export default function SurveyPage({ form, draft, setDraft, onSave, saving }) {
  const value = draft || {
    title: "",
    description: "",
    formUrl: "",
    responseSheetUrl: "",
    targetAudience: "",
    status: true,
  };

  const update = (field, fieldValue) => {
    setDraft((prev) => ({ ...prev, [field]: fieldValue }));
  };

  const hasExistingForm = Boolean(form?.SurveyFormID);

  return (
    <section className="survey-panel">
      <div className="survey-panel-header">
        <div>
          <p className="survey-section-kicker">External survey source</p>
          <h2>Survey Form Management</h2>
          <p>
            Khu vực cấu hình nguồn khảo sát bên ngoài. Admin lưu Google Form URL, Google Sheet/Response URL,
            đối tượng khảo sát và trạng thái kích hoạt tại đây.
          </p>
        </div>

        <div className={`survey-status ${value.status ? "active" : "inactive"}`}>
          {value.status ? "Active" : "Inactive"}
        </div>
      </div>

      <div className="survey-form-grid">
        <label>
          <span>Tiêu đề khảo sát</span>
          <input
            value={value.title || ""}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Khảo Sát Khách Hàng Dịch Vụ Rửa Xe"
          />
        </label>

        <label>
          <span>Đối tượng khảo sát</span>
          <input
            value={value.targetAudience || ""}
            onChange={(e) => update("targetAudience", e.target.value)}
            placeholder="Sinh viên FPT, chủ xe, người dùng dịch vụ rửa xe"
          />
        </label>

        <label className="full">
          <span>Google Form URL</span>
          <input
            value={value.formUrl || ""}
            onChange={(e) => update("formUrl", e.target.value)}
            placeholder="https://docs.google.com/forms/..."
          />
        </label>

        <label className="full">
          <span>Google Sheet / Response URL <small style={{ color: "#64748b", fontWeight: 600 }}>(nơi lưu câu trả lời)</small></span>
          <input
            value={value.responseSheetUrl || ""}
            onChange={(e) => update("responseSheetUrl", e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/... (không bắt buộc)"
          />
        </label>

        <label className="full">
          <span>Mô tả</span>
          <textarea
            value={value.description || ""}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            placeholder="Mô tả mục tiêu khảo sát..."
          />
        </label>

        <label className="survey-checkbox">
          <input
            type="checkbox"
            checked={Boolean(value.status)}
            onChange={(e) => update("status", e.target.checked)}
          />
          <span>Kích hoạt form khảo sát này</span>
        </label>
      </div>

      <div className="survey-actions">
        <button
          className="btn-primary"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Đang lưu..." : hasExistingForm ? "Cập nhật form" : "Tạo form"}
        </button>

      </div>
    </section>
  );
}
