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

function mapFeedback(row) {
  return {
    FeedbackID: row.FeedbackID,
    BookingID: row.BookingID,
    Rating: row.Rating,
    Comment: row.Comment || "",
    CreatedDate: row.CreatedDate,
    CustomerName: row.CustomerName || "Khách hàng",
    PhoneNumber: row.PhoneNumber || "",
    Email: row.Email || "",
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

// GET /api/feedbacks?rating=5&search=abc
router.get("/", async (req, res) => {
  try {
    const rating = req.query.rating ? normalizeRating(req.query.rating) : null;
    const search = normalizeText(req.query.search, 255);

    const pool = await poolPromise;
    const request = pool.request();

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
          OR b.LicensePlate LIKE @search
          OR s.ServiceName LIKE @search
        )
      `;
    }

    const result = await request.query(`
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
        u.FullName AS CustomerName,
        u.PhoneNumber,
        u.Email,
        s.ServiceName,
        m.MachineName
      FROM FEEDBACK f
      INNER JOIN BOOKING b ON f.BookingID = b.BookingID
      INNER JOIN [USER] u ON b.CustomerID = u.UserID
      LEFT JOIN BOOKING_DETAIL bd ON b.BookingID = bd.BookingID
      LEFT JOIN SERVICE s ON bd.ServiceID = s.ServiceID
      LEFT JOIN MACHINE m ON bd.MachineID = m.MachineID
      ${where}
      ORDER BY f.CreatedDate DESC, f.FeedbackID DESC
    `);

    const feedbacks = result.recordset.map(mapFeedback);

    const statsResult = await pool.request().query(`
      SELECT
        COUNT(*) AS TotalFeedback,
        CAST(ISNULL(AVG(CAST(Rating AS DECIMAL(10,2))), 0) AS DECIMAL(10,2)) AS AverageRating,
        SUM(CASE WHEN Rating = 5 THEN 1 ELSE 0 END) AS FiveStar,
        SUM(CASE WHEN Rating = 4 THEN 1 ELSE 0 END) AS FourStar,
        SUM(CASE WHEN Rating = 3 THEN 1 ELSE 0 END) AS ThreeStar,
        SUM(CASE WHEN Rating = 2 THEN 1 ELSE 0 END) AS TwoStar,
        SUM(CASE WHEN Rating = 1 THEN 1 ELSE 0 END) AS OneStar
      FROM FEEDBACK
    `);

    res.json({
      data: feedbacks,
      stats: statsResult.recordset[0] || {
        TotalFeedback: 0,
        AverageRating: 0,
        FiveStar: 0,
        FourStar: 0,
        ThreeStar: 0,
        TwoStar: 0,
        OneStar: 0,
      },
    });
  } catch (err) {
    console.error("GET /api/feedbacks error:", err);
    res.status(500).json({ message: "Lỗi khi lấy danh sách feedback" });
  }
});

// GET /api/feedbacks/:id
router.get("/:id", async (req, res) => {
  const feedbackId = Number(req.params.id);
  if (!feedbackId)
    return res.status(400).json({ message: "FeedbackID không hợp lệ" });

  try {
    const pool = await poolPromise;
    const result = await pool.request().input("feedbackId", sql.Int, feedbackId)
      .query(`
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
          u.FullName AS CustomerName,
          u.PhoneNumber,
          u.Email,
          s.ServiceName,
          m.MachineName
        FROM FEEDBACK f
        INNER JOIN BOOKING b ON f.BookingID = b.BookingID
        INNER JOIN [USER] u ON b.CustomerID = u.UserID
        LEFT JOIN BOOKING_DETAIL bd ON b.BookingID = bd.BookingID
        LEFT JOIN SERVICE s ON bd.ServiceID = s.ServiceID
        LEFT JOIN MACHINE m ON bd.MachineID = m.MachineID
        WHERE f.FeedbackID = @feedbackId
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: "Không tìm thấy feedback" });
    }

    res.json(mapFeedback(result.recordset[0]));
  } catch (err) {
    console.error("GET /api/feedbacks/:id error:", err);
    res.status(500).json({ message: "Lỗi khi lấy chi tiết feedback" });
  }
});

// POST /api/feedbacks
router.post("/", async (req, res) => {
  const bookingId = Number(req.body.BookingID || req.body.bookingId);
  const rating = normalizeRating(req.body.Rating || req.body.rating);
  const comment = normalizeText(req.body.Comment || req.body.comment, 1000);

  if (!bookingId) return res.status(400).json({ message: "Thiếu BookingID" });
  if (!rating)
    return res.status(400).json({ message: "Rating phải từ 1 đến 5" });

  try {
    const pool = await poolPromise;

    const booking = await pool
      .request()
      .input("bookingId", sql.Int, bookingId)
      .query("SELECT BookingID FROM BOOKING WHERE BookingID = @bookingId");

    if (!booking.recordset.length) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }

    const existed = await pool
      .request()
      .input("bookingId", sql.Int, bookingId)
      .query("SELECT FeedbackID FROM FEEDBACK WHERE BookingID = @bookingId");

    if (existed.recordset.length) {
      return res.status(409).json({ message: "Booking này đã có feedback" });
    }

    const result = await pool
      .request()
      .input("bookingId", sql.Int, bookingId)
      .input("rating", sql.Int, rating)
      .input("comment", sql.NVarChar(1000), comment || null).query(`
        INSERT INTO FEEDBACK (BookingID, Rating, Comment)
        OUTPUT INSERTED.FeedbackID, INSERTED.BookingID, INSERTED.Rating, INSERTED.Comment, INSERTED.CreatedDate
        VALUES (@bookingId, @rating, @comment)
      `);

    res.status(201).json({
      message: "Tạo feedback thành công",
      data: result.recordset[0],
    });
  } catch (err) {
    console.error("POST /api/feedbacks error:", err);
    res.status(500).json({ message: "Lỗi khi tạo feedback" });
  }
});

// DELETE /api/feedbacks/:id
router.delete("/:id", async (req, res) => {
  const feedbackId = Number(req.params.id);
  if (!feedbackId)
    return res.status(400).json({ message: "FeedbackID không hợp lệ" });

  try {
    const pool = await poolPromise;
    const result = await pool.request().input("feedbackId", sql.Int, feedbackId)
      .query(`
        DELETE FROM FEEDBACK
        OUTPUT DELETED.FeedbackID
        WHERE FeedbackID = @feedbackId
      `);

    if (!result.recordset.length) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy feedback để xóa" });
    }

    res.json({ message: "Xóa feedback thành công", FeedbackID: feedbackId });
  } catch (err) {
    console.error("DELETE /api/feedbacks/:id error:", err);
    res.status(500).json({ message: "Lỗi khi xóa feedback" });
  }
});

module.exports = router;
