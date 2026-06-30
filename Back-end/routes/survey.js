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


// GET /api/surveys/research-dataset
// Dataset phục vụ research: loyalty tier progression, retention, spending, reward usage.
router.get("/research-dataset", async (req, res) => {
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
          SUM(CASE WHEN UPPER(lt.TransactionType) IN ('EARN', 'ACCUMULATE') THEN lt.Points ELSE 0 END) AS PointsEarned,
          SUM(CASE WHEN UPPER(lt.TransactionType) IN ('REDEEM', 'REDEMPTION') THEN lt.Points ELSE 0 END) AS PointsRedeemed,
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
          ELSE ISNULL(ba.CompletedBookings, 0) * 100.0 / ba.TotalBookings END
          AS DECIMAL(10,2)
        ) AS RetentionProxyRate
      FROM [USER] u
      LEFT JOIN MEMBER_PROFILE mp ON mp.UserID = u.UserID
      LEFT JOIN LOYALTY_TIER t ON t.TierID = mp.TierID
      LEFT JOIN BookingAgg ba ON ba.UserID = u.UserID
      LEFT JOIN VehicleAgg v ON v.UserID = u.UserID
      LEFT JOIN FeedbackAgg fa ON fa.UserID = u.UserID
      LEFT JOIN LoyaltyAgg la ON la.UserID = u.UserID
      LEFT JOIN RewardAgg ra ON ra.UserID = u.UserID
      WHERE ISNULL(ba.TotalBookings, 0) > 0
         OR mp.UserID IS NOT NULL
         OR ISNULL(fa.TotalFeedbacks, 0) > 0
      ORDER BY ISNULL(ba.TotalBookings, 0) DESC, ISNULL(ba.TotalSpending, 0) DESC, u.UserID DESC
    `);

    res.json({
      meta: {
        purpose: "Research dataset for loyalty tier progression analysis",
        source: "Internal system data: users, bookings, feedbacks, loyalty transactions, rewards",
        generatedAt: new Date().toISOString(),
        totalRecords: result.recordset.length,
      },
      data: result.recordset,
    });
  } catch (err) {
    console.error("GET /api/surveys/research-dataset error:", err);
    res.status(500).json({ message: "Lỗi khi lấy research dataset" });
  }
});


module.exports = router;
