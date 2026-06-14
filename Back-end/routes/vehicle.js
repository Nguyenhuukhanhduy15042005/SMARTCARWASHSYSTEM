const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../db");

const toInt = (value) => {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
};

const normalizeText = (value) => String(value || "").trim();
const normalizePlate = (value) =>
  normalizeText(value).toUpperCase().replace(/\s+/g, "");

const normalizeVehicleType = (value) => {
  const type = normalizeText(value).toUpperCase();
  if (["CAR", "OTO", "Ô TÔ", "OTÔ"].includes(type)) return "CAR";
  if (["MOTORBIKE", "BIKE", "XE MÁY", "XEMAY"].includes(type)) return "MOTORBIKE";
  return "";
};

const isMemberRole = (role) =>
  ["user", "member"].includes(String(role || "").toLowerCase());

const isValidPlate = (plate) => /^[A-Z0-9\-.]{5,20}$/.test(plate);

// Helper to get logged-in user from JWT token
const getUserFromToken = (req) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (
    !token ||
    token === "mock-token" ||
    token === "null" ||
    token === "undefined"
  )
    return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "secretkey_placeholder");
  } catch (err) {
    return null;
  }
};

async function getVehicleById(pool, vehicleId) {
  const result = await pool.request().input("vehicleId", sql.Int, vehicleId)
    .query(`
      SELECT
        v.VehicleID AS id,
        v.UserID AS userId,
        u.FullName AS ownerName,
        u.PhoneNumber AS ownerPhone,
        u.Email AS ownerEmail,
        v.PlateNumber AS plateNumber,
        v.VehicleType AS vehicleType,
        v.Brand AS brand,
        v.Model AS model,
        v.Color AS color,
        v.CreatedAt AS createdAt
      FROM VEHICLE v
      INNER JOIN [USER] u ON u.UserID = v.UserID
      WHERE v.VehicleID = @vehicleId
    `);

  return result.recordset[0] || null;
}

// GET /api/vehicles/users
// Danh sách khách hàng để chọn chủ xe trong form Vehicle.
// Đặt trong vehicle router để không đụng file user.js của thành viên khác.
router.get("/users", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        u.UserID AS id,
        u.FullName AS name,
        u.PhoneNumber AS phone,
        u.Email AS email,
        r.RoleName AS roleName
      FROM [USER] u
      LEFT JOIN [ROLE] r ON r.RoleID = u.RoleID
      WHERE ISNULL(r.RoleName, '') IN ('MEMBER', 'GUEST')
         OR r.RoleName IS NULL
      ORDER BY u.FullName ASC, u.UserID ASC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("[GET /api/vehicles/users]", err);
    res.status(500).json({ message: "Lỗi khi lấy danh sách chủ xe" });
  }
});

// GET /api/vehicles
// Query hỗ trợ: ?userId=1&search=59A
router.get("/", async (req, res) => {
  let userId =
    req.query.userId && req.query.userId !== "all"
      ? toInt(req.query.userId)
      : null;
  const search = normalizeText(req.query.search);

  // Enforce customer restriction: only view their own vehicles
  const user = getUserFromToken(req);
  if (user && isMemberRole(user.role)) {
    userId = user.userId;
  }

  if (userId === null && req.query.userId && req.query.userId !== "all") {
    return res.status(400).json({ message: "UserID không hợp lệ" });
  }

  try {
    const pool = await poolPromise;
    const request = pool.request();

    let where = "WHERE 1 = 1";

    if (userId !== null) {
      request.input("userId", sql.Int, userId);
      where += " AND v.UserID = @userId";
    }

    if (search) {
      request.input("search", sql.NVarChar(100), `%${search}%`);
      where += `
        AND (
          v.PlateNumber LIKE @search OR
          v.VehicleType LIKE @search OR
          v.Brand LIKE @search OR
          v.Model LIKE @search OR
          v.Color LIKE @search OR
          u.FullName LIKE @search OR
          u.PhoneNumber LIKE @search
        )
      `;
    }

    const result = await request.query(`
      SELECT
        v.VehicleID AS id,
        v.UserID AS userId,
        u.FullName AS ownerName,
        u.PhoneNumber AS ownerPhone,
        u.Email AS ownerEmail,
        v.PlateNumber AS plateNumber,
        v.VehicleType AS vehicleType,
        v.Brand AS brand,
        v.Model AS model,
        v.Color AS color,
        v.CreatedAt AS createdAt
      FROM VEHICLE v
      INNER JOIN [USER] u ON u.UserID = v.UserID
      ${where}
      ORDER BY v.CreatedAt DESC, v.VehicleID DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("[GET /api/vehicles]", err);
    res.status(500).json({ message: "Lỗi khi lấy danh sách xe" });
  }
});

// GET /api/vehicles/:id
router.get("/:id", async (req, res) => {
  const vehicleId = toInt(req.params.id);
  if (vehicleId === null)
    return res.status(400).json({ message: "VehicleID không hợp lệ" });

  try {
    const pool = await poolPromise;
    const vehicle = await getVehicleById(pool, vehicleId);

    if (!vehicle) return res.status(404).json({ message: "Không tìm thấy xe" });

    // Enforce customer restriction: can only view their own vehicle detail
    const user = getUserFromToken(req);
    if (user && isMemberRole(user.role) && vehicle.userId !== user.userId) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xem thông tin xe này" });
    }

    res.json(vehicle);
  } catch (err) {
    console.error("[GET /api/vehicles/:id]", err);
    res.status(500).json({ message: "Lỗi khi lấy chi tiết xe" });
  }
});

// POST /api/vehicles
// Body: { userId, plateNumber, vehicleType, brand, model, color }
router.post("/", async (req, res) => {
  let userId = toInt(req.body.userId);
  const plateNumber = normalizePlate(req.body.plateNumber);
  const vehicleType = normalizeVehicleType(req.body.vehicleType);
  const brand = normalizeText(req.body.brand);
  const model = normalizeText(req.body.model);
  const color = normalizeText(req.body.color);

  // Enforce customer restriction: only create vehicle for self
  const user = getUserFromToken(req);
  if (user && isMemberRole(user.role)) {
    userId = user.userId;
  }

  if (userId === null || !plateNumber || !vehicleType || !brand || !model || !color) {
    return res
      .status(400)
      .json({ message: "Vui lòng điền đầy đủ thông tin xe" });
  }

  if (!isValidPlate(plateNumber)) {
    return res
      .status(400)
      .json({
        message:
          "Biển số không hợp lệ. Chỉ dùng chữ/số/dấu - hoặc ., độ dài 5-20 ký tự",
      });
  }

  try {
    const pool = await poolPromise;

    const userCheck = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query("SELECT UserID FROM [USER] WHERE UserID = @userId");

    if (userCheck.recordset.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy chủ xe" });
    }

    const duplicate = await pool
      .request()
      .input("plateNumber", sql.NVarChar(20), plateNumber)
      .query("SELECT VehicleID FROM VEHICLE WHERE PlateNumber = @plateNumber");

    if (duplicate.recordset.length > 0) {
      return res
        .status(409)
        .json({ message: `Biển số ${plateNumber} đã tồn tại trong hệ thống` });
    }

    const inserted = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("plateNumber", sql.NVarChar(20), plateNumber)
      .input("vehicleType", sql.VarChar(20), vehicleType)
      .input("brand", sql.NVarChar(50), brand)
      .input("model", sql.NVarChar(50), model)
      .input("color", sql.NVarChar(30), color).query(`
        INSERT INTO VEHICLE (UserID, PlateNumber, VehicleType, Brand, Model, Color)
        OUTPUT INSERTED.VehicleID AS id
        VALUES (@userId, @plateNumber, @vehicleType, @brand, @model, @color)
      `);

    const vehicle = await getVehicleById(pool, inserted.recordset[0].id);
    res.status(201).json({ message: "Thêm xe thành công", vehicle });
  } catch (err) {
    console.error("[POST /api/vehicles]", err);
    res.status(500).json({ message: "Lỗi khi thêm xe mới" });
  }
});

// PUT /api/vehicles/:id
// Body: { plateNumber, vehicleType, brand, model, color }
router.put("/:id", async (req, res) => {
  const vehicleId = toInt(req.params.id);
  const plateNumber = normalizePlate(req.body.plateNumber);
  const vehicleType = normalizeVehicleType(req.body.vehicleType);
  const brand = normalizeText(req.body.brand);
  const model = normalizeText(req.body.model);
  const color = normalizeText(req.body.color);

  if (vehicleId === null)
    return res.status(400).json({ message: "VehicleID không hợp lệ" });
  if (!plateNumber || !vehicleType || !brand || !model || !color) {
    return res
      .status(400)
      .json({ message: "Vui lòng điền đầy đủ thông tin xe" });
  }

  if (!isValidPlate(plateNumber)) {
    return res
      .status(400)
      .json({
        message:
          "Biển số không hợp lệ. Chỉ dùng chữ/số/dấu - hoặc ., độ dài 5-20 ký tự",
      });
  }

  try {
    const pool = await poolPromise;

    const exists = await pool
      .request()
      .input("vehicleId", sql.Int, vehicleId)
      .query(
        "SELECT UserID, VehicleID FROM VEHICLE WHERE VehicleID = @vehicleId",
      );

    if (exists.recordset.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy xe" });
    }

    const vehicleRecord = exists.recordset[0];
    // Enforce customer restriction: only edit their own vehicle
    const user = getUserFromToken(req);
    if (user && isMemberRole(user.role) && vehicleRecord.UserID !== user.userId) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền chỉnh sửa xe này" });
    }

    const duplicate = await pool
      .request()
      .input("plateNumber", sql.NVarChar(20), plateNumber)
      .input("vehicleId", sql.Int, vehicleId)
      .query(
        "SELECT VehicleID FROM VEHICLE WHERE PlateNumber = @plateNumber AND VehicleID <> @vehicleId",
      );

    if (duplicate.recordset.length > 0) {
      return res
        .status(409)
        .json({ message: `Biển số ${plateNumber} đã được dùng bởi xe khác` });
    }

    await pool
      .request()
      .input("vehicleId", sql.Int, vehicleId)
      .input("plateNumber", sql.NVarChar(20), plateNumber)
      .input("vehicleType", sql.VarChar(20), vehicleType)
      .input("brand", sql.NVarChar(50), brand)
      .input("model", sql.NVarChar(50), model)
      .input("color", sql.NVarChar(30), color).query(`
        UPDATE VEHICLE
        SET PlateNumber = @plateNumber,
            VehicleType = @vehicleType,
            Brand = @brand,
            Model = @model,
            Color = @color
        WHERE VehicleID = @vehicleId
      `);

    const vehicle = await getVehicleById(pool, vehicleId);
    res.json({ message: "Cập nhật xe thành công", vehicle });
  } catch (err) {
    console.error("[PUT /api/vehicles/:id]", err);
    res.status(500).json({ message: "Lỗi khi cập nhật xe" });
  }
});

// DELETE /api/vehicles/:id
router.delete("/:id", async (req, res) => {
  const vehicleId = toInt(req.params.id);
  if (vehicleId === null)
    return res.status(400).json({ message: "VehicleID không hợp lệ" });

  try {
    const pool = await poolPromise;

    const vehicle = await getVehicleById(pool, vehicleId);
    if (!vehicle) return res.status(404).json({ message: "Không tìm thấy xe" });

    // Enforce customer restriction: only delete their own vehicle
    const user = getUserFromToken(req);
    if (user && isMemberRole(user.role) && vehicle.userId !== user.userId) {
      return res.status(403).json({ message: "Bạn không có quyền xóa xe này" });
    }

    await pool
      .request()
      .input("vehicleId", sql.Int, vehicleId)
      .query("DELETE FROM VEHICLE WHERE VehicleID = @vehicleId");

    res.json({ message: "Xóa xe thành công", vehicle });
  } catch (err) {
    console.error("[DELETE /api/vehicles/:id]", err);
    res.status(500).json({ message: "Lỗi khi xóa xe" });
  }
});

module.exports = router;
