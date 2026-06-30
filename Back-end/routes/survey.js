const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../db");

const DEFAULT_SURVEY_FORM = {
  title: "Khảo Sát Khách Hàng Dịch Vụ Rửa Xe",
  description:
    "Khảo sát người dùng ngoài hệ thống để bổ sung external research dataset cho đề tài loyalty tier progression.",
  formUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSddfBfekanqr2wC_JxEYn2FEpxs_l2TTC4KQruBnJLIRnqPg/viewform",
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
// Lấy Google Form hiện tại để FE mở form khảo sát ngoài hệ thống.
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
// Tạo/lưu link Google Form mới.
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
// Cập nhật link Google Form/Response Sheet.
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

// GET /api/surveys/internal-summary
// Summary nhỏ từ feedback nội bộ sau booking. Không phải core survey, chỉ là nguồn internal signal.
router.get("/internal-summary", async (_req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        COUNT(*) AS TotalInternalResponses,
        CAST(ISNULL(AVG(CAST(Rating AS DECIMAL(10,2))), 0) AS DECIMAL(10,2)) AS AverageRating,
        SUM(CASE WHEN Rating = 5 THEN 1 ELSE 0 END) AS FiveStar,
        SUM(CASE WHEN Rating = 4 THEN 1 ELSE 0 END) AS FourStar,
        SUM(CASE WHEN Rating = 3 THEN 1 ELSE 0 END) AS ThreeStar,
        SUM(CASE WHEN Rating = 2 THEN 1 ELSE 0 END) AS TwoStar,
        SUM(CASE WHEN Rating = 1 THEN 1 ELSE 0 END) AS OneStar,
        SUM(CASE WHEN Rating >= 4 THEN 1 ELSE 0 END) AS SatisfiedCount,
        SUM(CASE WHEN Rating <= 2 THEN 1 ELSE 0 END) AS IssueCount,
        CAST(
          CASE WHEN COUNT(*) = 0 THEN 0
          ELSE SUM(CASE WHEN Rating >= 4 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) END
          AS DECIMAL(10,2)
        ) AS SatisfactionRate,
        CAST(
          CASE WHEN COUNT(*) = 0 THEN 0
          ELSE SUM(CASE WHEN Rating <= 2 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) END
          AS DECIMAL(10,2)
        ) AS IssueRate
      FROM FEEDBACK
    `);

    res.json({
      source: "Internal feedback after booking",
      data: result.recordset[0] || {
        TotalInternalResponses: 0,
        AverageRating: 0,
        FiveStar: 0,
        FourStar: 0,
        ThreeStar: 0,
        TwoStar: 0,
        OneStar: 0,
        SatisfiedCount: 0,
        IssueCount: 0,
        SatisfactionRate: 0,
        IssueRate: 0,
      },
    });
  } catch (err) {
    console.error("GET /api/surveys/internal-summary error:", err);
    res.status(500).json({ message: "Lỗi khi lấy internal survey summary" });
  }
});

// GET /api/surveys/research-dataset
// Dataset nội bộ phục vụ research: booking behavior + spending + loyalty + reward + feedback.
router.get("/research-dataset", async (_req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      WITH BookingAgg AS (
        SELECT
          b.CustomerID AS UserID,
          COUNT(*) AS TotalBookings,
          SUM(CASE WHEN b.Status = 4 THEN 1 ELSE 0 END) AS CompletedBookings,
          SUM(CASE WHEN b.Status = 5 THEN 1 ELSE 0 END) AS CancelledBookings,
          SUM(ISNULL(b.FinalPrice, 0)) AS TotalSpending,
          CAST(ISNULL(AVG(CAST(ISNULL(b.FinalPrice, 0) AS DECIMAL(18,2))), 0) AS DECIMAL(18,2)) AS AverageOrderValue,
          MIN(b.BookingDate) AS FirstBookingDate,
          MAX(b.BookingDate) AS LastBookingDate,
          CAST(
            CASE
              WHEN COUNT(*) <= 1 THEN COUNT(*)
              WHEN DATEDIFF(DAY, MIN(b.BookingDate), MAX(b.BookingDate)) <= 0 THEN COUNT(*)
              ELSE COUNT(*) * 30.0 / NULLIF(DATEDIFF(DAY, MIN(b.BookingDate), MAX(b.BookingDate)), 0)
            END AS DECIMAL(10,2)
          ) AS WashFrequencyPerMonth
        FROM BOOKING b
        GROUP BY b.CustomerID
      ),
      VehicleAgg AS (
        SELECT
          b.CustomerID AS UserID,
          MAX(b.VehicleType) AS MainVehicleType,
          COUNT(DISTINCT b.LicensePlate) AS VehicleCount
        FROM BOOKING b
        GROUP BY b.CustomerID
      ),
      FeedbackAgg AS (
        SELECT
          b.CustomerID AS UserID,
          COUNT(f.FeedbackID) AS TotalFeedbacks,
          CAST(ISNULL(AVG(CAST(f.Rating AS DECIMAL(10,2))), 0) AS DECIMAL(10,2)) AS AverageRating,
          SUM(CASE WHEN f.Rating >= 4 THEN 1 ELSE 0 END) AS SatisfiedFeedbacks,
          SUM(CASE WHEN f.Rating <= 2 THEN 1 ELSE 0 END) AS IssueFeedbacks
        FROM FEEDBACK f
        INNER JOIN BOOKING b ON f.BookingID = b.BookingID
        GROUP BY b.CustomerID
      ),
      LoyaltyAgg AS (
        SELECT
          lt.UserID,
          SUM(CASE WHEN UPPER(ISNULL(lt.TransactionType, '')) IN ('EARN', 'ACCUMULATE') THEN ABS(ISNULL(lt.Points, 0)) ELSE 0 END) AS PointsEarned,
          SUM(CASE WHEN UPPER(ISNULL(lt.TransactionType, '')) IN ('REDEEM', 'REDEMPTION') THEN ABS(ISNULL(lt.Points, 0)) ELSE 0 END) AS PointsRedeemed,
          COUNT(*) AS LoyaltyTransactionCount,
          MAX(lt.CreatedDate) AS LastLoyaltyActivityDate
        FROM LOYALTY_TRANSACTION lt
        GROUP BY lt.UserID
      ),
      RewardAgg AS (
        SELECT
          mp.UserID,
          COUNT(mp.MemberPromoID) AS RewardReceivedCount,
          SUM(CASE WHEN mp.IsUsed = 1 THEN 1 ELSE 0 END) AS RewardRedeemedCount
        FROM MEMBER_PROMOTION mp
        GROUP BY mp.UserID
      )
      SELECT
        u.UserID,
        u.FullName AS CustomerName,
        u.Email,
        u.PhoneNumber,
        ISNULL(v.MainVehicleType, '') AS MainVehicleType,
        ISNULL(v.VehicleCount, 0) AS VehicleCount,
        ISNULL(ba.TotalBookings, 0) AS TotalBookings,
        ISNULL(ba.CompletedBookings, 0) AS CompletedBookings,
        ISNULL(ba.CancelledBookings, 0) AS CancelledBookings,
        ISNULL(ba.TotalSpending, 0) AS TotalSpending,
        ISNULL(ba.AverageOrderValue, 0) AS AverageOrderValue,
        ISNULL(ba.WashFrequencyPerMonth, 0) AS WashFrequencyPerMonth,
        ba.FirstBookingDate,
        ba.LastBookingDate,
        ISNULL(mp.CurrentPoints, 0) AS CurrentPoints,
        ISNULL(mp.AccumulatedPoints, 0) AS AccumulatedPoints,
        ISNULL(t.TierName, 'No Tier') AS TierName,
        ISNULL(la.PointsEarned, 0) AS PointsEarned,
        ISNULL(la.PointsRedeemed, 0) AS PointsRedeemed,
        ISNULL(la.LoyaltyTransactionCount, 0) AS LoyaltyTransactionCount,
        la.LastLoyaltyActivityDate,
        ISNULL(ra.RewardReceivedCount, 0) AS RewardReceivedCount,
        ISNULL(ra.RewardRedeemedCount, 0) AS RewardRedeemedCount,
        ISNULL(fa.TotalFeedbacks, 0) AS TotalFeedbacks,
        ISNULL(fa.AverageRating, 0) AS AverageRating,
        ISNULL(fa.SatisfiedFeedbacks, 0) AS SatisfiedFeedbacks,
        ISNULL(fa.IssueFeedbacks, 0) AS IssueFeedbacks,
        CAST(
          CASE WHEN ISNULL(ba.TotalBookings, 0) = 0 THEN 0
          ELSE ISNULL(ba.CompletedBookings, 0) * 100.0 / NULLIF(ba.TotalBookings, 0) END
          AS DECIMAL(10,2)
        ) AS CompletionRate,
        CAST(
          CASE WHEN ISNULL(ba.TotalBookings, 0) = 0 THEN 0
          ELSE
            (
              ISNULL(ba.CompletedBookings, 0) * 0.35
              + ISNULL(fa.SatisfiedFeedbacks, 0) * 0.25
              + CASE WHEN ISNULL(ra.RewardRedeemedCount, 0) > 0 THEN 1 ELSE 0 END * 0.20
              + CASE WHEN ISNULL(ba.TotalBookings, 0) >= 3 THEN 1 ELSE 0 END * 0.20
            ) * 100.0
          END
          AS DECIMAL(10,2)
        ) AS RetentionProxyRate
      FROM [USER] u
      LEFT JOIN BookingAgg ba ON u.UserID = ba.UserID
      LEFT JOIN VehicleAgg v ON u.UserID = v.UserID
      LEFT JOIN FeedbackAgg fa ON u.UserID = fa.UserID
      LEFT JOIN MEMBER_PROFILE mp ON u.UserID = mp.UserID
      LEFT JOIN LOYALTY_TIER t ON mp.TierID = t.TierID
      LEFT JOIN LoyaltyAgg la ON u.UserID = la.UserID
      LEFT JOIN RewardAgg ra ON u.UserID = ra.UserID
      WHERE ISNULL(ba.TotalBookings, 0) > 0
      ORDER BY ISNULL(ba.TotalBookings, 0) DESC, ISNULL(ba.TotalSpending, 0) DESC
    `);

    res.json({
      meta: {
        purpose: "Research dataset for loyalty tier progression analysis",
        source: "Internal system data: users, bookings, feedbacks, loyalty transactions, rewards",
        totalRecords: result.recordset.length,
        generatedAt: new Date().toISOString(),
      },
      data: result.recordset,
    });
  } catch (err) {
    console.error("GET /api/surveys/research-dataset error:", err);
    res.status(500).json({ message: "Lỗi khi lấy research dataset" });
  }
});

module.exports = router;
