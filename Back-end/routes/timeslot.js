const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

// DB hiện tại không có cột Duration trong SERVICE, nên duration xử lý ở API/UI.
const TIME_SLOTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','12:30','13:00','13:30',
  '14:00','14:30','15:00','15:30','16:00','16:30','17:00'
];
const DEFAULT_DURATION = 30;
const VALID_DURATIONS = [30, 60, 90];
const MACHINE_STATUS = { 1: 'Available', 2: 'Operating', 3: 'Maintenance' };
const BOOKING_STATUS = { 1: 'Created', 2: 'Checked-In', 3: 'In Progress', 4: 'Completed', 5: 'Cancelled' };

function normalizeDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return null;
  return date;
}

function normalizeTime(time) {
  const value = String(time || '').slice(0, 5);
  return TIME_SLOTS.includes(value) ? value : null;
}

function normalizeDuration(duration) {
  const value = Number(duration || DEFAULT_DURATION);
  return VALID_DURATIONS.includes(value) ? value : DEFAULT_DURATION;
}

function toSqlDateTime(date, time) {
  return new Date(`${date}T${time}:00`);
}

function isPastSlot(date, time, now = new Date()) {
  const slotDateTime = toSqlDateTime(date, time);
  return Number.isNaN(slotDateTime.getTime()) || slotDateTime <= now;
}

function normalizeLicensePlate(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function isValidVietnamLicensePlate(value) {
  // Hỗ trợ: 59A-123.45, 59A-12345, 59G1-123.45, 59G1-12345
  return /^\d{2}[A-Z][A-Z0-9]?-(?:\d{3}\.\d{2}|\d{5})$/.test(value);
}

function timeFromDate(value) {
  const d = new Date(value);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function getOccupiedSlots(startTime, durationMinutes = DEFAULT_DURATION) {
  const [h, m] = startTime.split(':').map(Number);
  const startMins = h * 60 + m;
  const endMins = startMins + normalizeDuration(durationMinutes);
  return TIME_SLOTS.filter(slot => {
    const [sh, sm] = slot.split(':').map(Number);
    const slotMins = sh * 60 + sm;
    return slotMins >= startMins && slotMins < endMins;
  });
}

function hasOverlap(existingStart, existingDuration, requestStart, requestDuration) {
  const [eh, em] = existingStart.split(':').map(Number);
  const [rh, rm] = requestStart.split(':').map(Number);
  const eStart = eh * 60 + em;
  const eEnd = eStart + normalizeDuration(existingDuration);
  const rStart = rh * 60 + rm;
  const rEnd = rStart + normalizeDuration(requestDuration);
  return rStart < eEnd && rEnd > eStart;
}

async function fetchBookingsByMachineDate(pool, machineId, date) {
  return pool.request()
    .input('machineId', sql.Int, Number(machineId))
    .input('date', sql.Date, date)
    .query(`
      SELECT
        b.BookingID,
        b.BookingDate,
        b.VehicleType,
        b.LicensePlate,
        b.Status,
        u.FullName AS CustomerName,
        u.PhoneNumber AS CustomerPhone,
        s.ServiceID,
        s.ServiceName,
        bd.MachineID,
        bd.PriceAtBooking
      FROM BOOKING b
      INNER JOIN [USER] u ON b.CustomerID = u.UserID
      LEFT JOIN BOOKING_DETAIL bd ON b.BookingID = bd.BookingID
      LEFT JOIN SERVICE s ON bd.ServiceID = s.ServiceID
      INNER JOIN MACHINE m ON m.MachineID = @machineId
      WHERE CAST(b.BookingDate AS DATE) = @date
        AND b.Status <> 5
        AND (
          bd.MachineID = @machineId
          OR (
            bd.MachineID IS NULL
            AND (
              (
                m.MachineType = 'CAR_WASHER'
                AND (
                  UPPER(b.VehicleType) = 'CAR'
                  OR b.VehicleType = N'Ô tô'
                  OR b.VehicleType = N'O tô'
                  OR b.VehicleType = N'Ô TÔ'
                )
              )
              OR
              (
                m.MachineType = 'BIKE_WASHER'
                AND (
                  UPPER(b.VehicleType) = 'BIKE'
                  OR b.VehicleType = N'Xe máy'
                  OR b.VehicleType = N'XE MÁY'
                )
              )
            )
          )
        )
      ORDER BY b.BookingDate ASC
    `);
}

async function checkSlotAvailable(pool, machineId, date, time, duration) {
  const result = await fetchBookingsByMachineDate(pool, machineId, date);
  for (const row of result.recordset) {
    const rowTime = timeFromDate(row.BookingDate);
    if (hasOverlap(rowTime, DEFAULT_DURATION, time, duration)) {
      return {
        available: false,
        conflictSlot: rowTime,
        bookingId: row.BookingID,
        customerName: row.CustomerName
      };
    }
  }
  return { available: true };
}

// GET /api/timeslots/machines?type=CAR|BIKE
router.get('/machines', async (req, res) => {
  try {
    const pool = await poolPromise;
    const type = String(req.query.type || 'ALL').toUpperCase();
    const request = pool.request();
    let where = `
      WHERE MachineID BETWEEN 1 AND 8
    `;

    if (type === 'CAR') {
      where = `
        WHERE MachineType = 'CAR_WASHER'
          AND MachineID BETWEEN 1 AND 4
      `;
    }

    if (type === 'BIKE') {
      where = `
        WHERE MachineType = 'BIKE_WASHER'
          AND MachineID BETWEEN 5 AND 8
      `;
    }

    const result = await request.query(`
      SELECT MachineID, MachineName, MachineType, Status
      FROM MACHINE
      ${where}
      ORDER BY MachineID ASC
    `);

    res.json(result.recordset.map(m => ({
      id: String(m.MachineID),
      machineId: m.MachineID,
      name: m.MachineName,
      type: m.MachineType === 'BIKE_WASHER' ? 'BIKE' : 'CAR',
      machineType: m.MachineType,
      status: MACHINE_STATUS[m.Status] || 'Available',
      statusCode: m.Status
    })));
  } catch (err) {
    console.error('GET /api/timeslots/machines error:', err);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách máy' });
  }
});

// GET /api/timeslots/services?vehicleType=CAR|BIKE
router.get('/services', async (req, res) => {
  try {
    const vehicleType = String(req.query.vehicleType || 'CAR').toUpperCase();
    if (!['CAR', 'BIKE'].includes(vehicleType)) {
      return res.status(400).json({ message: 'vehicleType chỉ nhận CAR hoặc BIKE' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('vehicleType', sql.NVarChar(100), vehicleType)
      .query(`
        SELECT ServiceID, ServiceName, BasePrice, ApplicableVehicleType
        FROM SERVICE
        WHERE ApplicableVehicleType = @vehicleType
        ORDER BY BasePrice ASC, ServiceID ASC
      `);

    res.json(result.recordset.map(s => ({
      serviceId: s.ServiceID,
      serviceName: s.ServiceName,
      basePrice: Number(s.BasePrice),
      vehicleType: s.ApplicableVehicleType
    })));
  } catch (err) {
    console.error('GET /api/timeslots/services error:', err);
    res.status(500).json({ message: 'Lỗi khi lấy dịch vụ' });
  }
});

// GET /api/timeslots?machineId=1&date=2026-06-01
router.get('/', async (req, res) => {
  const machineId = Number(req.query.machineId);
  const date = normalizeDate(req.query.date);
  if (!machineId || !date) return res.status(400).json({ message: 'Thiếu machineId hoặc date' });

  try {
    const pool = await poolPromise;
    const result = await fetchBookingsByMachineDate(pool, machineId, date);
    const occupiedMap = {};

    for (const row of result.recordset) {
      const startTime = timeFromDate(row.BookingDate);
      for (const slot of getOccupiedSlots(startTime, DEFAULT_DURATION)) {
        occupiedMap[slot] = {
          bookingId: `BK-${row.BookingID}`,
          rawBookingId: row.BookingID,
          customerName: row.CustomerName,
          customerPhone: row.CustomerPhone,
          vehicleType: row.VehicleType,
          licensePlate: row.LicensePlate,
          serviceId: row.ServiceID,
          serviceName: row.ServiceName,
          duration: DEFAULT_DURATION,
          price: Number(row.PriceAtBooking || 0),
          bookingStatus: BOOKING_STATUS[row.Status] || 'Created'
        };
      }
    }

    res.json({
      machineId: String(machineId),
      date,
      duration: DEFAULT_DURATION,
      slots: TIME_SLOTS.map(time => {
        const booking = occupiedMap[time] || null;
        if (isPastSlot(date, time)) {
          return { time, status: 'past', booking };
        }
        return booking
          ? { time, status: 'booked', booking }
          : { time, status: 'free', booking: null };
      })
    });
  } catch (err) {
    console.error('GET /api/timeslots error:', err);
    res.status(500).json({ message: 'Lỗi khi lấy timeslot' });
  }
});

// POST /api/timeslots/check
router.post('/check', async (req, res) => {
  const machineId = Number(req.body.machineId);
  const date = normalizeDate(req.body.date);
  const time = normalizeTime(req.body.time);
  const duration = normalizeDuration(req.body.duration);
  if (!machineId || !date || !time) return res.status(400).json({ message: 'Thiếu machineId, date hoặc time' });

  try {
    if (isPastSlot(date, time)) {
      return res.json({ available: false, reason: 'Khung giờ đã qua' });
    }

    const pool = await poolPromise;
    const machine = await pool.request()
      .input('machineId', sql.Int, machineId)
      .query('SELECT MachineID, Status FROM MACHINE WHERE MachineID = @machineId');
    if (!machine.recordset.length) return res.status(404).json({ message: 'Không tìm thấy máy' });
    if (machine.recordset[0].Status === 3) return res.json({ available: false, reason: 'Máy đang bảo trì' });

    const result = await checkSlotAvailable(pool, machineId, date, time, duration);
    res.json(result);
  } catch (err) {
    console.error('POST /api/timeslots/check error:', err);
    res.status(500).json({ message: 'Lỗi khi kiểm tra timeslot' });
  }
});

// GET /api/timeslots/overview?date=2026-06-01&type=CAR|BIKE
router.get('/overview', async (req, res) => {
  const date = normalizeDate(req.query.date);
  const type = String(req.query.type || 'ALL').toUpperCase();
  if (!date) return res.status(400).json({ message: 'Thiếu date' });

  try {
    const pool = await poolPromise;

    let machineWhere = `
      WHERE MachineID BETWEEN 1 AND 8
    `;
    if (type === 'CAR') {
      machineWhere = `
        WHERE MachineType = 'CAR_WASHER'
          AND MachineID BETWEEN 1 AND 4
      `;
    }

    if (type === 'BIKE') {
      machineWhere = `
        WHERE MachineType = 'BIKE_WASHER'
          AND MachineID BETWEEN 5 AND 8
      `;
    }

    const machines = await pool.request().query(`
      SELECT MachineID, MachineName, MachineType, Status
      FROM MACHINE
      ${machineWhere}
      ORDER BY MachineID ASC
    `);

    const overview = [];

    for (const m of machines.recordset) {
      const result = await fetchBookingsByMachineDate(pool, m.MachineID, date);
      const occupiedSlots = new Set();

      for (const row of result.recordset) {
        const startTime = timeFromDate(row.BookingDate);
        getOccupiedSlots(startTime, DEFAULT_DURATION).forEach(slot => {
          occupiedSlots.add(slot);
        });
      }

      const bookedSlots = occupiedSlots.size;

      overview.push({
        id: String(m.MachineID),
        name: m.MachineName,
        type: m.MachineType === 'BIKE_WASHER' ? 'BIKE' : 'CAR',
        machineStatus: MACHINE_STATUS[m.Status] || 'Available',
        totalSlots: TIME_SLOTS.length,
        bookedSlots,
        freeSlots: TIME_SLOTS.length - bookedSlots,
        occupancyPct: Math.round((bookedSlots / TIME_SLOTS.length) * 100)
      });
    }

    res.json({ date, overview });
  } catch (err) {
    console.error('GET /api/timeslots/overview error:', err);
    res.status(500).json({ message: 'Lỗi khi lấy tổng quan timeslot' });
  }
});

// POST /api/timeslots/book
router.post('/book', async (req, res) => {
  const machineId = Number(req.body.machineId);
  const serviceId = Number(req.body.serviceId);
  const date = normalizeDate(req.body.date);
  const time = normalizeTime(req.body.time);
  const duration = normalizeDuration(req.body.duration);
  const customerName = String(req.body.customerName || '').trim();
  const customerPhone = String(req.body.customerPhone || '').trim();
  const vehicleType = String(req.body.vehicleType || '').toUpperCase();
  const licensePlate = normalizeLicensePlate(req.body.licensePlate);

  if (!machineId || !serviceId || !date || !time || !customerName || !customerPhone || !vehicleType || !licensePlate) {
    return res.status(400).json({ message: 'Thiếu thông tin đặt lịch' });
  }
  if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(customerPhone)) {
    return res.status(400).json({ message: 'Số điện thoại không hợp lệ! Vui lòng nhập số điện thoại Việt Nam (10 chữ số).' });
  }
  if (!['CAR', 'BIKE'].includes(vehicleType)) {
    return res.status(400).json({ message: 'vehicleType chỉ nhận CAR hoặc BIKE' });
  }
  if (!isValidVietnamLicensePlate(licensePlate)) {
    return res.status(400).json({
      message: 'Biển số xe không hợp lệ. Ví dụ đúng: 59A-123.45 hoặc 59G1-123.45'
    });
  }
  if (isPastSlot(date, time)) {
    return res.status(400).json({ message: 'Không thể đặt lịch vào khung giờ đã qua' });
  }

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  let transactionStarted = false;

  try {
    const available = await checkSlotAvailable(pool, machineId, date, time, duration);
    if (!available.available) return res.status(409).json({ message: 'Timeslot đã bị đặt', ...available });

    await transaction.begin();
    transactionStarted = true;
    const request = transaction.request();

    const master = await request
      .input('machineId', sql.Int, machineId)
      .input('serviceId', sql.Int, serviceId)
      .input('vehicleType', sql.NVarChar(100), vehicleType)
      .query(`
        SELECT
          m.MachineID, m.MachineName, m.MachineType, m.Status,
          s.ServiceID, s.ServiceName, s.BasePrice, s.ApplicableVehicleType
        FROM MACHINE m
        CROSS JOIN SERVICE s
        WHERE m.MachineID = @machineId
          AND s.ServiceID = @serviceId
          AND s.ApplicableVehicleType = @vehicleType
      `);

    if (!master.recordset.length) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Máy hoặc dịch vụ không hợp lệ với loại xe' });
    }

    const info = master.recordset[0];
    if (info.Status === 3) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Máy đang bảo trì, không thể đặt lịch' });
    }
    if (vehicleType === 'CAR' && info.MachineType !== 'CAR_WASHER') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Máy không phù hợp với ô tô' });
    }
    if (vehicleType === 'BIKE' && info.MachineType !== 'BIKE_WASHER') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Máy không phù hợp với xe máy' });
    }

    const userResult = await transaction.request()
      .input('customerName', sql.NVarChar(255), customerName)
      .input('customerPhone', sql.NVarChar(20), customerPhone)
      .query(`
        DECLARE @UserID INT;
        SELECT @UserID = UserID FROM [USER] WHERE PhoneNumber = @customerPhone;

        IF @UserID IS NULL
        BEGIN
          DECLARE @DummyEmail VARCHAR(255);
          SET @DummyEmail = @customerPhone + '@guest.local';

          INSERT INTO [USER] (FullName, Email, PhoneNumber, Password, RoleID)
          VALUES (@customerName, @DummyEmail, @customerPhone, NULL, 4);
          SET @UserID = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
          UPDATE [USER]
          SET FullName = @customerName
          WHERE UserID = @UserID;
        END

        SELECT @UserID AS UserID;
      `);

    const customerId = userResult.recordset[0].UserID;

    // Task 12: Anti-spam check (Maximum 2 pending bookings)
    const pendingCheck = await transaction.request()
      .input('customerId', sql.Int, customerId)
      .query('SELECT COUNT(*) AS PendingCount FROM BOOKING WHERE CustomerID = @customerId AND Status IN (1, 2)');
    const pendingCount = pendingCheck.recordset[0].PendingCount;
    if (pendingCount >= 2) {
      await transaction.rollback();
      return res.status(400).json({ 
        message: 'Khách hàng này đã có 2 lịch đặt xe đang chờ xử lý. Vui lòng hoàn tất hoặc hủy lịch cũ trước khi đặt lịch mới!' 
      });
    }

    // Task 12: Clash check (cannot book another wash in the exact same timeslot)
    const scheduledDT = toSqlDateTime(date, time);
    const clashCheck = await transaction.request()
      .input('customerId', sql.Int, customerId)
      .input('bookingDate', sql.DateTime, scheduledDT)
      .query('SELECT BookingID FROM BOOKING WHERE CustomerID = @customerId AND BookingDate = @bookingDate AND Status <> 5');
    if (clashCheck.recordset.length > 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Khách hàng này đã có một lịch hẹn khác vào khung giờ này!' });
    }

    const price = Number(info.BasePrice);

    const bookingResult = await transaction.request()
      .input('customerId', sql.Int, customerId)
      .input('bookingDate', sql.DateTime, scheduledDT)
      .input('vehicleType', sql.NVarChar(100), vehicleType)
      .input('licensePlate', sql.NVarChar(20), licensePlate)
      .input('totalPrice', sql.Decimal(12, 2), price)
      .input('finalPrice', sql.Decimal(12, 2), price)
      .query(`
        INSERT INTO BOOKING (CustomerID, MemberPromoID, BookingDate, CheckInTime, VehicleType, LicensePlate, TotalPrice, FinalPrice, Status)
        OUTPUT INSERTED.BookingID
        VALUES (@customerId, NULL, @bookingDate, NULL, @vehicleType, @licensePlate, @totalPrice, @finalPrice, 2)
      `);

    const bookingId = bookingResult.recordset[0].BookingID;

    await transaction.request()
      .input('bookingId', sql.Int, bookingId)
      .input('serviceId', sql.Int, serviceId)
      .input('machineId', sql.Int, machineId)
      .input('price', sql.Decimal(12, 2), price)
      .query(`
        INSERT INTO BOOKING_DETAIL (BookingID, ServiceID, MachineID, PriceAtBooking)
        VALUES (@bookingId, @serviceId, @machineId, @price)
      `);

    await transaction.commit();
    transactionStarted = false;

    res.status(201).json({
      id: `BK-${bookingId}`,
      bookingId,
      customerName,
      customerPhone,
      vehicleType,
      licensePlate,
      serviceId,
      servicePackage: info.ServiceName,
      serviceName: info.ServiceName,
      price,
      scheduledTime: `${date}T${time}:00`,
      machineId: String(machineId),
      machineName: info.MachineName,
      status: 'Created'
    });
  } catch (err) {
    if (transactionStarted) {
      try { await transaction.rollback(); } catch (_) {}
    }
    console.error('POST /api/timeslots/book error:', err);
    res.status(500).json({ message: 'Lỗi khi tạo booking timeslot' });
  }
});

module.exports = router;
