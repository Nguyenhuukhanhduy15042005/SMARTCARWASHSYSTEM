const express = require("express");
const { sql, poolPromise } = require("../db");
const verifyToken = require("../middleware/verifyToken");
const router = express.Router();

// Chỉ admin (1) và staff (2) mới được dùng các API này
const requireStaff = (req, res, next) => {
  if (req.user.roleId !== 1 && req.user.roleId !== 2) {
    return res
      .status(403)
      .json({ message: "Chỉ Admin/Staff mới có quyền thực hiện!" });
  }
  next();
};

// ================================================================
// MACHINE APIs
// ================================================================

// GET /api/machines — Lấy danh sách tất cả máy + lịch bảo trì gần nhất
// GET /api/machines — Lấy danh sách tất cả máy + lịch bảo trì gần nhất
router.get("/", verifyToken, requireStaff, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        m.MachineID,
        m.MachineName,
        m.MachineType,
        m.Status,
        CASE m.Status
          WHEN 1 THEN N'Idle'
          WHEN 2 THEN N'Đang hoạt động'
          WHEN 3 THEN N'Đang bảo trì'
          ELSE N'Không xác định'
        END AS StatusLabel,
        -- Lần bảo trì gần nhất (CHỈ LẤY NGÀY TRONG QUÁ KHỨ HOẶC HIỆN TẠI)
        (SELECT TOP 1 mt.MaintenanceDate 
         FROM MAINTENANCE mt 
         WHERE mt.MachineID = m.MachineID 
           AND mt.MaintenanceDate <= GETDATE()
         ORDER BY mt.MaintenanceDate DESC) AS LastMaintenanceDate,
        -- Số lần bảo trì thực tế đã chạy (KHÔNG TÍNH LỊCH HẸN TƯƠNG LAI)
        (SELECT COUNT(*) 
         FROM MAINTENANCE mt 
         WHERE mt.MachineID = m.MachineID 
           AND mt.MaintenanceDate <= GETDATE()) AS TotalMaintenances
      FROM MACHINE m
      ORDER BY m.MachineID ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// GET /api/machines/:id — Lấy chi tiết 1 máy
router.get("/:id", verifyToken, requireStaff, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("machineId", sql.Int, req.params.id).query(`
        SELECT 
          m.MachineID,
          m.MachineName,
          m.MachineType,
          m.Status,
          CASE m.Status
            WHEN 1 THEN N'Idle'
            WHEN 2 THEN N'Đang hoạt động'
            WHEN 3 THEN N'Đang bảo trì'
          END AS StatusLabel
        FROM MACHINE m
        WHERE m.MachineID = @machineId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy máy!" });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// POST /api/machines — Thêm máy mới
router.post("/", verifyToken, requireStaff, async (req, res) => {
  const { machineName, machineType } = req.body;

  if (!machineName || !machineType) {
    return res
      .status(400)
      .json({ message: "Vui lòng nhập đầy đủ tên máy và loại máy!" });
  }

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("machineName", sql.NVarChar, machineName)
      .input("machineType", sql.NVarChar, machineType).query(`
        INSERT INTO MACHINE (MachineName, MachineType, Status)
        OUTPUT INSERTED.MachineID
        VALUES (@machineName, @machineType, 1)
      `);

    res.status(201).json({
      message: "Thêm máy thành công!",
      machineId: result.recordset[0].MachineID,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// PUT /api/machines/:id/status — Cập nhật trạng thái máy
router.put("/:id/status", verifyToken, requireStaff, async (req, res) => {
  const { status } = req.body;

  if (![1, 2, 3].includes(Number(status))) {
    return res.status(400).json({
      message:
        "Trạng thái không hợp lệ! (1: Idle, 2: Đang hoạt động, 3: Bảo trì)",
    });
  }

  try {
    const pool = await poolPromise;

    // Kiểm tra máy có tồn tại không
    const check = await pool
      .request()
      .input("machineId", sql.Int, req.params.id)
      .query("SELECT MachineID FROM MACHINE WHERE MachineID = @machineId");

    if (check.recordset.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy máy!" });
    }

    await pool
      .request()
      .input("status", sql.TinyInt, status)
      .input("machineId", sql.Int, req.params.id)
      .query(
        "UPDATE MACHINE SET Status = @status WHERE MachineID = @machineId",
      );

    res.json({ message: "Cập nhật trạng thái máy thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// PUT /api/machines/:id — Cập nhật thông tin máy
router.put("/:id", verifyToken, requireStaff, async (req, res) => {
  const { machineName, machineType, status } = req.body;

  try {
    const pool = await poolPromise;

    const check = await pool
      .request()
      .input("machineId", sql.Int, req.params.id)
      .query("SELECT MachineID FROM MACHINE WHERE MachineID = @machineId");

    if (check.recordset.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy máy!" });
    }

    await pool
      .request()
      .input("machineName", sql.NVarChar, machineName)
      .input("machineType", sql.NVarChar, machineType)
      .input("status", sql.TinyInt, status)
      .input("machineId", sql.Int, req.params.id).query(`
        UPDATE MACHINE 
        SET MachineName = @machineName, MachineType = @machineType, Status = @status
        WHERE MachineID = @machineId
      `);

    res.json({ message: "Cập nhật máy thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// DELETE /api/machines/:id — Xóa máy
router.delete("/:id", verifyToken, requireStaff, async (req, res) => {
  try {
    const pool = await poolPromise;

    const check = await pool
      .request()
      .input("machineId", sql.Int, req.params.id)
      .query("SELECT MachineID FROM MACHINE WHERE MachineID = @machineId");

    if (check.recordset.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy máy!" });
    }

    await pool
      .request()
      .input("machineId", sql.Int, req.params.id)
      .query("DELETE FROM MACHINE WHERE MachineID = @machineId");

    res.json({ message: "Xóa máy thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// ================================================================
// MAINTENANCE APIs
// ================================================================

// GET /api/machines/maintenance/all — Lấy tất cả lịch bảo trì
router.get("/maintenance/all", verifyToken, requireStaff, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        mt.MaintenanceID,
        mt.MachineID,
        m.MachineName,
        m.MachineType,
        mt.OperatorID,
        u.FullName AS OperatorName,
        mt.Description,
        mt.MaintenanceDate
      FROM MAINTENANCE mt
      JOIN MACHINE m ON mt.MachineID = m.MachineID
      JOIN [USER] u ON mt.OperatorID = u.UserID
      ORDER BY mt.MaintenanceDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// GET /api/machines/:id/maintenance — Lấy lịch bảo trì của 1 máy
router.get("/:id/maintenance", verifyToken, requireStaff, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("machineId", sql.Int, req.params.id).query(`
        SELECT 
          mt.MaintenanceID,
          mt.MachineID,
          m.MachineName,
          mt.OperatorID,
          u.FullName AS OperatorName,
          mt.Description,
          mt.MaintenanceDate
        FROM MAINTENANCE mt
        JOIN MACHINE m ON mt.MachineID = m.MachineID
        JOIN [USER] u ON mt.OperatorID = u.UserID
        WHERE mt.MachineID = @machineId
        ORDER BY mt.MaintenanceDate DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// POST /api/machines/:id/maintenance — Lên lịch bảo trì + tự động set Status = 3
router.post("/:id/maintenance", verifyToken, requireStaff, async (req, res) => {
  const { description, maintenanceDate } = req.body;
  const operatorId = req.user.userId;

  if (!description) {
    return res.status(400).json({ message: "Vui lòng nhập mô tả bảo trì!" });
  }

  try {
    const pool = await poolPromise;

    // Kiểm tra máy có tồn tại không
    const check = await pool
      .request()
      .input("machineId", sql.Int, req.params.id)
      .query("SELECT MachineID FROM MACHINE WHERE MachineID = @machineId");

    if (check.recordset.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy máy!" });
    }

    // Thêm bản ghi bảo trì
    const insertResult = await pool
      .request()
      .input("machineId", sql.Int, req.params.id)
      .input("operatorId", sql.Int, operatorId)
      .input("description", sql.NVarChar, description)
      .input(
        "maintenanceDate",
        sql.DateTime,
        maintenanceDate ? new Date(maintenanceDate) : new Date(),
      ).query(`
        INSERT INTO MAINTENANCE (MachineID, OperatorID, Description, MaintenanceDate)
        OUTPUT INSERTED.MaintenanceID
        VALUES (@machineId, @operatorId, @description, @maintenanceDate)
      `);

    // Tự động cập nhật Status = 3 (Maintenance)

    res.status(201).json({
      message:
        "Lên lịch bảo trì thành công! Máy đã được chuyển sang trạng thái Bảo trì.",
      maintenanceId: insertResult.recordset[0].MaintenanceID,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// PUT /api/machines/maintenance/:maintenanceId — Cập nhật bảo trì
router.put(
  "/maintenance/:maintenanceId",
  verifyToken,
  requireStaff,
  async (req, res) => {
    const { description, maintenanceDate } = req.body;

    try {
      const pool = await poolPromise;

      const check = await pool
        .request()
        .input("maintenanceId", sql.Int, req.params.maintenanceId)
        .query(
          "SELECT MaintenanceID FROM MAINTENANCE WHERE MaintenanceID = @maintenanceId",
        );

      if (check.recordset.length === 0) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy bản ghi bảo trì!" });
      }

      await pool
        .request()
        .input("description", sql.NVarChar, description)
        .input(
          "maintenanceDate",
          sql.DateTime,
          maintenanceDate ? new Date(maintenanceDate) : new Date(),
        )
        .input("maintenanceId", sql.Int, req.params.maintenanceId).query(`
        UPDATE MAINTENANCE 
        SET Description = @description, MaintenanceDate = @maintenanceDate
        WHERE MaintenanceID = @maintenanceId
      `);

      res.json({ message: "Cập nhật bảo trì thành công!" });
    } catch (err) {
      res.status(500).json({ message: "Lỗi server: " + err.message });
    }
  },
);

// DELETE /api/machines/maintenance/:maintenanceId — Xóa bản ghi bảo trì
router.delete(
  "/maintenance/:maintenanceId",
  verifyToken,
  requireStaff,
  async (req, res) => {
    try {
      const pool = await poolPromise;

      const check = await pool
        .request()
        .input("maintenanceId", sql.Int, req.params.maintenanceId)
        .query(
          "SELECT MaintenanceID FROM MAINTENANCE WHERE MaintenanceID = @maintenanceId",
        );

      if (check.recordset.length === 0) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy bản ghi bảo trì!" });
      }

      await pool
        .request()
        .input("maintenanceId", sql.Int, req.params.maintenanceId)
        .query("DELETE FROM MAINTENANCE WHERE MaintenanceID = @maintenanceId");

      res.json({ message: "Xóa bản ghi bảo trì thành công!" });
    } catch (err) {
      res.status(500).json({ message: "Lỗi server: " + err.message });
    }
  },
);

module.exports = router;
