const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../db");
const verifyToken = require("../middleware/verifyToken");

function normalizeText(value, maxLength = 255) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeDiscount(value) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue) || numberValue < 0 || numberValue > 100) return null;
  return Number(numberValue.toFixed(2));
}

function normalizeEndDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapPromotion(row) {
  const endDate = row.EndDate ? new Date(row.EndDate) : null;
  const isActive = endDate ? endDate >= new Date() : true;
  return {
    PromotionID: row.PromotionID,
    PromoName: row.PromoName,
    DiscountPercent: Number(row.DiscountPercent || 0),
    EndDate: row.EndDate,
    Status: isActive ? "Active" : "Expired",
    UsedCount: Number(row.UsedCount || 0),
    WalletCount: Number(row.WalletCount || 0),
  };
}

// GET /api/promotions?search=abc&status=active|expired
router.get("/", async (req, res) => {
  try {
    const search = normalizeText(req.query.search, 255);
    const status = String(req.query.status || "all").toLowerCase();

    const pool = await poolPromise;
    const request = pool.request();

    let where = "WHERE 1 = 1";

    if (search) {
      request.input("search", sql.NVarChar(255), `%${search}%`);
      where += " AND p.PromoName LIKE @search";
    }

    if (status === "active") {
      where += " AND (p.EndDate IS NULL OR p.EndDate >= GETDATE())";
    }

    if (status === "expired") {
      where += " AND p.EndDate IS NOT NULL AND p.EndDate < GETDATE()";
    }

    const result = await request.query(`
      SELECT
        p.PromotionID,
        p.PromoName,
        p.DiscountPercent,
        p.EndDate,
        COUNT(mp.MemberPromoID) AS WalletCount,
        SUM(CASE WHEN mp.IsUsed = 1 THEN 1 ELSE 0 END) AS UsedCount
      FROM PROMOTION p
      LEFT JOIN MEMBER_PROMOTION mp ON p.PromotionID = mp.PromotionID
      ${where}
      GROUP BY p.PromotionID, p.PromoName, p.DiscountPercent, p.EndDate
      ORDER BY p.PromotionID DESC
    `);

    res.json(result.recordset.map(mapPromotion));
  } catch (err) {
    console.error("GET /api/promotions error:", err);
    res.status(500).json({ message: "Lỗi khi lấy danh sách khuyến mãi" });
  }
});

// GET /api/promotions/my-vouchers
router.get("/my-vouchers", verifyToken, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("userId", sql.Int, req.user.userId)
      .query(`
        SELECT 
          mp.MemberPromoID,
          mp.PromotionID,
          p.PromoName,
          p.DiscountPercent,
          p.EndDate
        FROM MEMBER_PROMOTION mp
        INNER JOIN PROMOTION p ON mp.PromotionID = p.PromotionID
        WHERE mp.UserID = @userId 
          AND mp.IsUsed = 0
          AND (p.EndDate IS NULL OR p.EndDate >= GETDATE())
        ORDER BY mp.MemberPromoID DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("GET /api/promotions/my-vouchers error:", err);
    res.status(500).json({ message: "Lỗi khi lấy danh sách voucher của bạn" });
  }
});

// GET /api/promotions/:id
router.get("/:id", async (req, res) => {
  const promotionId = Number(req.params.id);
  if (!promotionId) return res.status(400).json({ message: "PromotionID không hợp lệ" });

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("promotionId", sql.Int, promotionId)
      .query(`
        SELECT
          p.PromotionID,
          p.PromoName,
          p.DiscountPercent,
          p.EndDate,
          COUNT(mp.MemberPromoID) AS WalletCount,
          SUM(CASE WHEN mp.IsUsed = 1 THEN 1 ELSE 0 END) AS UsedCount
        FROM PROMOTION p
        LEFT JOIN MEMBER_PROMOTION mp ON p.PromotionID = mp.PromotionID
        WHERE p.PromotionID = @promotionId
        GROUP BY p.PromotionID, p.PromoName, p.DiscountPercent, p.EndDate
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: "Không tìm thấy khuyến mãi" });
    }

    res.json(mapPromotion(result.recordset[0]));
  } catch (err) {
    console.error("GET /api/promotions/:id error:", err);
    res.status(500).json({ message: "Lỗi khi lấy chi tiết khuyến mãi" });
  }
});

// POST /api/promotions
router.post("/", async (req, res) => {
  const promoName = normalizeText(req.body.PromoName || req.body.promoName, 255);
  const discountPercent = normalizeDiscount(req.body.DiscountPercent ?? req.body.discountPercent);
  const endDate = normalizeEndDate(req.body.EndDate || req.body.endDate);

  if (!promoName) return res.status(400).json({ message: "Tên khuyến mãi không được để trống" });
  if (discountPercent === null) return res.status(400).json({ message: "Phần trăm giảm phải từ 0 đến 100" });

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("promoName", sql.NVarChar(255), promoName)
      .input("discountPercent", sql.Decimal(5, 2), discountPercent)
      .input("endDate", sql.DateTime, endDate)
      .query(`
        INSERT INTO PROMOTION (PromoName, DiscountPercent, EndDate)
        OUTPUT INSERTED.PromotionID, INSERTED.PromoName, INSERTED.DiscountPercent, INSERTED.EndDate
        VALUES (@promoName, @discountPercent, @endDate)
      `);

    res.status(201).json({
      message: "Tạo khuyến mãi thành công",
      data: mapPromotion({ ...result.recordset[0], WalletCount: 0, UsedCount: 0 }),
    });
  } catch (err) {
    console.error("POST /api/promotions error:", err);
    res.status(500).json({ message: "Lỗi khi tạo khuyến mãi" });
  }
});

// PUT /api/promotions/:id
router.put("/:id", async (req, res) => {
  const promotionId = Number(req.params.id);
  const promoName = normalizeText(req.body.PromoName || req.body.promoName, 255);
  const discountPercent = normalizeDiscount(req.body.DiscountPercent ?? req.body.discountPercent);
  const endDate = normalizeEndDate(req.body.EndDate || req.body.endDate);

  if (!promotionId) return res.status(400).json({ message: "PromotionID không hợp lệ" });
  if (!promoName) return res.status(400).json({ message: "Tên khuyến mãi không được để trống" });
  if (discountPercent === null) return res.status(400).json({ message: "Phần trăm giảm phải từ 0 đến 100" });

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("promotionId", sql.Int, promotionId)
      .input("promoName", sql.NVarChar(255), promoName)
      .input("discountPercent", sql.Decimal(5, 2), discountPercent)
      .input("endDate", sql.DateTime, endDate)
      .query(`
        UPDATE PROMOTION
        SET PromoName = @promoName,
            DiscountPercent = @discountPercent,
            EndDate = @endDate
        OUTPUT INSERTED.PromotionID, INSERTED.PromoName, INSERTED.DiscountPercent, INSERTED.EndDate
        WHERE PromotionID = @promotionId
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: "Không tìm thấy khuyến mãi để cập nhật" });
    }

    res.json({
      message: "Cập nhật khuyến mãi thành công",
      data: mapPromotion({ ...result.recordset[0], WalletCount: 0, UsedCount: 0 }),
    });
  } catch (err) {
    console.error("PUT /api/promotions/:id error:", err);
    res.status(500).json({ message: "Lỗi khi cập nhật khuyến mãi" });
  }
});

// PATCH /api/promotions/:id/expire
router.patch("/:id/expire", async (req, res) => {
  const promotionId = Number(req.params.id);
  if (!promotionId) return res.status(400).json({ message: "PromotionID không hợp lệ" });

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("promotionId", sql.Int, promotionId)
      .query(`
        UPDATE PROMOTION
        SET EndDate = DATEADD(DAY, -1, GETDATE())
        OUTPUT INSERTED.PromotionID, INSERTED.PromoName, INSERTED.DiscountPercent, INSERTED.EndDate
        WHERE PromotionID = @promotionId
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: "Không tìm thấy khuyến mãi" });
    }

    res.json({
      message: "Đã chuyển khuyến mãi sang hết hạn",
      data: mapPromotion({ ...result.recordset[0], WalletCount: 0, UsedCount: 0 }),
    });
  } catch (err) {
    console.error("PATCH /api/promotions/:id/expire error:", err);
    res.status(500).json({ message: "Lỗi khi tắt khuyến mãi" });
  }
});


// DELETE /api/promotions/:id
router.delete("/:id", async (req, res) => {
  const promotionId = Number(req.params.id);
  if (!promotionId) {
    return res.status(400).json({ message: "PromotionID không hợp lệ" });
  }

  const transaction = new sql.Transaction(await poolPromise);

  try {
    await transaction.begin();

    const request = new sql.Request(transaction);
    request.input("promotionId", sql.Int, promotionId);

    const checkResult = await request.query(`
      SELECT PromotionID
      FROM PROMOTION
      WHERE PromotionID = @promotionId
    `);

    if (!checkResult.recordset.length) {
      await transaction.rollback();
      return res.status(404).json({ message: "Không tìm thấy khuyến mãi" });
    }

    await request.query(`
      DELETE FROM MEMBER_PROMOTION
      WHERE PromotionID = @promotionId
    `);

    await request.query(`
      DELETE FROM PROMOTION
      WHERE PromotionID = @promotionId
    `);

    await transaction.commit();

    res.json({ message: "Xóa khuyến mãi thành công" });
  } catch (err) {
    await transaction.rollback();
    console.error("DELETE /api/promotions/:id error:", err);
    res.status(500).json({ message: "Lỗi khi xóa khuyến mãi" });
  }
});

module.exports = router;
