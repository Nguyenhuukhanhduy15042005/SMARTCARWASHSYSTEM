const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const sql = require('mssql');

const SECRET_KEY = 'my_secret_key'; 

// Cấu hình kết nối Microsoft SQL Server
const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '12345', // Mật khẩu SQL của bạn 
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'AUTOMATIC_CARWASH1',
  options: {
    encrypt: false, // Set true nếu chạy trên Azure
    trustServerCertificate: true // Quan trọng để kết nối cục bộ (localhost)
  }
};

// Khởi tạo Connection Pool
const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log('✓ Kết nối Microsoft SQL Server thành công!');
    return pool;
  });

// GET /api/machines: Lấy trạng thái hoạt động của các khoang rửa xe (bays)
router.get('/api/machines', async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ message: "Không thể kết nối đến cơ sở dữ liệu SQL Server" });

    const result = await pool.request().query('SELECT * FROM MACHINE');
    const mapped = result.recordset.map(m => {
      let statusStr = 'Available';
      if (m.Status === 2) statusStr = 'Operating';
      else if (m.Status === 3) statusStr = 'Under Maintenance';
      
      return {
        id: String(m.MachineID),
        name: m.MachineName,
        type: m.MachineType === 'BIKE_WASHER' ? 'BIKE' : 'CAR',
        status: statusStr
      };
    });
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi khi lấy danh sách khoang rửa xe" });
  }
});

// GET /api/users/points: Lấy điểm tích lũy của user hiện tại
router.get('/api/users/points', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Không tìm thấy token" });
  
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, SECRET_KEY);
    
    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ message: "Không thể kết nối đến cơ sở dữ liệu SQL Server" });

    const result = await pool.request()
      .input('username', sql.NVarChar, decoded.username)
      .query(`
        SELECT mp.CurrentPoints 
        FROM MEMBER_PROFILE mp
        JOIN [USER] u ON mp.UserID = u.UserID
        WHERE u.PhoneNumber = @username OR u.FullName = @username
      `);
      
    const points = result.recordset.length > 0 ? result.recordset[0].CurrentPoints : 0;
    res.json({ points });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Token không hợp lệ hoặc lỗi kết nối CSDL" });
  }
});

// GET /api/bookings: Lấy danh sách booking kèm lọc và tìm kiếm (Task 7)
router.get('/api/bookings', async (req, res) => {
  const { status, startDate, endDate, search } = req.query;
  
  try {
    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ message: "Không thể kết nối đến cơ sở dữ liệu SQL Server" });

    let queryStr = `
      SELECT 
        b.BookingID AS id,
        u.FullName AS customerName,
        u.PhoneNumber AS customerPhone,
        b.VehicleType AS vehicleType,
        s.ServiceName AS servicePackage,
        b.TotalPrice AS price,
        b.BookingDate AS createdAt,
        b.BookingDate AS scheduledTime,
        b.Status AS dbStatus,
        b.CheckInTime AS checkInTime,
        bd.MachineID AS machineId
      FROM BOOKING b
      JOIN [USER] u ON b.CustomerID = u.UserID
      LEFT JOIN BOOKING_DETAIL bd ON b.BookingID = bd.BookingID
      LEFT JOIN SERVICE s ON bd.ServiceID = s.ServiceID
      WHERE 1=1
    `;

    const request = pool.request();

    if (status && status !== 'All') {
      const statusMap = { 'pending': 1, 'confirmed': 2, 'in service': 3, 'completed': 4, 'cancelled': 5 };
      const dbStatus = statusMap[status.toLowerCase()] || 1;
      queryStr += ` AND b.Status = @dbStatus`;
      request.input('dbStatus', sql.TinyInt, dbStatus);
    }

    if (startDate) {
      queryStr += ` AND b.BookingDate >= @startDate`;
      request.input('startDate', sql.DateTime, new Date(startDate));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      queryStr += ` AND b.BookingDate <= @endDate`;
      request.input('endDate', sql.DateTime, end);
    }

    if (search) {
      queryStr += ` AND (u.FullName LIKE @search OR u.PhoneNumber LIKE @search OR CAST(b.BookingID AS VARCHAR) LIKE @search)`;
      request.input('search', sql.NVarChar, `%${search}%`);
    }

    queryStr += ` ORDER BY b.BookingDate DESC`;

    const result = await request.query(queryStr);

    const DB_STATUS_TO_STRING = {
      1: 'Pending',
      2: 'Confirmed',
      3: 'In Service',
      4: 'Completed',
      5: 'Cancelled'
    };

    const grouped = {};
    for (const b of result.recordset) {
      if (!grouped[b.id]) {
        const points = b.dbStatus === 4 ? Math.floor(b.price / 10000) : 0;
        grouped[b.id] = {
          id: `BK-${b.id}`,
          customerName: b.customerName,
          customerPhone: b.customerPhone,
          vehicleType: b.vehicleType,
          servicePackagesList: b.servicePackage ? [b.servicePackage] : [],
          price: Number(b.price),
          createdAt: b.createdAt.toISOString(),
          scheduledTime: b.scheduledTime.toISOString(),
          status: DB_STATUS_TO_STRING[b.dbStatus] || 'Pending',
          paymentStatus: b.dbStatus >= 2 ? (b.dbStatus === 5 ? 'Refunded' : 'Paid') : 'Unpaid',
          machineId: b.machineId ? String(b.machineId) : null,
          loyaltyPointsEarned: points
        };
      } else {
        if (b.servicePackage && !grouped[b.id].servicePackagesList.includes(b.servicePackage)) {
          grouped[b.id].servicePackagesList.push(b.servicePackage);
        }
        if (b.machineId && !grouped[b.id].machineId) {
          grouped[b.id].machineId = String(b.machineId);
        }
      }
    }

    const mapped = Object.values(grouped).map(b => {
      b.servicePackage = b.servicePackagesList.join(", ") || "Rửa tiêu chuẩn";
      delete b.servicePackagesList;
      return b;
    });

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi kết nối CSDL khi lấy danh sách booking" });
  }
});

// GET /api/bookings/:id: Lấy chi tiết một booking (Task 7)
router.get('/api/bookings/:id', async (req, res) => {
  const bookingIdStr = req.params.id;
  const bookingId = parseInt(bookingIdStr.replace('BK-', ''));
  if (isNaN(bookingId)) return res.status(400).json({ message: "Mã đặt lịch không hợp lệ" });

  try {
    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ message: "Không thể kết nối đến cơ sở dữ liệu SQL Server" });

    const result = await pool.request()
      .input('bookingId', sql.Int, bookingId)
      .query(`
        SELECT 
          b.BookingID AS id,
          u.FullName AS customerName,
          u.PhoneNumber AS customerPhone,
          b.VehicleType AS vehicleType,
          s.ServiceName AS servicePackage,
          b.TotalPrice AS price,
          b.BookingDate AS createdAt,
          b.BookingDate AS scheduledTime,
          b.Status AS dbStatus,
          b.CheckInTime AS checkInTime,
          bd.MachineID AS machineId
        FROM BOOKING b
        JOIN [USER] u ON b.CustomerID = u.UserID
        LEFT JOIN BOOKING_DETAIL bd ON b.BookingID = bd.BookingID
        LEFT JOIN SERVICE s ON bd.ServiceID = s.ServiceID
        WHERE b.BookingID = @bookingId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy lịch đặt rửa xe" });
    }

    const b = result.recordset[0];
    const points = b.dbStatus === 4 ? Math.floor(b.price / 10000) : 0;
    const statusStr = { 1: 'Pending', 2: 'Confirmed', 3: 'In Service', 4: 'Completed', 5: 'Cancelled' }[b.dbStatus] || 'Pending';

    // Tạo lịch sử FSM động dựa trên timestamps trong database
    const history = [
      { status: 'Pending', time: b.createdAt.toISOString(), note: 'Khởi tạo booking, chờ thanh toán' }
    ];
    if (b.dbStatus >= 2 && b.dbStatus !== 5) {
      history.push({ status: 'Confirmed', time: b.createdAt.toISOString(), note: 'Đã xác nhận thanh toán trực tuyến thành công' });
    }
    if (b.checkInTime) {
      history.push({ status: 'In Service', time: b.checkInTime.toISOString(), note: 'Khách check-in tại trạm, xe đưa vào buồng rửa' });
    }
    if (b.dbStatus === 4) {
      const completeTime = b.checkInTime ? new Date(b.checkInTime.getTime() + 20 * 60 * 1000) : new Date();
      history.push({ status: 'Completed', time: completeTime.toISOString(), note: `Chu trình rửa hoàn tất, tích lũy +${points} điểm` });
    }
    if (b.dbStatus === 5) {
      history.push({ status: 'Cancelled', time: b.createdAt.toISOString(), note: 'Hủy đặt lịch' });
    }

    res.json({
      id: `BK-${b.id}`,
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      vehicleType: b.vehicleType,
      servicePackage: b.servicePackage || "Rửa tiêu chuẩn",
      price: Number(b.price),
      createdAt: b.createdAt.toISOString(),
      scheduledTime: b.scheduledTime.toISOString(),
      status: statusStr,
      paymentStatus: b.dbStatus >= 2 ? (b.dbStatus === 5 ? 'Refunded' : 'Paid') : 'Unpaid',
      machineId: b.machineId ? String(b.machineId) : null,
      loyaltyPointsEarned: points,
      history: history
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi lấy chi tiết đặt lịch từ CSDL" });
  }
});

// POST /api/bookings: Tạo booking mới (Trạng thái ban đầu: Created/1)
router.post('/api/bookings', async (req, res) => {
  const { customerName, customerPhone, vehicleType, servicePackage, price, scheduledTime, machineId } = req.body;

  if (!customerName || !customerPhone || !vehicleType || !servicePackage || !price || !scheduledTime) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin đặt lịch" });
  }

  try {
    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ message: "Không thể kết nối đến cơ sở dữ liệu SQL Server" });

    // 1. Kiểm tra / Tạo User nếu chưa tồn tại
    let userRes = await pool.request()
      .input('phone', sql.NVarChar, customerPhone)
      .query('SELECT UserID FROM [USER] WHERE PhoneNumber = @phone');

    let customerId;
    if (userRes.recordset.length > 0) {
      customerId = userRes.recordset[0].UserID;
    } else {
      // Thêm User mới với RoleID = 3 (Member)
      const insertUserRes = await pool.request()
        .input('fullName', sql.NVarChar, customerName)
        .input('phone', sql.NVarChar, customerPhone)
        .query(`
          INSERT INTO [USER] (FullName, PhoneNumber, RoleID) 
          OUTPUT INSERTED.UserID 
          VALUES (@fullName, @phone, 3)
        `);
      customerId = insertUserRes.recordset[0].UserID;

      // Tạo Profile thành viên mặc định
      await pool.request()
        .input('userId', sql.Int, customerId)
        .query(`
          INSERT INTO MEMBER_PROFILE (UserID, TierID, CurrentPoints, AccumulatedPoints, JoinDate)
          VALUES (@userId, 1, 0, 0, GETDATE())
        `);
    }

    // 2. Kiểm tra/lấy ServiceID tương ứng
    let serviceRes = await pool.request()
      .input('serviceName', sql.NVarChar, servicePackage)
      .query('SELECT ServiceID FROM SERVICE WHERE ServiceName = @serviceName');
      
    let serviceId = serviceRes.recordset.length > 0 ? serviceRes.recordset[0].ServiceID : null;
    if (!serviceId) {
      const insertServiceRes = await pool.request()
        .input('serviceName', sql.NVarChar, servicePackage)
        .input('price', sql.Decimal(12,2), price)
        .input('vehicleType', sql.NVarChar, vehicleType)
        .query(`
          INSERT INTO SERVICE (ServiceName, BasePrice, ApplicableVehicleType) 
          OUTPUT INSERTED.ServiceID 
          VALUES (@serviceName, @price, @vehicleType)
        `);
      serviceId = insertServiceRes.recordset[0].ServiceID;
    }

    // 3. Chọn khoang rửa xe
    let finalMachineId = machineId;
    if (!finalMachineId) {
      const machineType = vehicleType === 'BIKE' ? 'BIKE_WASHER' : 'CAR_WASHER';
      const compRes = await pool.request()
        .input('mType', sql.NVarChar, machineType)
        .query("SELECT TOP 1 MachineID FROM MACHINE WHERE MachineType = @mType AND Status = 1");
      if (compRes.recordset.length === 0) {
        return res.status(400).json({ message: `Không có khoang rửa xe khả dụng cho phương tiện ${vehicleType}` });
      }
      finalMachineId = compRes.recordset[0].MachineID;
    }

    // 4. Lưu vào BOOKING (Status = 1: Created)
    const bookingRes = await pool.request()
      .input('customerId', sql.Int, customerId)
      .input('vehicleType', sql.NVarChar, vehicleType)
      .input('price', sql.Decimal(12,2), price)
      .input('scheduledTime', sql.DateTime, new Date(scheduledTime))
      .query(`
        INSERT INTO BOOKING (CustomerID, VehicleType, TotalPrice, FinalPrice, Status, BookingDate)
        OUTPUT INSERTED.BookingID
        VALUES (@customerId, @vehicleType, @price, @price, 1, @scheduledTime)
      `);
    
    const newBookingId = bookingRes.recordset[0].BookingID;

    // 5. Lưu vào BOOKING_DETAIL
    await pool.request()
      .input('bookingId', sql.Int, newBookingId)
      .input('serviceId', sql.Int, serviceId)
      .input('machineId', sql.Int, finalMachineId)
      .input('price', sql.Decimal(12,2), price)
      .query(`
        INSERT INTO BOOKING_DETAIL (BookingID, ServiceID, MachineID, PriceAtBooking)
        VALUES (@bookingId, @serviceId, @machineId, @price)
      `);

    res.status(201).json({
      id: `BK-${newBookingId}`,
      customerName,
      customerPhone,
      vehicleType,
      servicePackage,
      price: Number(price),
      createdAt: new Date().toISOString(),
      scheduledTime: new Date(scheduledTime).toISOString(),
      status: 'Pending',
      paymentStatus: 'Unpaid',
      machineId: finalMachineId ? String(finalMachineId) : null,
      loyaltyPointsEarned: 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi kết nối CSDL khi tạo lịch đặt rửa xe" });
  }
});

// POST /api/bookings/:id/transition: Xử lý State Machine chuyển trạng thái (Task 6)
router.post('/api/bookings/:id/transition', async (req, res) => {
  const bookingIdStr = req.params.id;
  const bookingId = parseInt(bookingIdStr.replace('BK-', ''));
  const { action, note } = req.body;

  if (isNaN(bookingId)) return res.status(400).json({ message: "Mã đặt lịch không hợp lệ" });

  try {
    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ message: "Không thể kết nối đến cơ sở dữ liệu SQL Server" });

    // Lấy thông tin đặt lịch hiện tại
    const result = await pool.request()
      .input('bookingId', sql.Int, bookingId)
      .query(`
        SELECT b.Status, b.TotalPrice, b.CustomerID, bd.MachineID
        FROM BOOKING b
        LEFT JOIN BOOKING_DETAIL bd ON b.BookingID = bd.BookingID
        WHERE b.BookingID = @bookingId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy lịch đặt xe" });
    }

    const b = result.recordset[0];
    const currentStatus = b.Status; // Status trong db (TINYINT: 1-5)
    const machineId = b.MachineID;
    const customerId = b.CustomerID;
    const price = Number(b.TotalPrice);

    let nextStatus = currentStatus;

    if (action === 'pay') {
      if (currentStatus !== 1) {
        return res.status(400).json({ message: `Không thể thanh toán cho lịch đặt đang ở trạng thái ${currentStatus}` });
      }
      nextStatus = 2; // Confirmed / Checked-In
      await pool.request()
        .input('bookingId', sql.Int, bookingId)
        .query('UPDATE BOOKING SET Status = 2 WHERE BookingID = @bookingId');
        
      // Lưu thông tin thanh toán vào bảng PAYMENT
      await pool.request()
        .input('bookingId', sql.Int, bookingId)
        .input('amount', sql.Decimal(12,2), price)
        .query(`
          INSERT INTO PAYMENT (BookingID, PaymentMethod, Amount, PaidAt)
          VALUES (@bookingId, 'BANK', @amount, GETDATE())
        `);
    } 
    else if (action === 'checkin') {
      if (currentStatus !== 2) {
        return res.status(400).json({ message: `Không thể check-in cho lịch đặt ở trạng thái ${currentStatus}` });
      }
      nextStatus = 3; // In Progress / In Service
      await pool.request()
        .input('bookingId', sql.Int, bookingId)
        .query('UPDATE BOOKING SET Status = 3, CheckInTime = GETDATE() WHERE BookingID = @bookingId');

      // Khóa máy rửa xe sang trạng thái Operating (2)
      if (machineId) {
        await pool.request()
          .input('machineId', sql.Int, machineId)
          .query('UPDATE MACHINE SET Status = 2 WHERE MachineID = @machineId');
      }
    } 
    else if (action === 'complete') {
      if (currentStatus !== 3) {
        return res.status(400).json({ message: `Không thể hoàn tất khi lịch đặt ở trạng thái ${currentStatus}` });
      }
      nextStatus = 4; // Completed
      await pool.request()
        .input('bookingId', sql.Int, bookingId)
        .query('UPDATE BOOKING SET Status = 4 WHERE BookingID = @bookingId');

      // Giải phóng máy rửa xe quay lại Idle (1)
      if (machineId) {
        await pool.request()
          .input('machineId', sql.Int, machineId)
          .query('UPDATE MACHINE SET Status = 1 WHERE MachineID = @machineId');
      }

      // Tích điểm tích lũy thành viên (10k = 1 điểm)
      const points = Math.floor(price / 10000);
      if (points > 0) {
        const profileRes = await pool.request()
          .input('userId', sql.Int, customerId)
          .query('SELECT UserID FROM MEMBER_PROFILE WHERE UserID = @userId');

        if (profileRes.recordset.length > 0) {
          // Cộng điểm trực tiếp
          await pool.request()
            .input('userId', sql.Int, customerId)
            .input('points', sql.Int, points)
            .query(`
              UPDATE MEMBER_PROFILE 
              SET CurrentPoints = CurrentPoints + @points,
                  AccumulatedPoints = AccumulatedPoints + @points
              WHERE UserID = @userId
            `);

          // Lưu lịch sử giao dịch điểm
          await pool.request()
            .input('userId', sql.Int, customerId)
            .input('bookingId', sql.Int, bookingId)
            .input('points', sql.Int, points)
            .query(`
              INSERT INTO LOYALTY_TRANSACTION (UserID, BookingID, TransactionType, Points, CreatedDate)
              VALUES (@userId, @bookingId, 'EARN', @points, GETDATE())
            `);
        }
      }
    } 
    else if (action === 'cancel') {
      if (currentStatus !== 1 && currentStatus !== 2) {
        return res.status(400).json({ message: `Không thể hủy lịch đặt ở trạng thái ${currentStatus}` });
      }
      nextStatus = 5; // Cancelled
      await pool.request()
        .input('bookingId', sql.Int, bookingId)
        .query('UPDATE BOOKING SET Status = 5 WHERE BookingID = @bookingId');

      // Giải phóng máy rửa xe quay lại Idle (1)
      if (machineId) {
        await pool.request()
          .input('machineId', sql.Int, machineId)
          .query('UPDATE MACHINE SET Status = 1 WHERE MachineID = @machineId');
      }
    } 
    else {
      return res.status(400).json({ message: "Hành động chuyển đổi trạng thái không hợp lệ" });
    }

    res.json({ message: "Chuyển trạng thái thành công", nextStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi chuyển đổi trạng thái trong CSDL" });
  }
});

// Bộ tự động kiểm soát thời hạn (Scheduler) chạy mỗi 15 giây trực tiếp trên database
const schedulerInterval = setInterval(async () => {
  try {
    const pool = await poolPromise;
    if (!pool) return;

    const now = new Date();

    // BR-12: Hủy tự động nếu quá hạn thanh toán 5 phút (Status = 1)
    const limitPending = new Date(now.getTime() - 5 * 60 * 1000);
    
    // 1. Giải phóng các khoang máy (Machine) cho các booking bị hủy (Status = 1)
    await pool.request()
      .input('limitTime', sql.DateTime, limitPending)
      .query(`
        UPDATE MACHINE 
        SET Status = 1 
        WHERE MachineID IN (
          SELECT bd.MachineID 
          FROM BOOKING b
          JOIN BOOKING_DETAIL bd ON b.BookingID = bd.BookingID
          WHERE b.Status = 1 AND b.BookingDate <= @limitTime
        )
      `);

    // 2. Chuyển đổi trạng thái các booking quá hạn sang Đã hủy (Status = 5)
    const pendingResult = await pool.request()
      .input('limitTime', sql.DateTime, limitPending)
      .query(`
        UPDATE BOOKING 
        SET Status = 5 
        WHERE Status = 1 AND BookingDate <= @limitTime
      `);
      
    if (pendingResult.rowsAffected[0] > 0) {
      console.log(`[Scheduler] Đã tự động hủy ${pendingResult.rowsAffected[0]} booking quá hạn thanh toán (Chờ thanh toán > 5 phút).`);
    }

    // BR-02: Hủy tự động nếu khách trễ check-in quá 30 phút (Status = 2)
    const limitConfirmed = new Date(now.getTime() - 30 * 60 * 1000);

    // 1. Giải phóng các khoang máy (Machine) cho các booking bị hủy (Status = 2)
    await pool.request()
      .input('limitTime', sql.DateTime, limitConfirmed)
      .query(`
        UPDATE MACHINE 
        SET Status = 1 
        WHERE MachineID IN (
          SELECT bd.MachineID 
          FROM BOOKING b
          JOIN BOOKING_DETAIL bd ON b.BookingID = bd.BookingID
          WHERE b.Status = 2 AND b.BookingDate <= @limitTime
        )
      `);

    // 2. Chuyển đổi trạng thái các booking quá hạn sang Đã hủy (Status = 5)
    const confirmedResult = await pool.request()
      .input('limitTime', sql.DateTime, limitConfirmed)
      .query(`
        UPDATE BOOKING 
        SET Status = 5 
        WHERE Status = 2 AND BookingDate <= @limitTime
      `);

    if (confirmedResult.rowsAffected[0] > 0) {
      console.log(`[Scheduler] Đã tự động hủy ${confirmedResult.rowsAffected[0]} booking quá hạn check-in (Quá 30 phút).`);
    }
  } catch (err) {
    console.error("[Scheduler Error]:", err.message);
  }
}, 15000);

// Export router để server.js gọi
module.exports = {
  router,
  poolPromise,
  schedulerInterval
};
