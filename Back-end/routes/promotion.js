const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../db");

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
// Hard delete dùng cho dữ liệu demo/test:
// xóa các bản ghi liên quan trong MEMBER_PROMOTION trước rồi mới xóa PROMOTION.
router.delete("/:id", async (req, res) => {
  const promotionId = Number(req.params.id);
  if (!promotionId) return res.status(400).json({ message: "PromotionID không hợp lệ" });

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const checkRequest = new sql.Request(transaction);
    const checkResult = await checkRequest
      .input("promotionId", sql.Int, promotionId)
      .query(`
        SELECT PromotionID, PromoName
        FROM PROMOTION
        WHERE PromotionID = @promotionId
      `);

    if (!checkResult.recordset.length) {
      await transaction.rollback();
      return res.status(404).json({ message: "Không tìm thấy khuyến mãi" });
    }

    const walletRequest = new sql.Request(transaction);
    const walletDeleteResult = await walletRequest
      .input("promotionId", sql.Int, promotionId)
      .query(`
        DELETE FROM MEMBER_PROMOTION
        WHERE PromotionID = @promotionId
      `);

    const promotionRequest = new sql.Request(transaction);
    await promotionRequest
      .input("promotionId", sql.Int, promotionId)
      .query(`
        DELETE FROM PROMOTION
        WHERE PromotionID = @promotionId
      `);

    await transaction.commit();

    const walletDeleted =
      walletDeleteResult.rowsAffected && walletDeleteResult.rowsAffected.length
        ? walletDeleteResult.rowsAffected[0]
        : 0;

    res.json({
      message: "Xóa khuyến mãi thành công",
      deletedMemberPromotions: walletDeleted,
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch (_) {}

    console.error("DELETE /api/promotions/:id error:", err);
    res.status(500).json({ message: "Lỗi khi xóa khuyến mãi" });
  }
});

module.exports = router;
