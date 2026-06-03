// Back-end/routes/booking.js
// NHIỆM VỤ CỦA TRỌNG & HUY (Task 6, 7) VÀ THẮNG (Task 5)
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('../db');

// Helper to format date and time safely preserving local timezone offsets
const formatLocalDateTime = (dateInput) => {
    if (!dateInput) return { dateStr: '', timeStr: '' };
    const d = new Date(dateInput);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return {
        dateStr: `${year}-${month}-${date}`,
        timeStr: `${hours}:${minutes}`
    };
};

// THẮNG (Task 5): Tạo lịch đặt xe mới
router.post('/', async (req, res) => {
    try {
        const { CustomerID, BookingDate, VehicleType, LicensePlate, TotalPrice, FinalPrice, Status, ServiceIDs } = req.body;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('CustomerID', sql.Int, CustomerID)
            .input('BookingDate', sql.DateTime, BookingDate || new Date())
            .input('VehicleType', sql.NVarChar, VehicleType)
            .input('LicensePlate', sql.NVarChar, LicensePlate)
            .input('TotalPrice', sql.Decimal, TotalPrice)
            .input('FinalPrice', sql.Decimal, FinalPrice)
            .input('Status', sql.TinyInt, Status || 1)
            .query(`
                INSERT INTO BOOKING (CustomerID, BookingDate, VehicleType, LicensePlate, TotalPrice, FinalPrice, Status)
                OUTPUT INSERTED.BookingID
                VALUES (@CustomerID, @BookingDate, @VehicleType, @LicensePlate, @TotalPrice, @FinalPrice, @Status)
            `);
        const newBookingID = result.recordset[0].BookingID;

        // Chèn các dịch vụ chi tiết vào bảng BOOKING_DETAIL
        if (Array.isArray(ServiceIDs)) {
            for (const serviceID of ServiceIDs) {
                await pool.request()
                    .input('BookingID', sql.Int, newBookingID)
                    .input('ServiceID', sql.Int, serviceID)
                    .query(`
                        INSERT INTO BOOKING_DETAIL (BookingID, ServiceID)
                        VALUES (@BookingID, @ServiceID)
                    `);
            }
        }

        res.status(201).json({ message: "Tạo booking thành công", BookingID: newBookingID });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// TRỌNG & HUY (Task 6): Chuyển đổi trạng thái FSM (Pending -> Confirmed -> In Service -> Completed -> Cancelled)
router.post('/:id/transition', async (req, res) => {
    try {
        const { status } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('status', sql.TinyInt, status)
            .query(`
                UPDATE BOOKING 
                SET Status = @status, CheckInTime = CASE WHEN @status = 3 THEN GETDATE() ELSE CheckInTime END
                WHERE BookingID = @id
            `);
        res.json({ message: "Chuyển trạng thái thành công" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// TRỌNG (Task 7): Xem lịch sử booking
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const customerId = req.query.customerId;
        let query = `
            SELECT b.*, u.FullName AS CustomerName 
            FROM BOOKING b
            INNER JOIN [USER] u ON b.CustomerID = u.UserID
        `;
        const request = pool.request();
        if (customerId) {
            query += " WHERE b.CustomerID = @customerId";
            request.input('customerId', sql.Int, customerId);
        }
        query += " ORDER BY b.BookingID DESC";
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// TRỌNG (Task 7): Chi tiết lịch đặt xe
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT 
                    b.*, 
                    u.FullName AS CustomerName,
                    u.PhoneNumber AS CustomerPhone,
                    s.ServiceName,
                    s.BasePrice
                FROM BOOKING b
                INNER JOIN [USER] u ON b.CustomerID = u.UserID
                LEFT JOIN BOOKING_DETAIL bd ON b.BookingID = bd.BookingID
                LEFT JOIN SERVICE s ON bd.ServiceID = s.ServiceID
                WHERE b.BookingID = @id
            `);
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy booking" });
        }
        
        const first = result.recordset[0];
        const services = result.recordset.map(r => r.ServiceName).filter(Boolean);
        const format = formatLocalDateTime(first.BookingDate);
        
        const booking = {
            id: first.BookingID,
            customerId: first.CustomerID,
            customerName: first.CustomerName,
            phone: first.CustomerPhone,
            vehicleType: first.VehicleType,
            licensePlate: first.LicensePlate,
            price: Number(first.FinalPrice || first.TotalPrice || 0),
            status: first.Status,
            date: format.dateStr,
            time: format.timeStr,
            servicePackage: services.join(', ') || 'N/A'
        };
        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// HUY ------------------ Booking for Admin ---------------

// Middleware kiểm tra ADMIN (Đã tạm thời bỏ qua kiểm tra đăng nhập để test trực tiếp dữ liệu thật)
function adminAuth(req, res, next) {
    req.user = { roleId: 1 };
    next();
}

// ===============================
// ADMIN - Lấy toàn bộ booking (Có bộ lọc)
// ===============================
router.get('/admin/all', adminAuth, async (req, res) => {
    try {
        const status = req.query.status;
        const vehicleType = req.query.vehicleType;
        const search = req.query.search;
        const fromDate = req.query.fromDate;
        const toDate = req.query.toDate;

        const pool = await poolPromise;
        const request = pool.request();
        
        let query = `
            SELECT 
                b.BookingID,
                b.CustomerID,
                b.BookingDate,
                b.CheckInTime,
                b.VehicleType,
                b.LicensePlate,
                b.TotalPrice,
                b.FinalPrice,
                b.Status,
                u.FullName AS CustomerName,
                u.PhoneNumber AS CustomerPhone,
                s.ServiceName
            FROM BOOKING b
            INNER JOIN [USER] u ON b.CustomerID = u.UserID
            LEFT JOIN BOOKING_DETAIL bd ON b.BookingID = bd.BookingID
            LEFT JOIN SERVICE s ON bd.ServiceID = s.ServiceID
            WHERE 1=1
        `;

        if (status && status !== "All") {
            query += " AND b.Status = @status";
            request.input('status', sql.TinyInt, Number(status));
        }

        if (vehicleType) {
            query += " AND b.VehicleType = @vehicleType";
            request.input('vehicleType', sql.NVarChar, vehicleType);
        }

        if (search) {
            query += " AND (u.FullName LIKE @search OR b.LicensePlate LIKE @search OR u.PhoneNumber LIKE @search)";
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        if (fromDate) {
            query += " AND b.BookingDate >= @fromDate";
            request.input('fromDate', sql.DateTime, fromDate);
        }

        if (toDate) {
            query += " AND b.BookingDate <= @toDate";
            request.input('toDate', sql.DateTime, toDate);
        }

        const result = await request.query(query);

        // Gom nhóm kết quả trùng lặp do nhiều dịch vụ trên một lịch đặt
        const bookingsMap = {};
        for (const row of result.recordset) {
            if (!bookingsMap[row.BookingID]) {
                const format = formatLocalDateTime(row.BookingDate);
                bookingsMap[row.BookingID] = {
                    id: row.BookingID,
                    customerName: row.CustomerName,
                    phone: row.CustomerPhone,
                    vehicleType: row.VehicleType,
                    licensePlate: row.LicensePlate,
                    price: Number(row.FinalPrice || row.TotalPrice || 0),
                    status: row.Status,
                    date: format.dateStr,
                    time: format.timeStr,
                    servicesList: []
                };
            }
            if (row.ServiceName) {
                bookingsMap[row.BookingID].servicesList.push(row.ServiceName);
            }
        }

        const bookingsList = Object.values(bookingsMap).map(b => {
            b.servicePackage = b.servicesList.join(', ') || 'N/A';
            delete b.servicesList;
            return b;
        });

        // Sắp xếp ID giảm dần (mới nhất lên trước)
        bookingsList.sort((x, y) => y.id - x.id);

        res.json(bookingsList);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ===============================
// ADMIN - Chi tiết booking
// ===============================
router.get('/admin/:id', adminAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT 
                    b.*, 
                    u.FullName AS CustomerName,
                    u.PhoneNumber AS CustomerPhone,
                    s.ServiceName,
                    s.BasePrice
                FROM BOOKING b
                INNER JOIN [USER] u ON b.CustomerID = u.UserID
                LEFT JOIN BOOKING_DETAIL bd ON b.BookingID = bd.BookingID
                LEFT JOIN SERVICE s ON bd.ServiceID = s.ServiceID
                WHERE b.BookingID = @id
            `);
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy booking' });
        }
        
        const first = result.recordset[0];
        const services = result.recordset.map(r => r.ServiceName).filter(Boolean);
        const format = formatLocalDateTime(first.BookingDate);
        
        const booking = {
            id: first.BookingID,
            customerName: first.CustomerName,
            phone: first.CustomerPhone,
            vehicleType: first.VehicleType,
            licensePlate: first.LicensePlate,
            price: Number(first.FinalPrice || first.TotalPrice || 0),
            status: first.Status,
            date: format.dateStr,
            time: format.timeStr,
            servicePackage: services.join(', ') || 'N/A'
        };
        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ===============================
// ADMIN - Tạo booking mới
// ===============================
router.post('/admin/create', adminAuth, async (req, res) => {
    try {
        const { CustomerID, BookingDate, VehicleType, LicensePlate, TotalPrice, FinalPrice, Status, ServiceIDs } = req.body;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('CustomerID', sql.Int, CustomerID)
            .input('BookingDate', sql.DateTime, BookingDate || new Date())
            .input('VehicleType', sql.NVarChar, VehicleType)
            .input('LicensePlate', sql.NVarChar, LicensePlate)
            .input('TotalPrice', sql.Decimal, TotalPrice)
            .input('FinalPrice', sql.Decimal, FinalPrice)
            .input('Status', sql.TinyInt, Status || 1)
            .query(`
                INSERT INTO BOOKING (CustomerID, BookingDate, VehicleType, LicensePlate, TotalPrice, FinalPrice, Status)
                OUTPUT INSERTED.BookingID
                VALUES (@CustomerID, @BookingDate, @VehicleType, @LicensePlate, @TotalPrice, @FinalPrice, @Status)
            `);
        const newBookingID = result.recordset[0].BookingID;

        if (Array.isArray(ServiceIDs)) {
            for (const serviceID of ServiceIDs) {
                await pool.request()
                    .input('BookingID', sql.Int, newBookingID)
                    .input('ServiceID', sql.Int, serviceID)
                    .query(`
                        INSERT INTO BOOKING_DETAIL (BookingID, ServiceID)
                        VALUES (@BookingID, @ServiceID)
                    `);
            }
        }
        res.status(201).json({ message: 'Tạo booking thành công', id: newBookingID });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ===============================
// ADMIN - Cập nhật trạng thái
// ===============================
router.put('/admin/:id/status', adminAuth, async (req, res) => {
    try {
        const { status } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('status', sql.TinyInt, status)
            .query(`
                UPDATE BOOKING 
                SET Status = @status, CheckInTime = CASE WHEN @status = 3 THEN GETDATE() ELSE CheckInTime END
                WHERE BookingID = @id
            `);

        res.json({
            message: 'Cập nhật trạng thái thành công'
        });
    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
});

// ===============================
// ADMIN - Xóa vĩnh viễn booking khỏi CSDL (Có kèm xóa các bảng quan hệ)
// ===============================
router.delete('/admin/:id', adminAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        
        await transaction.begin();
        try {
            const request = new sql.Request(transaction);
            request.input('id', sql.Int, req.params.id);
            
            // Xóa các dòng liên quan trước để thỏa mãn ràng buộc khóa ngoại (Foreign Key)
            await request.query("DELETE FROM FEEDBACK WHERE BookingID = @id");
            await request.query("DELETE FROM LOYALTY_TRANSACTION WHERE BookingID = @id");
            await request.query("DELETE FROM PAYMENT WHERE BookingID = @id");
            await request.query("DELETE FROM BOOKING_DETAIL WHERE BookingID = @id");
            
            // Cuối cùng xóa bản ghi Booking chính
            await request.query("DELETE FROM BOOKING WHERE BookingID = @id");
            
            await transaction.commit();
            res.json({ message: 'Xóa lịch đặt khỏi CSDL thành công' });
        } catch (innerErr) {
            await transaction.rollback();
            throw innerErr;
        }
    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
});

// ===============================
// ADMIN - Thống kê dashboard
// ===============================
router.get('/admin/dashboard/stats', adminAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN Status = 3 THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN Status = 4 THEN 1 ELSE 0 END) AS completed,
                COALESCE(SUM(CASE WHEN Status = 4 THEN COALESCE(FinalPrice, TotalPrice, 0) ELSE 0 END), 0) AS revenue
            FROM BOOKING
        `);
        
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
});

module.exports = router;
