const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../db");

function normalizeRating(rating) {
  const value = Number(rating);
  return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
}

function normalizeText(value, maxLength = 1000) {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : value;
}

function mapSurveyResponse(row) {
  return {
    SurveyResponseID: row.FeedbackID,
    FeedbackID: row.FeedbackID,
    BookingID: row.BookingID,
    UserID: row.UserID,
    CustomerName: row.CustomerName || "Khách hàng",
    PhoneNumber: row.PhoneNumber || "",
    Email: row.Email || "",
    Rating: row.Rating,
    Comment: row.Comment || "",
    CreatedDate: row.CreatedDate,
    BookingDate: row.BookingDate,
    VehicleType: row.VehicleType || "",
    LicensePlate: row.LicensePlate || "",
    BookingStatus: row.BookingStatus,
    ServiceName: row.ServiceName || "",
    MachineName: row.MachineName || "",
    TotalPrice: Number(row.TotalPrice || 0),
    FinalPrice: Number(row.FinalPrice || 0),
  };
}

function buildSurveyWhere(req, request) {
  const rating = req.query.rating ? normalizeRating(req.query.rating) : null;
  const search = normalizeText(req.query.search, 255);
  const fromDate = normalizeDate(req.query.fromDate || req.query.startDate);
  const toDate = normalizeDate(req.query.toDate || req.query.endDate);

  let where = "WHERE 1 = 1";

  if (rating) {
    request.input("rating", sql.Int, rating);
    where += " AND f.Rating = @rating";
  }

  if (search) {
    request.input("search", sql.NVarChar(255), `%${search}%`);
    where += `
      AND (
        f.Comment LIKE @search
        OR u.FullName LIKE @search
        OR u.PhoneNumber LIKE @search
        OR u.Email LIKE @search
        OR b.LicensePlate LIKE @search
        OR b.VehicleType LIKE @search
        OR EXISTS (
          SELECT 1
          FROM BOOKING_DETAIL bd_search
          INNER JOIN SERVICE s_search ON bd_search.ServiceID = s_search.ServiceID
          WHERE bd_search.BookingID = b.BookingID
            AND s_search.ServiceName LIKE @search
        )
      )
    `;
  }

  if (fromDate) {
    request.input("fromDate", sql.Date, fromDate);
    where += " AND CAST(f.CreatedDate AS DATE) >= @fromDate";
  }

  if (toDate) {
    request.input("toDate", sql.Date, toDate);
    where += " AND CAST(f.CreatedDate AS DATE) <= @toDate";
  }

  return where;
}

function getSurveyBaseQuery(where) {
  return `
    SELECT
      f.FeedbackID,
      f.BookingID,
      f.Rating,
      f.Comment,
      f.CreatedDate,
      b.BookingDate,
      b.VehicleType,
      b.LicensePlate,
      b.Status AS BookingStatus,
      b.TotalPrice,
      b.FinalPrice,
      u.UserID,
      u.FullName AS CustomerName,
      u.PhoneNumber,
      u.Email,
      (
        SELECT STRING_AGG(s.ServiceName, ', ')
        FROM BOOKING_DETAIL bd
        INNER JOIN SERVICE s ON bd.ServiceID = s.ServiceID
        WHERE bd.BookingID = b.BookingID
      ) AS ServiceName,
      (
        SELECT STRING_AGG(m.MachineName, ', ')
        FROM BOOKING_DETAIL bd
        INNER JOIN MACHINE m ON bd.MachineID = m.MachineID
        WHERE bd.BookingID = b.BookingID
      ) AS MachineName
    FROM FEEDBACK f
    INNER JOIN BOOKING b ON f.BookingID = b.BookingID
    INNER JOIN [USER] u ON b.CustomerID = u.UserID
    ${where}
  `;
}

// GET /api/surveys?rating=5&search=abc&fromDate=2026-06-01&toDate=2026-06-30
router.get("/", async (req, res) => {
  try {
    const pool = await poolPromise;
    const request = pool.request();
    const where = buildSurveyWhere(req, request);

    const result = await request.query(`
      ${getSurveyBaseQuery(where)}
      ORDER BY f.CreatedDate DESC, f.FeedbackID DESC
    `);

    const statsRequest = pool.request();
    const statsWhere = buildSurveyWhere(req, statsRequest);

    const statsResult = await statsRequest.query(`
      SELECT
        COUNT(*) AS TotalSurvey,
        COUNT(*) AS TotalFeedback,
        CAST(ISNULL(AVG(CAST(f.Rating AS DECIMAL(10,2))), 0) AS DECIMAL(10,2)) AS AverageRating,
        SUM(CASE WHEN f.Rating = 5 THEN 1 ELSE 0 END) AS FiveStar,
        SUM(CASE WHEN f.Rating = 4 THEN 1 ELSE 0 END) AS FourStar,
        SUM(CASE WHEN f.Rating = 3 THEN 1 ELSE 0 END) AS ThreeStar,
        SUM(CASE WHEN f.Rating = 2 THEN 1 ELSE 0 END) AS TwoStar,
        SUM(CASE WHEN f.Rating = 1 THEN 1 ELSE 0 END) AS OneStar,
        SUM(CASE WHEN f.Rating >= 4 THEN 1 ELSE 0 END) AS SatisfiedCount,
        SUM(CASE WHEN f.Rating <= 2 THEN 1 ELSE 0 END) AS IssueCount,
        CAST(
          CASE WHEN COUNT(*) = 0 THEN 0
          ELSE SUM(CASE WHEN f.Rating >= 4 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) END
          AS DECIMAL(10,2)
        ) AS SatisfactionRate,
        CAST(
          CASE WHEN COUNT(*) = 0 THEN 0
          ELSE SUM(CASE WHEN f.Rating <= 2 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) END
          AS DECIMAL(10,2)
        ) AS IssueRate
      FROM FEEDBACK f
      INNER JOIN BOOKING b ON f.BookingID = b.BookingID
      INNER JOIN [USER] u ON b.CustomerID = u.UserID
      ${statsWhere}
    `);

    res.json({
      data: result.recordset.map(mapSurveyResponse),
      stats: statsResult.recordset[0] || {
        TotalSurvey: 0,
        TotalFeedback: 0,
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
    console.error("GET /api/surveys error:", err);
    res.status(500).json({ message: "Lỗi khi lấy dữ liệu khảo sát" });
  }
});

// GET /api/surveys/stats
router.get("/stats", async (req, res) => {
  try {
    const pool = await poolPromise;
    const request = pool.request();
    const where = buildSurveyWhere(req, request);

    const result = await request.query(`
      SELECT
        COUNT(*) AS TotalSurvey,
        CAST(ISNULL(AVG(CAST(f.Rating AS DECIMAL(10,2))), 0) AS DECIMAL(10,2)) AS AverageRating,
        SUM(CASE WHEN f.Rating = 5 THEN 1 ELSE 0 END) AS FiveStar,
        SUM(CASE WHEN f.Rating = 4 THEN 1 ELSE 0 END) AS FourStar,
        SUM(CASE WHEN f.Rating = 3 THEN 1 ELSE 0 END) AS ThreeStar,
        SUM(CASE WHEN f.Rating = 2 THEN 1 ELSE 0 END) AS TwoStar,
        SUM(CASE WHEN f.Rating = 1 THEN 1 ELSE 0 END) AS OneStar,
        SUM(CASE WHEN f.Rating >= 4 THEN 1 ELSE 0 END) AS SatisfiedCount,
        SUM(CASE WHEN f.Rating <= 2 THEN 1 ELSE 0 END) AS IssueCount,
        CAST(
          CASE WHEN COUNT(*) = 0 THEN 0
          ELSE SUM(CASE WHEN f.Rating >= 4 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) END
          AS DECIMAL(10,2)
        ) AS SatisfactionRate,
        CAST(
          CASE WHEN COUNT(*) = 0 THEN 0
          ELSE SUM(CASE WHEN f.Rating <= 2 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) END
          AS DECIMAL(10,2)
        ) AS IssueRate
      FROM FEEDBACK f
      INNER JOIN BOOKING b ON f.BookingID = b.BookingID
      INNER JOIN [USER] u ON b.CustomerID = u.UserID
      ${where}
    `);

    res.json(result.recordset[0]);
  } catch (err) {
    console.error("GET /api/surveys/stats error:", err);
    res.status(500).json({ message: "Lỗi khi lấy thống kê khảo sát" });
  }
});

// GET /api/surveys/export
router.get("/export", async (req, res) => {
  try {
    const pool = await poolPromise;
    const request = pool.request();
    const where = buildSurveyWhere(req, request);

    const result = await request.query(`
      ${getSurveyBaseQuery(where)}
      ORDER BY f.CreatedDate DESC, f.FeedbackID DESC
    `);

    res.json({
      data: result.recordset.map(mapSurveyResponse),
      exportedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("GET /api/surveys/export error:", err);
    res.status(500).json({ message: "Lỗi khi export dữ liệu khảo sát" });
  }
});

module.exports = router;
