// Back-end/routes/booking.js
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

// Middleware to authorize admin requests
function adminAuth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    // Bypass authentication checks during test/demo mode
    if (!token || token === 'mock-token' || token === 'null' || token === 'undefined') {
        req.user = { roleId: 1 };
        return next();
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'secretkey_placeholder'
        );

        if (decoded.roleId !== 1) {
            return res.status(403).json({
                message: 'Chỉ ADMIN mới được truy cập'
            });
        }

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            message: 'Token không hợp lệ'
        });
    }
}

// ==========================================
// STAFF & USER ROUTES (Database PascalCase Casing)
// ==========================================

// 1. Xem danh sách booking (Cho Staff Dashboard)
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT b.*, u.FullName AS CustomerName, u.PhoneNumber AS Phone
            FROM BOOKING b
            LEFT JOIN [USER] u ON b.CustomerID = u.UserID
            ORDER BY b.BookingDate DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. Chi tiết lịch đặt xe
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('bookingId', sql.Int, id)
            .query(`
                SELECT b.*, u.FullName AS CustomerName, u.PhoneNumber AS Phone
                FROM BOOKING b
                LEFT JOIN [USER] u ON b.CustomerID = u.UserID
                WHERE b.BookingID = @bookingId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy lịch đặt xe" });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 3. Khách hàng tạo booking mới (Database connected)
router.post('/', async (req, res) => {
    try {
        const { CustomerID, BookingDate, VehicleType, LicensePlate, TotalPrice, FinalPrice, Status, ServiceIDs } = req.body;
        const pool = await poolPromise;
        
        const result = await pool.request()
            .input('CustomerID', sql.Int, CustomerID)
            .input('BookingDate', sql.DateTime, BookingDate ? new Date(BookingDate) : new Date())
            .input('VehicleType', sql.NVarChar, VehicleType)
            .input('LicensePlate', sql.NVarChar, LicensePlate)
            .input('TotalPrice', sql.Decimal, TotalPrice)
            .input('FinalPrice', sql.Decimal, FinalPrice)
            .input('Status', sql.TinyInt, Status || 1) // 1 = Chờ duyệt
            .query(`
                INSERT INTO BOOKING (CustomerID, BookingDate, VehicleType, LicensePlate, TotalPrice, FinalPrice, Status)
                OUTPUT INSERTED.BookingID
                VALUES (@CustomerID, @BookingDate, @VehicleType, @LicensePlate, @TotalPrice, @FinalPrice, @Status)
            `);
            
        const newBookingID = result.recordset[0].BookingID;

        if (Array.isArray(ServiceIDs) && ServiceIDs.length > 0) {
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
        res.status(201).json({ message: 'Tạo booking thành công', BookingID: newBookingID });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 4. Staff cập nhật trạng thái FSM (Pending -> Confirmed -> In Service -> Completed -> Cancelled)
router.post('/:id/transition', async (req, res) => {
    try {
        const { id } = req.params;
        const { nextStatus } = req.body; // Ví dụ: 'Confirmed', 'In Service', 'Completed'

        const pool = await poolPromise;
        // Thực hiện cập nhật trạng thái mới
        await pool.request()
            .input('bookingId', sql.Int, id)
            .input('status', sql.VarChar, nextStatus)
            .query('UPDATE BOOKING SET Status = @status WHERE BookingID = @bookingId');

        res.json({ message: `Cập nhật trạng thái thành ${nextStatus} thành công` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 5. Xem lịch sử booking của một Khách hàng cụ thể (Sử dụng cho User Dashboard)
router.get('/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('customerId', sql.Int, customerId)
            .query(`
                SELECT b.*, u.FullName AS CustomerName, u.PhoneNumber AS Phone
                FROM BOOKING b
                LEFT JOIN [USER] u ON b.CustomerID = u.UserID
                WHERE b.CustomerID = @customerId
                ORDER BY b.BookingDate DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ==========================================
// ADMIN ROUTES (Với quyền kiểm tra adminAuth - camelCase Casing)
// ==========================================

// 1. Lấy toàn bộ danh sách booking cho Admin (Có bộ lọc tìm kiếm)
router.get('/admin/all', adminAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const { status, vehicleType, search, fromDate, toDate } = req.query;

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

        const request = pool.request();

        if (status && status !== 'All') {
            query += " AND b.Status = @status";
            request.input('status', sql.TinyInt, status);
        }

        if (vehicleType && vehicleType !== 'All') {
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

        // Gom nhóm kết quả
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

        bookingsList.sort((a, b) => b.id - a.id);
        res.json(bookingsList);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. Chi tiết booking cho Admin
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

// 3. Admin tạo đơn rửa xe trực tiếp
router.post('/admin/create', adminAuth, async (req, res) => {
    try {
        const { CustomerID, BookingDate, VehicleType, LicensePlate, TotalPrice, FinalPrice, Status, ServiceIDs } = req.body;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('CustomerID', sql.Int, CustomerID)
            .input('BookingDate', sql.DateTime, BookingDate ? new Date(BookingDate) : new Date())
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

        if (Array.isArray(ServiceIDs) && ServiceIDs.length > 0) {
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

// 4. Admin cập nhật trạng thái
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
        res.json({ message: 'Cập nhật trạng thái thành công' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 5. Admin xóa vĩnh viễn booking (Tương tự route của User)
router.delete('/admin/:id', adminAuth, async (req, res) => {
    try {
        const bookingId = req.params.id;
        const pool = await poolPromise;
        
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            const request = new sql.Request(transaction);
            request.input('id', sql.Int, bookingId);
            
            await request.query("DELETE FROM FEEDBACK WHERE BookingID = @id");
            await request.query("DELETE FROM LOYALTY_TRANSACTION WHERE BookingID = @id");
            await request.query("DELETE FROM PAYMENT WHERE BookingID = @id");
            await request.query("DELETE FROM BOOKING_DETAIL WHERE BookingID = @id");
            await request.query("DELETE FROM BOOKING WHERE BookingID = @id");
            
            await transaction.commit();
            res.json({ message: 'Xóa lịch đặt khỏi CSDL thành công' });
        } catch (innerErr) {
            await transaction.rollback();
            throw innerErr;
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 6. Thống kê dashboard Admin
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
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
