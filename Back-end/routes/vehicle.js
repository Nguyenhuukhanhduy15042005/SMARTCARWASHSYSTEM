// ============================================================
// 📁 VỊ TRÍ FILE: Back-end/vehicleRouter.js
//
// 📌 THÊM VÀO Back-end/server.js:
//    const vehicleRouter = require('./vehicleRouter');
//    app.use(vehicleRouter);
// ============================================================

const express = require('express');
const router  = express.Router();
const sql     = require('mssql');

// Dùng chung dbConfig với bookingRouter
const dbConfig = {
  user:     process.env.DB_USER     || 'sa',
  password: process.env.DB_PASSWORD || '123456',
  server:   process.env.DB_SERVER   || 'localhost',
  database: process.env.DB_DATABASE || 'SMARTCARWASHSYSTEM',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log('✓ [vehicleRouter] Kết nối SQL Server thành công!');
    return pool;
  });

// ============================================================
// GET /api/vehicles
// Lấy danh sách xe — lọc theo userId nếu có
// Query: ?userId=1
// ============================================================
router.get('/', async (req, res) => {
  const { userId } = req.query;

  try {
    const pool    = await poolPromise;
    const request = pool.request();

    let query = `
      SELECT
        v.VehicleID   AS id,
        v.UserID      AS userId,
        u.FullName    AS ownerName,
        u.PhoneNumber AS ownerPhone,
        v.PlateNumber AS plateNumber,
        v.Brand       AS brand,
        v.Model       AS model,
        v.Color       AS color,
        v.CreatedAt   AS createdAt
      FROM VEHICLE v
      JOIN [USER] u ON v.UserID = u.UserID
      WHERE 1=1
    `;

    if (userId) {
      query += ` AND v.UserID = @userId`;
      request.input('userId', sql.Int, parseInt(userId));
    }

    query += ` ORDER BY v.CreatedAt DESC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách xe' });
  }
});

// ============================================================
// GET /api/vehicles/:id
// Lấy chi tiết 1 xe
// ============================================================
router.get('/:id', async (req, res) => {
  const vehicleId = parseInt(req.params.id);
  if (isNaN(vehicleId)) return res.status(400).json({ message: 'VehicleID không hợp lệ' });

  try {
    const pool   = await poolPromise;
    const result = await pool.request()
      .input('vehicleId', sql.Int, vehicleId)
      .query(`
        SELECT
          v.VehicleID   AS id,
          v.UserID      AS userId,
          u.FullName    AS ownerName,
          u.PhoneNumber AS ownerPhone,
          v.PlateNumber AS plateNumber,
          v.Brand       AS brand,
          v.Model       AS model,
          v.Color       AS color,
          v.CreatedAt   AS createdAt
        FROM VEHICLE v
        JOIN [USER] u ON v.UserID = u.UserID
        WHERE v.VehicleID = @vehicleId
      `);

    if (result.recordset.length === 0)
      return res.status(404).json({ message: 'Không tìm thấy xe' });

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi lấy chi tiết xe' });
  }
});

// ============================================================
// POST /api/vehicles
// Thêm xe mới cho 1 user
// Body: { userId, plateNumber, brand, model, color }
// ============================================================
router.post('/', async (req, res) => {
  const { userId, plateNumber, brand, model, color } = req.body;

  if (!userId || !plateNumber || !brand || !model || !color) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin xe' });
  }

  try {
    const pool = await poolPromise;

    // Kiểm tra user tồn tại
    const userCheck = await pool.request()
      .input('userId', sql.Int, parseInt(userId))
      .query('SELECT UserID FROM [USER] WHERE UserID = @userId');

    if (userCheck.recordset.length === 0)
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    // Kiểm tra biển số trùng
    const plateCheck = await pool.request()
      .input('plateNumber', sql.NVarChar, plateNumber.trim())
      .query('SELECT VehicleID FROM VEHICLE WHERE PlateNumber = @plateNumber');

    if (plateCheck.recordset.length > 0)
      return res.status(409).json({ message: `Biển số ${plateNumber} đã tồn tại trong hệ thống` });

    // Insert xe mới
    const result = await pool.request()
      .input('userId',      sql.Int,        parseInt(userId))
      .input('plateNumber', sql.NVarChar,   plateNumber.trim())
      .input('brand',       sql.NVarChar,   brand.trim())
      .input('model',       sql.NVarChar,   model.trim())
      .input('color',       sql.NVarChar,   color.trim())
      .query(`
        INSERT INTO VEHICLE (UserID, PlateNumber, Brand, Model, Color, CreatedAt)
        OUTPUT INSERTED.VehicleID, INSERTED.CreatedAt
        VALUES (@userId, @plateNumber, @brand, @model, @color, GETDATE())
      `);

    const newId        = result.recordset[0].VehicleID;
    const newCreatedAt = result.recordset[0].CreatedAt;

    // Lấy tên chủ xe để trả về
    const userRes = await pool.request()
      .input('userId', sql.Int, parseInt(userId))
      .query('SELECT FullName, PhoneNumber FROM [USER] WHERE UserID = @userId');

    res.status(201).json({
      id:          newId,
      userId:      parseInt(userId),
      ownerName:   userRes.recordset[0].FullName,
      ownerPhone:  userRes.recordset[0].PhoneNumber,
      plateNumber: plateNumber.trim(),
      brand:       brand.trim(),
      model:       model.trim(),
      color:       color.trim(),
      createdAt:   newCreatedAt
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi thêm xe mới' });
  }
});

// ============================================================
// PUT /api/vehicles/:id
// Cập nhật thông tin xe
// Body: { plateNumber, brand, model, color }
// ============================================================
router.put('/:id', async (req, res) => {
  const vehicleId = parseInt(req.params.id);
  if (isNaN(vehicleId)) return res.status(400).json({ message: 'VehicleID không hợp lệ' });

  const { plateNumber, brand, model, color } = req.body;

  if (!plateNumber || !brand || !model || !color) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin xe' });
  }

  try {
    const pool = await poolPromise;

    // Kiểm tra xe tồn tại
    const vehicleCheck = await pool.request()
      .input('vehicleId', sql.Int, vehicleId)
      .query('SELECT VehicleID FROM VEHICLE WHERE VehicleID = @vehicleId');

    if (vehicleCheck.recordset.length === 0)
      return res.status(404).json({ message: 'Không tìm thấy xe' });

    // Kiểm tra biển số trùng với xe khác
    const plateCheck = await pool.request()
      .input('plateNumber', sql.NVarChar, plateNumber.trim())
      .input('vehicleId',   sql.Int,      vehicleId)
      .query('SELECT VehicleID FROM VEHICLE WHERE PlateNumber = @plateNumber AND VehicleID != @vehicleId');

    if (plateCheck.recordset.length > 0)
      return res.status(409).json({ message: `Biển số ${plateNumber} đã được dùng bởi xe khác` });

    await pool.request()
      .input('vehicleId',   sql.Int,      vehicleId)
      .input('plateNumber', sql.NVarChar, plateNumber.trim())
      .input('brand',       sql.NVarChar, brand.trim())
      .input('model',       sql.NVarChar, model.trim())
      .input('color',       sql.NVarChar, color.trim())
      .query(`
        UPDATE VEHICLE
        SET PlateNumber = @plateNumber,
            Brand       = @brand,
            Model       = @model,
            Color       = @color
        WHERE VehicleID = @vehicleId
      `);

    res.json({ message: 'Cập nhật xe thành công', id: vehicleId, plateNumber, brand, model, color });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi cập nhật xe' });
  }
});

// ============================================================
// DELETE /api/vehicles/:id
// Xóa xe
// ============================================================
router.delete('/:id', async (req, res) => {
  const vehicleId = parseInt(req.params.id);
  if (isNaN(vehicleId)) return res.status(400).json({ message: 'VehicleID không hợp lệ' });

  try {
    const pool = await poolPromise;

    const vehicleCheck = await pool.request()
      .input('vehicleId', sql.Int, vehicleId)
      .query('SELECT VehicleID FROM VEHICLE WHERE VehicleID = @vehicleId');

    if (vehicleCheck.recordset.length === 0)
      return res.status(404).json({ message: 'Không tìm thấy xe' });

    await pool.request()
      .input('vehicleId', sql.Int, vehicleId)
      .query('DELETE FROM VEHICLE WHERE VehicleID = @vehicleId');

    res.json({ message: 'Đã xóa xe thành công', id: vehicleId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi xóa xe' });
  }
});

module.exports = router;
