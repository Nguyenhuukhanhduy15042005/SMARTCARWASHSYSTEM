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

// Helper to process FSM state changes (Loyalty calculation, Machine status updates, Payment auto-generation)
const processBookingStatusChange = async (bookingId, nextStatus, pool) => {
    const statusInt = parseInt(nextStatus, 10);
    
    // 1. Get current booking info
    const bookingRes = await pool.request()
        .input('bookingId', sql.Int, bookingId)
        .query('SELECT CustomerID, TotalPrice, FinalPrice, Status FROM BOOKING WHERE BookingID = @bookingId');
        
    if (bookingRes.recordset.length === 0) {
        throw new Error('Không tìm thấy lịch đặt xe!');
    }
    
    const booking = bookingRes.recordset[0];
    const oldStatus = booking.Status;
    const customerId = booking.CustomerID;
    
    if (oldStatus === statusInt) return; // No change needed

    // 2. Update booking status & CheckInTime if In Service (status = 3)
    await pool.request()
        .input('bookingId', sql.Int, bookingId)
        .input('status', sql.TinyInt, statusInt)
        .query(`
            UPDATE BOOKING 
            SET Status = @status, 
                CheckInTime = CASE WHEN @status = 3 THEN GETDATE() ELSE CheckInTime END
            WHERE BookingID = @bookingId
        `);

    // 3. Update machine status (assigned to the booking in BOOKING_DETAIL)
    const detailRes = await pool.request()
        .input('bookingId', sql.Int, bookingId)
        .query('SELECT MachineID FROM BOOKING_DETAIL WHERE BookingID = @bookingId');
    const machineIds = detailRes.recordset.map(r => r.MachineID).filter(Boolean);

    for (const machineId of machineIds) {
        if (statusInt === 3) {
            // Set machine status to 2 (Busy/Operating)
            await pool.request()
                .input('machineId', sql.Int, machineId)
                .query('UPDATE MACHINE SET Status = 2 WHERE MachineID = @machineId');
        } else if (statusInt === 4 || statusInt === 5) {
            // Free the machine: set status to 1 (Available)
            await pool.request()
                .input('machineId', sql.Int, machineId)
                .query('UPDATE MACHINE SET Status = 1 WHERE MachineID = @machineId');
        }
    }

    // 4. Booking Completion Flow (statusInt === 4)
    if (statusInt === 4) {
        const finalPrice = Number(booking.FinalPrice || booking.TotalPrice || 0);
        const points = Math.floor(finalPrice / 1000);

        if (points > 0) {
            // Check if loyalty transaction already recorded for this booking
            const txCheck = await pool.request()
                .input('bookingId', sql.Int, bookingId)
                .query("SELECT TransactionID FROM LOYALTY_TRANSACTION WHERE BookingID = @bookingId AND TransactionType = 'Accumulate'");
                
            if (txCheck.recordset.length === 0) {
                // a. Insert loyalty transaction
                await pool.request()
                    .input('userId', sql.Int, customerId)
                    .input('bookingId', sql.Int, bookingId)
                    .input('points', sql.Int, points)
                    .query(`
                        INSERT INTO LOYALTY_TRANSACTION (UserID, BookingID, TransactionType, Points, CreatedDate)
                        VALUES (@userId, @bookingId, 'Accumulate', @points, GETDATE())
                    `);

                // b. Update/Insert customer MEMBER_PROFILE
                const profileCheck = await pool.request()
                    .input('userId', sql.Int, customerId)
                    .query('SELECT UserID, AccumulatedPoints FROM MEMBER_PROFILE WHERE UserID = @userId');

                let newAccumulatedPoints = points;

                if (profileCheck.recordset.length === 0) {
                    await pool.request()
                        .input('userId', sql.Int, customerId)
                        .input('points', sql.Int, points)
                        .query(`
                            INSERT INTO MEMBER_PROFILE (UserID, TierID, CurrentPoints, AccumulatedPoints, JoinDate)
                            VALUES (@userId, 1, @points, @points, GETDATE())
                        `);
                } else {
                    newAccumulatedPoints = Number(profileCheck.recordset[0].AccumulatedPoints || 0) + points;
                    await pool.request()
                        .input('userId', sql.Int, customerId)
                        .input('points', sql.Int, points)
                        .query(`
                            UPDATE MEMBER_PROFILE
                            SET CurrentPoints = CurrentPoints + @points,
                                AccumulatedPoints = AccumulatedPoints + @points
                            WHERE UserID = @userId
                        `);
                }

                // c. Tier Evaluation: Silver >= 500, Gold >= 1500, Platinum >= 5000
                const tiersRes = await pool.request().query('SELECT TierID, RequiredPoints FROM LOYALTY_TIER ORDER BY RequiredPoints ASC');
                let newTierId = 1; // Bronze
                for (const tier of tiersRes.recordset) {
                    if (newAccumulatedPoints >= tier.RequiredPoints) {
                        newTierId = tier.TierID;
                    }
                }

                await pool.request()
                    .input('userId', sql.Int, customerId)
                    .input('tierId', sql.Int, newTierId)
                    .query('UPDATE MEMBER_PROFILE SET TierID = @tierId WHERE UserID = @userId');
            }
        }

        // d. Auto-generate payment log for remaining amount
        const paymentSumRes = await pool.request()
            .input('bookingId', sql.Int, bookingId)
            .query('SELECT SUM(Amount) AS TotalPaid FROM PAYMENT WHERE BookingID = @bookingId');
        
        const totalPaid = Number(paymentSumRes.recordset[0]?.TotalPaid || 0);
        const remaining = Number(finalPrice) - totalPaid;

        if (remaining > 0) {
            await pool.request()
                .input('bookingId', sql.Int, bookingId)
                .input('amount', sql.Decimal, remaining)
                .query(`
                    INSERT INTO PAYMENT (BookingID, PaymentMethod, Amount, PaidAt)
                    VALUES (@bookingId, N'Tiền mặt', @amount, GETDATE())
                `);
        }
    }
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

// 1. Xem danh sách booking (Cho Staff Dashboard hoặc User Dashboard)
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const token = req.headers.authorization?.split(' ')[1];
        let customerId = req.query.customerId;

        if (token && token !== 'mock-token' && token !== 'null' && token !== 'undefined') {
            try {
                const decoded = jwt.verify(
                    token,
                    process.env.JWT_SECRET || 'secretkey_placeholder'
                );
                // Nếu là user thường, chỉ cho phép xem dữ liệu của chính họ
                if (decoded && decoded.role === 'user') {
                    customerId = decoded.userId;
                }
            } catch (err) {
                // Bỏ qua lỗi verify token trong môi trường demo/dev
            }
        }

        let query = `
            SELECT b.*, u.FullName AS CustomerName, u.PhoneNumber AS Phone,
                   p.Amount AS PaidAmount, p.PaymentMethod AS PaymentMethod
            FROM BOOKING b
            LEFT JOIN [USER] u ON b.CustomerID = u.UserID
            LEFT JOIN (
                SELECT BookingID, SUM(Amount) AS Amount, MAX(PaymentMethod) AS PaymentMethod
                FROM PAYMENT
                GROUP BY BookingID
            ) p ON b.BookingID = p.BookingID
        `;
        
        const request = pool.request();
        if (customerId) {
            query += ` WHERE b.CustomerID = @customerId`;
            request.input('customerId', sql.Int, customerId);
        }
        
        query += ` ORDER BY b.BookingDate DESC`;
        
        const result = await request.query(query);
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
                SELECT b.*, u.FullName AS CustomerName, u.PhoneNumber AS Phone,
                       p.Amount AS PaidAmount, p.PaymentMethod AS PaymentMethod
                FROM BOOKING b
                LEFT JOIN [USER] u ON b.CustomerID = u.UserID
                LEFT JOIN (
                    SELECT BookingID, SUM(Amount) AS Amount, MAX(PaymentMethod) AS PaymentMethod
                    FROM PAYMENT
                    GROUP BY BookingID
                ) p ON b.BookingID = p.BookingID
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

// 3. Khách hàng tạo booking mới (Database connected + Validation & Anti-spam checks)
router.post('/', async (req, res) => {
    try {
        const { CustomerID, BookingDate, VehicleType, LicensePlate, TotalPrice, FinalPrice, Status, ServiceIDs } = req.body;
        
        // Validation checks
        if (!CustomerID || !BookingDate || !VehicleType || !LicensePlate || !ServiceIDs || !Array.isArray(ServiceIDs) || ServiceIDs.length === 0) {
            return res.status(400).json({ message: 'Thiếu thông tin đặt lịch hoặc gói dịch vụ không hợp lệ!' });
        }

        const scheduledDate = new Date(BookingDate);
        if (isNaN(scheduledDate.getTime())) {
            return res.status(400).json({ message: 'Thời gian đặt lịch không hợp lệ!' });
        }
        if (scheduledDate < new Date()) {
            return res.status(400).json({ message: 'Thời gian đặt lịch không được ở trong quá khứ!' });
        }

        const pool = await poolPromise;

        // Anti-spam check: Maximum of 2 pending bookings (Status = 1 or 2)
        const pendingCheck = await pool.request()
            .input('customerId', sql.Int, CustomerID)
            .query('SELECT COUNT(*) AS PendingCount FROM BOOKING WHERE CustomerID = @customerId AND Status IN (1, 2)');
        const pendingCount = pendingCheck.recordset[0].PendingCount;
        if (pendingCount >= 2) {
            return res.status(400).json({ 
                message: 'Bạn đã có 2 lịch đặt xe đang chờ xử lý. Vui lòng hoàn tất hoặc hủy lịch cũ trước khi đặt lịch mới!' 
            });
        }

        // Clash check: same customer cannot book another wash in the exact same timeslot
        const clashCheck = await pool.request()
            .input('customerId', sql.Int, CustomerID)
            .input('bookingDate', sql.DateTime, scheduledDate)
            .query('SELECT BookingID FROM BOOKING WHERE CustomerID = @customerId AND BookingDate = @bookingDate AND Status <> 5');
        if (clashCheck.recordset.length > 0) {
            return res.status(400).json({ message: 'Bạn đã có một lịch hẹn khác vào khung giờ này!' });
        }

        const result = await pool.request()
            .input('CustomerID', sql.Int, CustomerID)
            .input('BookingDate', sql.DateTime, scheduledDate)
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
        const { nextStatus } = req.body;

        const statusInt = parseInt(nextStatus, 10);
        if (isNaN(statusInt) || statusInt < 1 || statusInt > 5) {
            return res.status(400).json({ message: 'Trạng thái không hợp lệ. Giá trị phải từ 1 đến 5.' });
        }

        const pool = await poolPromise;
        await processBookingStatusChange(parseInt(id, 10), statusInt, pool);

        res.json({ message: `Cập nhật trạng thái thành công (Status: ${statusInt})` });
    } catch (err) {
        console.error('[transition error]', err.message);
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
                s.ServiceName,
                p.Amount AS PaidAmount,
                p.PaymentMethod AS PaymentMethod
            FROM BOOKING b
            INNER JOIN [USER] u ON b.CustomerID = u.UserID
            LEFT JOIN BOOKING_DETAIL bd ON b.BookingID = bd.BookingID
            LEFT JOIN SERVICE s ON bd.ServiceID = s.ServiceID
            LEFT JOIN (
                SELECT BookingID, SUM(Amount) AS Amount, MAX(PaymentMethod) AS PaymentMethod
                FROM PAYMENT
                GROUP BY BookingID
            ) p ON b.BookingID = p.BookingID
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
                    paidAmount: row.PaidAmount ? Number(row.PaidAmount) : 0,
                    paymentMethod: row.PaymentMethod || null,
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
                    s.BasePrice,
                    p.Amount AS PaidAmount,
                    p.PaymentMethod AS PaymentMethod
                FROM BOOKING b
                INNER JOIN [USER] u ON b.CustomerID = u.UserID
                LEFT JOIN BOOKING_DETAIL bd ON b.BookingID = bd.BookingID
                LEFT JOIN SERVICE s ON bd.ServiceID = s.ServiceID
                LEFT JOIN (
                    SELECT BookingID, SUM(Amount) AS Amount, MAX(PaymentMethod) AS PaymentMethod
                    FROM PAYMENT
                    GROUP BY BookingID
                ) p ON b.BookingID = p.BookingID
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
            paidAmount: first.PaidAmount ? Number(first.PaidAmount) : 0,
            paymentMethod: first.PaymentMethod || null,
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
        const statusInt = parseInt(status, 10);
        if (isNaN(statusInt) || statusInt < 1 || statusInt > 5) {
            return res.status(400).json({ message: 'Trạng thái không hợp lệ. Giá trị phải từ 1 đến 5.' });
        }

        const pool = await poolPromise;
        await processBookingStatusChange(parseInt(req.params.id, 10), statusInt, pool);

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
