const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../db");

const DEFAULT_SURVEY_FORM = {
  title: "Khảo Sát Khách Hàng Dịch Vụ Rửa Xe",
  description:
    "Khảo sát người dùng ngoài hệ thống để bổ sung external research dataset cho đề tài loyalty tier progression.",
  formUrl: "",
  responseSheetUrl: "",
  targetAudience: "Sinh viên FPT, nhân viên FPT, chủ xe, người dùng dịch vụ rửa xe",
  status: true,
};

function normalizeText(value, maxLength = 1000) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeUrl(value, maxLength = 2000) {
  const url = normalizeText(value, maxLength);
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch (_) {
    return "";
  }
}

function normalizeBool(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  if (value === false || value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

async function ensureSurveyFormTable(pool) {
  await pool.request().query(`
    IF OBJECT_ID('dbo.SURVEY_FORM', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.SURVEY_FORM (
        SurveyFormID INT IDENTITY(1,1) PRIMARY KEY,
        Title NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX),
        FormUrl NVARCHAR(MAX) NOT NULL,
        ResponseSheetUrl NVARCHAR(MAX),
        TargetAudience NVARCHAR(255),
        Status BIT DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL
      );
    END
  `);
}

function mapSurveyForm(row) {
  if (!row) return null;
  return {
    SurveyFormID: row.SurveyFormID,
    title: row.Title,
    description: row.Description || "",
    formUrl: row.FormUrl,
    responseSheetUrl: row.ResponseSheetUrl || "",
    targetAudience: row.TargetAudience || "",
    status: Boolean(row.Status),
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

function buildSurveyPayload(body) {
  const title = normalizeText(body.title || body.Title, 255);
  const description = normalizeText(body.description || body.Description, 4000);
  const formUrl = normalizeUrl(body.formUrl || body.FormUrl);
  const responseSheetUrl = normalizeUrl(body.responseSheetUrl || body.ResponseSheetUrl);
  const targetAudience = normalizeText(body.targetAudience || body.TargetAudience, 255);
  const status = normalizeBool(body.status ?? body.Status, true);

  return { title, description, formUrl, responseSheetUrl, targetAudience, status };
}

// GET /api/surveys/form
router.get("/form", async (_req, res) => {
  try {
    const pool = await poolPromise;
    await ensureSurveyFormTable(pool);

    const result = await pool.request().query(`
      SELECT TOP 1 *
      FROM SURVEY_FORM
      WHERE Status = 1
      ORDER BY UpdatedAt DESC, CreatedAt DESC, SurveyFormID DESC
    `);

    const form = mapSurveyForm(result.recordset[0]);
    res.json({
      data: form || DEFAULT_SURVEY_FORM,
      source: "Google Form",
      purpose: "External survey dataset collection",
    });
  } catch (err) {
    console.error("GET /api/surveys/form error:", err);
    res.status(500).json({ message: "Lỗi khi lấy thông tin form khảo sát" });
  }
});

// POST /api/surveys/form
router.post("/form", async (req, res) => {
  try {
    const payload = buildSurveyPayload(req.body || {});
    if (!payload.title) {
      return res.status(400).json({ message: "Title là bắt buộc" });
    }
    if (!payload.formUrl) {
      return res.status(400).json({ message: "FormUrl không hợp lệ hoặc đang trống" });
    }

    const pool = await poolPromise;
    await ensureSurveyFormTable(pool);

    const result = await pool
      .request()
      .input("Title", sql.NVarChar(255), payload.title)
      .input("Description", sql.NVarChar(sql.MAX), payload.description)
      .input("FormUrl", sql.NVarChar(sql.MAX), payload.formUrl)
      .input("ResponseSheetUrl", sql.NVarChar(sql.MAX), payload.responseSheetUrl)
      .input("TargetAudience", sql.NVarChar(255), payload.targetAudience)
      .input("Status", sql.Bit, payload.status)
      .query(`
        INSERT INTO SURVEY_FORM
          (Title, Description, FormUrl, ResponseSheetUrl, TargetAudience, Status, CreatedAt)
        OUTPUT INSERTED.*
        VALUES
          (@Title, @Description, @FormUrl, @ResponseSheetUrl, @TargetAudience, @Status, GETDATE())
      `);

    res.status(201).json({
      message: "Tạo survey form thành công",
      data: mapSurveyForm(result.recordset[0]),
    });
  } catch (err) {
    console.error("POST /api/surveys/form error:", err);
    res.status(500).json({ message: "Lỗi khi tạo survey form" });
  }
});

// PUT /api/surveys/form/:id
router.put("/form/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "SurveyFormID không hợp lệ" });
    }

    const payload = buildSurveyPayload(req.body || {});
    if (!payload.title) {
      return res.status(400).json({ message: "Title là bắt buộc" });
    }
    if (!payload.formUrl) {
      return res.status(400).json({ message: "FormUrl không hợp lệ hoặc đang trống" });
    }

    const pool = await poolPromise;
    await ensureSurveyFormTable(pool);

    const result = await pool
      .request()
      .input("SurveyFormID", sql.Int, id)
      .input("Title", sql.NVarChar(255), payload.title)
      .input("Description", sql.NVarChar(sql.MAX), payload.description)
      .input("FormUrl", sql.NVarChar(sql.MAX), payload.formUrl)
      .input("ResponseSheetUrl", sql.NVarChar(sql.MAX), payload.responseSheetUrl)
      .input("TargetAudience", sql.NVarChar(255), payload.targetAudience)
      .input("Status", sql.Bit, payload.status)
      .query(`
        UPDATE SURVEY_FORM
        SET
          Title = @Title,
          Description = @Description,
          FormUrl = @FormUrl,
          ResponseSheetUrl = @ResponseSheetUrl,
          TargetAudience = @TargetAudience,
          Status = @Status,
          UpdatedAt = GETDATE()
        OUTPUT INSERTED.*
        WHERE SurveyFormID = @SurveyFormID
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: "Không tìm thấy survey form" });
    }

    res.json({
      message: "Cập nhật survey form thành công",
      data: mapSurveyForm(result.recordset[0]),
    });
  } catch (err) {
    console.error("PUT /api/surveys/form/:id error:", err);
    res.status(500).json({ message: "Lỗi khi cập nhật survey form" });
  }
});

module.exports = router;
