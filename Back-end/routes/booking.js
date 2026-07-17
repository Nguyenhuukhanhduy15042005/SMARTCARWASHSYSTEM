// Back-end/routes/booking.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../db");
const { createAndSendNotification } = require("../Services/notificationService");

const formatLocalDateTime = (dateInput) => {
    if (!dateInput) return { dateStr: "", timeStr: "" };
    const d = new Date(dateInput);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const date = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return {
        dateStr: `${year}-${month}-${date}`,
        timeStr: `${hours}:${minutes}`,
    };
};

const getAvailableMachineForBooking = async (
    pool,
    bookingDate,
    vehicleType,
    requestedMachineId = null,
) => {
    const typeUpper = String(vehicleType || "")
        .trim()
        .toUpperCase();
    let machineType = "CAR_WASHER";
    if (["BIKE", "MOTORBIKE", "XE MÁY", "XEMAY", "XE MAY"].includes(typeUpper)) {
        machineType = "BIKE_WASHER";
    }

    const machineRequest = pool.request();
    machineRequest.input("machineType", sql.NVarChar, machineType);
    let machineQuery =
        "SELECT MachineID, MachineName FROM MACHINE WHERE Status <> 3 AND MachineType = @machineType";
    if (requestedMachineId) {
        machineRequest.input("reqMachineId", sql.Int, requestedMachineId);
        machineQuery += " AND MachineID = @reqMachineId";
    }
    const machineRes = await machineRequest.query(machineQuery);
    const machines = machineRes.recordset;
    if (machines.length === 0) return null;

    const bookingRequest = pool.request();
    bookingRequest.input("bookingDate", sql.DateTime, bookingDate);
    const bookingsRes = await bookingRequest.query(`
        SELECT b.BookingID, b.BookingDate, bd.MachineID
        FROM BOOKING b
        INNER JOIN BOOKING_DETAIL bd ON b.BookingID = bd.BookingID
        WHERE CAST(b.BookingDate AS DATE) = CAST(@bookingDate AS DATE)
          AND b.Status <> 5 AND bd.MachineID IS NOT NULL
    `);
    const existingBookings = bookingsRes.recordset;

    const rStart = new Date(bookingDate).getTime();
    const rEnd = rStart + 30 * 60 * 1000;

    for (const machine of machines) {
        const isOccupied = existingBookings.some((eb) => {
            if (eb.MachineID !== machine.MachineID) return false;
            const ebStart = new Date(eb.BookingDate).getTime();
            const ebEnd = ebStart + 30 * 60 * 1000;
            return ebStart < rEnd && ebEnd > rStart;
        });
        if (!isOccupied) return machine.MachineID;
    }
    return null;
};

const processBookingStatusChange = async (bookingId, nextStatus, pool) => {
    const statusInt = parseInt(nextStatus, 10);
    const bookingRes = await pool
        .request()
        .input("bookingId", sql.Int, bookingId)
        .query(
            "SELECT CustomerID, TotalPrice, FinalPrice, Status FROM BOOKING WHERE BookingID = @bookingId",
        );

    if (bookingRes.recordset.length === 0)
        throw new Error("Không tìm thấy lịch đặt xe!");

    const booking = bookingRes.recordset[0];
    const oldStatus = booking.Status;
    const customerId = booking.CustomerID;
    if (oldStatus === statusInt) return;

    await pool
        .request()
        .input("bookingId", sql.Int, bookingId)
        .input("status", sql.TinyInt, statusInt).query(`
            UPDATE BOOKING 
            SET Status = @status, 
                CheckInTime = CASE WHEN @status = 3 THEN GETDATE() ELSE CheckInTime END
            WHERE BookingID = @bookingId
        `);

    //Cập nhật trạng thái máy
    const detailRes = await pool
        .request()
        .input("bookingId", sql.Int, bookingId)
        .query("SELECT MachineID FROM BOOKING_DETAIL WHERE BookingID = @bookingId");
    const machineIds = detailRes.recordset
        .map((r) => r.MachineID)
        .filter(Boolean);

    for (const machineId of machineIds) {
        if (statusInt === 3) {
            await pool
                .request()
                .input("machineId", sql.Int, machineId)
                .query("UPDATE MACHINE SET Status = 2 WHERE MachineID = @machineId");
        } else if (statusInt === 4 || statusInt === 5) {
            await pool
                .request()
                .input("machineId", sql.Int, machineId)
                .query("UPDATE MACHINE SET Status = 1 WHERE MachineID = @machineId");
        }
    }

    //Trigger tích điểm & Tính toán Loyalty
    if (statusInt === 4) {
        const finalPrice = Number(booking.FinalPrice || booking.TotalPrice || 0);
        const points = Math.floor(finalPrice / 10000); //tương ứng tỉ lệ 10.000đ = 1 điểm

        if (points > 0) {
            const txCheck = await pool
                .request()
                .input("bookingId", sql.Int, bookingId)
                .query(
                    "SELECT TransactionID FROM LOYALTY_TRANSACTION WHERE BookingID = @bookingId AND TransactionType = 'Accumulate'",
                );

            if (txCheck.recordset.length === 0) {
                const profileCheck = await pool
                    .request()
                    .input("userId", sql.Int, customerId)
                    .query(
                        "SELECT UserID, AccumulatedPoints FROM MEMBER_PROFILE WHERE UserID = @userId",
                    );

                let newAccumulatedPoints = points;
                if (profileCheck.recordset.length === 0) {
                    await pool
                        .request()
                        .input("userId", sql.Int, customerId)
                        .input("points", sql.Int, points).query(`
                            INSERT INTO MEMBER_PROFILE (UserID, TierID, CurrentPoints, AccumulatedPoints, JoinDate)
                            VALUES (@userId, 1, @points, @points, GETDATE())
                        `);
                } else {
                    newAccumulatedPoints =
                        Number(profileCheck.recordset[0].AccumulatedPoints || 0) + points;
                    await pool
                        .request()
                        .input("userId", sql.Int, customerId)
                        .input("points", sql.Int, points).query(`
                            UPDATE MEMBER_PROFILE
                            SET CurrentPoints = CurrentPoints + @points,
                                AccumulatedPoints = AccumulatedPoints + @points
                            WHERE UserID = @userId
                        `);
                }

                await pool
                    .request()
                    .input("userId", sql.Int, customerId)
                    .input("bookingId", sql.Int, bookingId)
                    .input("points", sql.Int, points).query(`
                        INSERT INTO LOYALTY_TRANSACTION (UserID, BookingID, TransactionType, Points, CreatedDate)
                        VALUES (@userId, @bookingId, 'Accumulate', @points, GETDATE())
                    `);

                const tiersRes = await pool
                    .request()
                    .query(
                        "SELECT TierID, RequiredPoints FROM LOYALTY_TIER ORDER BY RequiredPoints ASC",
                    );
                let newTierId = 1;
                for (const tier of tiersRes.recordset) {
                    if (newAccumulatedPoints >= tier.RequiredPoints)
                        newTierId = tier.TierID;
                }
                await pool
                    .request()
                    .input("userId", sql.Int, customerId)
                    .input("tierId", sql.Int, newTierId)
                    .query(
                        "UPDATE MEMBER_PROFILE SET TierID = @tierId WHERE UserID = @userId",
                    );

                //Thông báo tích điểm thành công
                const userRes = await pool.request()
                    .input("userId", sql.Int, customerId)
                    .query("SELECT Email FROM [USER] WHERE UserID = @userId");
                const userEmail = userRes.recordset[0]?.Email;
                createAndSendNotification({
                    userId: customerId,
                    bookingId: bookingId,
                    title: "Chúc mừng! Bạn vừa tích lũy điểm thưởng mới",
                    message: `Dịch vụ rửa xe BK-${bookingId} đã hoàn thành. Bạn được cộng ${points} điểm vào tài khoản hội viên!`,
                    type: "LOYALTY",
                    userEmail: userEmail
                });
            }
        }

        const paymentSumRes = await pool
            .request()
            .input("bookingId", sql.Int, bookingId)
            .query(
                "SELECT SUM(Amount) AS TotalPaid FROM PAYMENT WHERE BookingID = @bookingId",
            );
        const totalPaid = Number(paymentSumRes.recordset[0]?.TotalPaid || 0);
        const remaining = Number(finalPrice) - totalPaid;
        if (remaining > 0) {
            await pool
                .request()
                .input("bookingId", sql.Int, bookingId)
                .input("amount", sql.Decimal, remaining).query(`
                    INSERT INTO PAYMENT (BookingID, PaymentMethod, Amount, PaidAt)
                    VALUES (@bookingId, N'Tiền mặt', @amount, GETDATE())
                `);
        }
    }

    // Gửi thông báo hủy đơn nếu Hủy (Status = 5)
    if (statusInt === 5) {
        try {
            // 1. Lấy email của khách hàng
            const userRes = await pool.request()
                .input("userId", sql.Int, customerId)
                .query("SELECT Email FROM [USER] WHERE UserID = @userId");
            const userEmail = userRes.recordset[0]?.Email;

            // 2. Gửi thông báo In-App và Email xác nhận hủy đơn
            await createAndSendNotification({
                userId: customerId,
                bookingId: bookingId,
                title: "Hủy lịch đặt xe thành công",
                message: `Lịch đặt rửa xe của bạn (Mã đơn BK-${bookingId}) đã được hủy thành công trên hệ thống.`,
                type: "CANCEL",
                userEmail: userEmail || null
            });
        } catch (notiErr) {
            console.error(`[CancelNotification] Lỗi khi gửi thông báo hủy đơn cho BK-${bookingId}:`, notiErr.message);
        }
    }
};

function adminAuth(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (
        !token ||
        token === "mock-token" ||
        token === "null" ||
        token === "undefined"
    ) {
        req.user = { roleId: 1 };
        return next();
    }
    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "secretkey_placeholder",
        );
        if (decoded.roleId !== 1)
            return res.status(403).json({ message: "Chỉ ADMIN mới được truy cập" });
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Token không hợp lệ" });
    }
}

// ── GET / — Danh sách booking (Hỗ trợ Tìm kiếm & Lọc đa điều kiện) ─────────────
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const token = req.headers.authorization?.split(' ')[1];
        let customerId = req.query.customerId;
        // 1. Giải mã token nếu có (để xác định nếu là Khách hàng đăng nhập)
        if (token && token !== 'mock-token' && token !== 'null' && token !== 'undefined') {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey_placeholder');
                if (decoded && decoded.role === 'user') customerId = decoded.userId;
            } catch (err) { }
        }
        // 2. Lấy tất cả các tham số lọc từ URL (Query Parameters)
        const { keyword, status, date, startDate, endDate, paymentStatus } = req.query;
        // 3. Câu lệnh SQL cơ bản
        let query = `
            SELECT b.*, u.FullName AS CustomerName, u.PhoneNumber AS Phone,
                   p.Amount AS PaidAmount, p.PaymentMethod AS PaymentMethod,
                   (SELECT TOP 1 s.ServiceName FROM BOOKING_DETAIL bd
                    INNER JOIN SERVICE s ON bd.ServiceID = s.ServiceID
                    WHERE bd.BookingID = b.BookingID) AS servicePackage,
                   (SELECT TOP 1 bd.MachineID
                    FROM BOOKING_DETAIL bd
                    WHERE bd.BookingID = b.BookingID
                      AND bd.MachineID IS NOT NULL) AS MachineID,
                   (SELECT TOP 1 m.MachineName
                    FROM BOOKING_DETAIL bd
                    INNER JOIN MACHINE m ON m.MachineID = bd.MachineID
                    WHERE bd.BookingID = b.BookingID
                      AND bd.MachineID IS NOT NULL) AS MachineName
            FROM BOOKING b
            LEFT JOIN [USER] u ON b.CustomerID = u.UserID
            LEFT JOIN (SELECT BookingID, SUM(Amount) AS Amount, MAX(PaymentMethod) AS PaymentMethod
                       FROM PAYMENT GROUP BY BookingID) p ON b.BookingID = p.BookingID
        `;
        const request = pool.request();
        const conditions = [];
        // --- NỐI ĐIỀU KIỆN LỌC ĐỘNG (DYNAMIC WHERE) ---
        // A. Lọc theo CustomerID (Nếu là khách hàng xem lịch sử của mình)
        if (customerId) {
            conditions.push(`b.CustomerID = @customerId`);
            request.input('customerId', sql.Int, customerId);
        } else {
            // Mặc định ẩn các đơn nháp (Status = 1) nếu không lọc cụ thể
            if (!status) {
                conditions.push(`b.Status != 1`);
            }
        }
        // B. Lọc theo Keyword (Mã đơn, Tên khách, SĐT, Biển số xe)
        if (keyword && keyword.trim() !== '') {
            conditions.push(`(
                u.FullName LIKE @keyword OR 
                u.PhoneNumber LIKE @keyword OR 
                b.LicensePlate LIKE @keyword OR 
                CAST(b.BookingID AS VARCHAR) LIKE @keyword
            )`);
            request.input('keyword', sql.NVarChar, `%${keyword.trim()}%`);
        }
        // C. Lọc theo Trạng thái Booking (Status: 1, 2, 3, 4, 5)
        if (status) {
            conditions.push(`b.Status = @status`);
            request.input('status', sql.TinyInt, status);
        }
        // D. Lọc theo Ngày cụ thể hoặc Khoảng ngày (Date Filtering)
        if (date) {
            conditions.push(`CAST(b.BookingDate AS DATE) = @date`);
            request.input('date', sql.Date, date);
        } else if (startDate && endDate) {
            conditions.push(`CAST(b.BookingDate AS DATE) BETWEEN @startDate AND @endDate`);
            request.input('startDate', sql.Date, startDate);
            request.input('endDate', sql.Date, endDate);
        }
        // E. Lọc theo Trạng thái Thanh toán (Payment Status)
        if (paymentStatus === 'paid') {
            conditions.push(`p.Amount IS NOT NULL AND p.Amount > 0`);
        } else if (paymentStatus === 'unpaid') {
            conditions.push(`(p.Amount IS NULL OR p.Amount = 0)`);
        }
        // Gộp tất cả điều kiện vào câu lệnh SQL
        if (conditions.length > 0) {
            query += ` WHERE ` + conditions.join(' AND ');
        }
        // Sắp xếp đơn mới nhất lên đầu
        query += ` ORDER BY b.BookingDate DESC`;
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error("GET /api/bookings filter error:", err);
        res.status(500).json({ message: err.message });
    }
});

// ── GET /:id — Chi tiết booking ───────────────────────────────────────────────
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request().input("bookingId", sql.Int, id).query(`
                SELECT b.*, u.FullName AS CustomerName, u.PhoneNumber AS Phone,
                       p.Amount AS PaidAmount, p.PaymentMethod AS PaymentMethod,
                       (SELECT TOP 1 bd.MachineID
                        FROM BOOKING_DETAIL bd
                        WHERE bd.BookingID = b.BookingID
                          AND bd.MachineID IS NOT NULL) AS MachineID,
                       (SELECT TOP 1 m.MachineName
                        FROM BOOKING_DETAIL bd
                        INNER JOIN MACHINE m ON m.MachineID = bd.MachineID
                        WHERE bd.BookingID = b.BookingID
                          AND bd.MachineID IS NOT NULL) AS MachineName
                FROM BOOKING b
                LEFT JOIN [USER] u ON b.CustomerID = u.UserID
                LEFT JOIN (SELECT BookingID, SUM(Amount) AS Amount, MAX(PaymentMethod) AS PaymentMethod
                           FROM PAYMENT GROUP BY BookingID) p ON b.BookingID = p.BookingID
                WHERE b.BookingID = @bookingId
            `);
        if (result.recordset.length === 0)
            return res.status(404).json({ message: "Không tìm thấy lịch đặt xe" });
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── POST / — Tạo booking mới ──────────────────────────────────────────────────
router.post("/", async (req, res) => {
    try {
        const {
            CustomerID,
            BookingDate,
            VehicleType,
            LicensePlate,
            TotalPrice,
            FinalPrice,
            Status,
            ServiceIDs,
        } = req.body;
        const machineId = req.body.MachineID || req.body.machineId || null;

        //Kiểm tra các trường bắt buộc và mảng dịch vụ
        if (
            !CustomerID ||
            !BookingDate ||
            !VehicleType ||
            !LicensePlate ||
            !machineId ||
            !ServiceIDs ||
            !Array.isArray(ServiceIDs) ||
            ServiceIDs.length === 0
        )
            return res.status(400).json({
                message: "Thiếu thông tin đặt lịch, máy/sàn rửa xe hoặc gói dịch vụ không hợp lệ!",
            });

        const requestedMachineId = Number(machineId);
        if (!Number.isInteger(requestedMachineId) || requestedMachineId <= 0) {
            return res.status(400).json({ message: "MachineID không hợp lệ!" });
        }

        //Kiểm tra định dạng ngày giờ đặt lịch:
        const scheduledDate = new Date(BookingDate);
        if (isNaN(scheduledDate.getTime()))
            return res
                .status(400)
                .json({ message: "Thời gian đặt lịch không hợp lệ!" });

        //Chặn thời gian đặt lịch trong quá khứ:
        if (scheduledDate < new Date())
            return res
                .status(400)
                .json({ message: "Thời gian đặt lịch không được ở trong quá khứ!" });


        // --- BẮT ĐẦU THÊM KIỂM TRA GIỚI HẠN NGÀY ĐẶT TRƯỚC (BR-05) ---
        const pool = await poolPromise;

        // 1. Truy vấn tên hạng thành viên của khách hàng
        const tierRes = await pool.request()
            .input("customerId", sql.Int, CustomerID)
            .query(`
                SELECT lt.TierName 
                FROM MEMBER_PROFILE mp 
                LEFT JOIN LOYALTY_TIER lt ON mp.TierID = lt.TierID 
                WHERE mp.UserID = @customerId
            `);
        const tierName = tierRes.recordset[0]?.TierName || "Member";
        // 2. Định nghĩa số ngày giới hạn ứng với từng hạng
        let maxAdvanceDays = 7; // Mặc định là Member (Bronze) được 7 ngày
        const normalizedTier = tierName.toLowerCase();
        if (normalizedTier.includes("silver")) {
            maxAdvanceDays = 10;
        } else if (normalizedTier.includes("gold")) {
            maxAdvanceDays = 12;
        } else if (normalizedTier.includes("platinum")) {
            maxAdvanceDays = 14;
        }
        // 3. Tính khoảng cách số ngày giữa Ngày hẹn và Ngày hôm nay
        const scheduledDateOnly = new Date(scheduledDate);
        scheduledDateOnly.setHours(0, 0, 0, 0); // Đặt về 00:00 để so sánh chính xác số ngày

        const todayOnly = new Date();
        todayOnly.setHours(0, 0, 0, 0);
        const diffTime = scheduledDateOnly.getTime() - todayOnly.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // 4. Nếu số ngày vượt quá giới hạn -> Từ chối đặt lịch
        if (diffDays > maxAdvanceDays) {
            return res.status(400).json({
                message: `Hạng thành viên của bạn (${tierName}) chỉ được đặt lịch trước tối đa ${maxAdvanceDays} ngày!`
            });
        }
        // --- KẾT THÚC KIỂM TRA GIỚI HẠN NGÀY ĐẶT TRƯỚC ---

        //ktra máy
        const assignedMachineId = await getAvailableMachineForBooking(
            pool,
            scheduledDate,
            VehicleType,
            requestedMachineId,
        );
        if (!assignedMachineId) {
            return res.status(409).json({
                message: "Máy/sàn rửa xe được chọn không phù hợp, đang bảo trì hoặc đã có lịch trong khung giờ này!",
            });
        }

        //Chặn spam booking
        const pendingCheck = await pool
            .request()
            .input("customerId", sql.Int, CustomerID)
            .query(
                "SELECT COUNT(*) AS PendingCount FROM BOOKING WHERE CustomerID = @customerId AND Status IN (1, 2)",
            );
        if (pendingCheck.recordset[0].PendingCount >= 2)
            return res.status(400).json({
                message:
                    "Bạn đã có 2 lịch đặt xe đang chờ xử lý. Vui lòng hoàn tất hoặc hủy lịch cũ trước!",
            });

        //Chặn trùng lặp khung giờ (Chỉ chặn nếu trùng cả Giờ VÀ trùng cả Biển số xe)
        const clashCheck = await pool
            .request()
            .input("customerId", sql.Int, CustomerID)
            .input("bookingDate", sql.DateTime, scheduledDate)
            .input("licensePlate", sql.NVarChar, LicensePlate)
            .query(
                "SELECT BookingID FROM BOOKING WHERE CustomerID = @customerId AND BookingDate = @bookingDate AND LicensePlate = @licensePlate AND Status <> 5",
            );
        if (clashCheck.recordset.length > 0)
            return res
                .status(400)
                .json({ message: `Xe này (biển số ${LicensePlate}) đã có lịch hẹn vào khung giờ này!` });

        const result = await pool
            .request()
            .input("CustomerID", sql.Int, CustomerID)
            .input("BookingDate", sql.DateTime, scheduledDate)
            .input("VehicleType", sql.NVarChar, VehicleType)
            .input("LicensePlate", sql.NVarChar, LicensePlate)
            .input("TotalPrice", sql.Decimal, TotalPrice)
            .input("FinalPrice", sql.Decimal, FinalPrice)
            .input("Status", sql.TinyInt, Status || 1).query(`
                INSERT INTO BOOKING (CustomerID, BookingDate, VehicleType, LicensePlate, TotalPrice, FinalPrice, Status)
                OUTPUT INSERTED.BookingID
                VALUES (@CustomerID, @BookingDate, @VehicleType, @LicensePlate, @TotalPrice, @FinalPrice, @Status)
            `);
        const newBookingID = result.recordset[0].BookingID;

        for (const serviceID of ServiceIDs) {
            await pool
                .request()
                .input("BookingID", sql.Int, newBookingID)
                .input("ServiceID", sql.Int, serviceID)
                .input("MachineID", sql.Int, assignedMachineId)
                .query(
                    `INSERT INTO BOOKING_DETAIL (BookingID, ServiceID, MachineID) VALUES (@BookingID, @ServiceID, @MachineID)`,
                );
        }

        //Thông báo đặt lịch rửa xe thành công
        const userRes = await pool.request()
            .input("userId", sql.Int, CustomerID)
            .query("SELECT Email FROM [USER] WHERE UserID = @userId");
        const userEmail = userRes.recordset[0]?.Email;

        createAndSendNotification({
            userId: CustomerID,
            bookingId: newBookingID,
            title: "Lịch đặt xe đang chờ thanh toán",
            message: `Yêu cầu đặt lịch rửa xe của bạn (Mã đơn BK-${newBookingID}) đã được ghi nhận. Vui lòng hoàn tất thanh toán/đặt cọc trong vòng 15 phút để xác nhận lịch hẹn.`,
            type: "BOOKING", // đổi màu giao diện email sang màu xanh lam chờ thanh toán
            userEmail: userEmail
        });

        const selectedMachineRes = await pool
            .request()
            .input("machineId", sql.Int, assignedMachineId)
            .query(
                "SELECT MachineName FROM MACHINE WHERE MachineID = @machineId",
            );

        res.status(201).json({
            message: "Tạo booking thành công",
            BookingID: newBookingID,
            MachineID: assignedMachineId,
            MachineName:
                selectedMachineRes.recordset[0]?.MachineName || null,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── POST /:id/transition — Chặn giá trị trạng thái không nằm trong khoảng [1 - 5] ───────────────────────────
router.post("/:id/transition", async (req, res) => {
    try {
        const { id } = req.params;
        const { nextStatus } = req.body;
        const statusInt = parseInt(nextStatus, 10);
        if (isNaN(statusInt) || statusInt < 1 || statusInt > 5)
            return res
                .status(400)
                .json({ message: "Trạng thái không hợp lệ. Giá trị phải từ 1 đến 5." });

        const pool = await poolPromise;
        await processBookingStatusChange(parseInt(id, 10), statusInt, pool);
        res.json({
            message: `Cập nhật trạng thái thành công (Status: ${statusInt})`,
        });
    } catch (err) {
        console.error("[transition error]", err.message);
        res.status(500).json({ message: err.message });
    }
});

// ── GET /customer/:customerId — Lịch sử booking của khách ────────────────────
router.get("/customer/:customerId", async (req, res) => {
    try {
        const { customerId } = req.params;
        const pool = await poolPromise;
        const result = await pool.request().input("customerId", sql.Int, customerId)
            .query(`
                SELECT b.*, u.FullName AS CustomerName, u.PhoneNumber AS Phone,
                       (SELECT TOP 1 s.ServiceName FROM BOOKING_DETAIL bd
                        INNER JOIN SERVICE s ON bd.ServiceID = s.ServiceID
                        WHERE bd.BookingID = b.BookingID) AS servicePackage
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

// ── DELETE /:id — Khách xóa booking khỏi lịch sử (xóa thật) ─────────────────
router.delete("/:id", async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id, 10);
        if (isNaN(bookingId))
            return res.status(400).json({ message: "BookingID không hợp lệ" });

        const token = req.headers.authorization?.split(" ")[1];
        let userId = null;

        if (
            token &&
            token !== "mock-token" &&
            token !== "null" &&
            token !== "undefined"
        ) {
            try {
                const decoded = jwt.verify(
                    token,
                    process.env.JWT_SECRET || "secretkey_placeholder",
                );
                userId = decoded.userId || decoded.id;
            } catch (err) {
                return res
                    .status(403)
                    .json({ message: "Token không hợp lệ hoặc đã hết hạn!" });
            }
        }

        const pool = await poolPromise;
        const checkResult = await pool
            .request()
            .input("bookingId", sql.Int, bookingId)
            .query(
                "SELECT CustomerID, Status FROM BOOKING WHERE BookingID = @bookingId",
            );

        if (checkResult.recordset.length === 0)
            return res.status(404).json({ message: "Không tìm thấy lịch đặt xe" });

        const booking = checkResult.recordset[0];

        if (userId && booking.CustomerID !== userId)
            return res
                .status(403)
                .json({ message: "Bạn không có quyền xóa lịch đặt xe này" });

        if (booking.Status !== 4 && booking.Status !== 5)
            return res.status(400).json({
                message: "Chỉ có thể xóa lịch đặt xe đã hoàn thành hoặc đã hủy",
            });

        // Soft delete — chỉ ẩn khỏi lịch sử khách, không xóa khỏi DB
        await pool.request()
            .input("id", sql.Int, bookingId)
            .query("UPDATE BOOKING SET IsHiddenByUser = 1 WHERE BookingID = @id");

        res.json({ message: "Xóa lịch đặt khỏi lịch sử thành công" });
    } catch (err) {
        console.error("DELETE /api/bookings/:id error:", err);
        res.status(500).json({ message: err.message });
    }
});

// ── POST /:id/apply-voucher ───────────────────────────────────────────────────
router.post("/:id/apply-voucher", async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id, 10);
        const { memberPromoId } = req.body;
        if (isNaN(bookingId))
            return res.status(400).json({ message: "BookingID không hợp lệ" });

        const token = req.headers.authorization?.split(" ")[1];
        let userId = null;
        if (
            token &&
            token !== "mock-token" &&
            token !== "null" &&
            token !== "undefined"
        ) {
            try {
                const decoded = jwt.verify(
                    token,
                    process.env.JWT_SECRET || "secretkey_placeholder",
                );
                userId = decoded.userId || decoded.id;
            } catch (err) {
                return res
                    .status(403)
                    .json({ message: "Token không hợp lệ hoặc đã hết hạn!" });
            }
        }

        const pool = await poolPromise;
        const bookingCheck = await pool
            .request()
            .input("bookingId", sql.Int, bookingId)
            .query(
                "SELECT CustomerID, TotalPrice, Status FROM BOOKING WHERE BookingID = @bookingId",
            );
        if (bookingCheck.recordset.length === 0)
            return res.status(404).json({ message: "Không tìm thấy lịch đặt xe" });

        const booking = bookingCheck.recordset[0];
        if (userId && booking.CustomerID !== userId)
            return res
                .status(403)
                .json({ message: "Bạn không có quyền thao tác trên lịch đặt xe này" });
        if (booking.Status !== 1)
            return res.status(400).json({
                message: "Chỉ có thể áp dụng voucher cho lịch đặt chưa thanh toán",
            });

        if (!memberPromoId) {
            await pool
                .request()
                .input("bookingId", sql.Int, bookingId)
                .input("totalPrice", sql.Decimal(18, 2), booking.TotalPrice)
                .query(
                    `UPDATE BOOKING SET MemberPromoID = NULL, FinalPrice = @totalPrice WHERE BookingID = @bookingId`,
                );
            return res.json({
                message: "Đã gỡ bỏ voucher thành công",
                FinalPrice: booking.TotalPrice,
                MemberPromoID: null,
            });
        }

        const memberPromoIdInt = parseInt(memberPromoId, 10);
        if (isNaN(memberPromoIdInt))
            return res.status(400).json({ message: "Voucher không hợp lệ" });

        const promoCheck = await pool
            .request()
            .input("memberPromoId", sql.Int, memberPromoIdInt)
            .input("customerId", sql.Int, booking.CustomerID).query(`
                SELECT mp.MemberPromoID, mp.IsUsed, p.DiscountPercent, p.EndDate
                FROM MEMBER_PROMOTION mp
                JOIN PROMOTION p ON mp.PromotionID = p.PromotionID
                WHERE mp.MemberPromoID = @memberPromoId AND mp.UserID = @customerId
            `);
        if (promoCheck.recordset.length === 0)
            return res
                .status(404)
                .json({ message: "Không tìm thấy voucher trong ví của bạn" });

        const promo = promoCheck.recordset[0];
        if (promo.IsUsed === true || promo.IsUsed === 1)
            return res.status(400).json({ message: "Voucher này đã được sử dụng" });
        if (promo.EndDate && new Date(promo.EndDate) < new Date())
            return res.status(400).json({ message: "Voucher này đã hết hạn" });

        const discountPercent = parseFloat(promo.DiscountPercent || 0);
        const finalPrice = Math.round(
            booking.TotalPrice * (1 - discountPercent / 100),
        );

        await pool
            .request()
            .input("bookingId", sql.Int, bookingId)
            .input("memberPromoId", sql.Int, memberPromoIdInt)
            .input("finalPrice", sql.Decimal(18, 2), finalPrice)
            .query(
                `UPDATE BOOKING SET MemberPromoID = @memberPromoId, FinalPrice = @finalPrice WHERE BookingID = @bookingId`,
            );

        return res.json({
            message: "Áp dụng voucher thành công",
            FinalPrice: finalPrice,
            MemberPromoID: memberPromoIdInt,
        });
    } catch (err) {
        console.error("apply-voucher error:", err);
        return res.status(500).json({ message: err.message });
    }
});

// ── ADMIN ROUTES ──────────────────────────────────────────────────────────────

router.get("/admin/all", adminAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const { status, vehicleType, search, fromDate, toDate } = req.query;
        let query = `
            SELECT b.BookingID, b.CustomerID, b.BookingDate, b.CheckInTime, b.VehicleType,
                   b.LicensePlate, b.TotalPrice, b.FinalPrice, b.Status,
                   u.FullName AS CustomerName, u.PhoneNumber AS CustomerPhone, s.ServiceName,
                   bd.MachineID, m.MachineName,
                   p.Amount AS PaidAmount, p.PaymentMethod AS PaymentMethod
            FROM BOOKING b
            INNER JOIN [USER] u ON b.CustomerID = u.UserID
            LEFT JOIN BOOKING_DETAIL bd ON b.BookingID = bd.BookingID
            LEFT JOIN SERVICE s ON bd.ServiceID = s.ServiceID
            LEFT JOIN MACHINE m ON m.MachineID = bd.MachineID
            LEFT JOIN (SELECT BookingID, SUM(Amount) AS Amount, MAX(PaymentMethod) AS PaymentMethod
                       FROM PAYMENT GROUP BY BookingID) p ON b.BookingID = p.BookingID
            WHERE b.Status != 1
        `;
        const request = pool.request();
        if (status && status !== "All") {
            query += " AND b.Status = @status";
            request.input("status", sql.TinyInt, status);
        }
        if (vehicleType && vehicleType !== "All") {
            query += " AND b.VehicleType = @vehicleType";
            request.input("vehicleType", sql.NVarChar, vehicleType);
        }
        if (search) {
            query +=
                " AND (u.FullName LIKE @search OR b.LicensePlate LIKE @search OR u.PhoneNumber LIKE @search)";
            request.input("search", sql.NVarChar, `%${search}%`);
        }
        if (fromDate) {
            query += " AND b.BookingDate >= @fromDate";
            request.input("fromDate", sql.DateTime, fromDate);
        }
        if (toDate) {
            query += " AND b.BookingDate <= @toDate";
            request.input("toDate", sql.DateTime, toDate);
        }

        const result = await request.query(query);
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
                    totalPrice: Number(row.TotalPrice || 0),
                    status: row.Status,
                    date: format.dateStr,
                    time: format.timeStr,
                    paidAmount: row.PaidAmount ? Number(row.PaidAmount) : 0,
                    paymentMethod: row.PaymentMethod || null,
                    machineId: row.MachineID || null,
                    machineName: row.MachineName || null,
                    servicesList: [],
                };
            }
            if (row.ServiceName)
                bookingsMap[row.BookingID].servicesList.push(row.ServiceName);
        }
        const bookingsList = Object.values(bookingsMap).map((b) => {
            b.servicePackage = b.servicesList.join(", ") || "N/A";
            delete b.servicesList;
            return b;
        });
        bookingsList.sort((a, b) => b.id - a.id);
        res.json(bookingsList);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get("/admin/:id", adminAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().input("id", sql.Int, req.params.id)
            .query(`
                SELECT b.*, u.FullName AS CustomerName, u.PhoneNumber AS CustomerPhone,
                       s.ServiceName, s.BasePrice, bd.MachineID, m.MachineName,
                       p.Amount AS PaidAmount, p.PaymentMethod
                FROM BOOKING b
                INNER JOIN [USER] u ON b.CustomerID = u.UserID
                LEFT JOIN BOOKING_DETAIL bd ON b.BookingID = bd.BookingID
                LEFT JOIN SERVICE s ON bd.ServiceID = s.ServiceID
                LEFT JOIN MACHINE m ON m.MachineID = bd.MachineID
                LEFT JOIN (SELECT BookingID, SUM(Amount) AS Amount, MAX(PaymentMethod) AS PaymentMethod
                           FROM PAYMENT GROUP BY BookingID) p ON b.BookingID = p.BookingID
                WHERE b.BookingID = @id
            `);
        if (result.recordset.length === 0)
            return res.status(404).json({ message: "Không tìm thấy booking" });
        const first = result.recordset[0];
        const services = result.recordset.map((r) => r.ServiceName).filter(Boolean);
        const format = formatLocalDateTime(first.BookingDate);
        res.json({
            id: first.BookingID,
            customerName: first.CustomerName,
            phone: first.CustomerPhone,
            vehicleType: first.VehicleType,
            licensePlate: first.LicensePlate,
            price: Number(first.FinalPrice || first.TotalPrice || 0),
            totalPrice: Number(first.TotalPrice || 0),
            status: first.Status,
            date: format.dateStr,
            time: format.timeStr,
            paidAmount: first.PaidAmount ? Number(first.PaidAmount) : 0,
            paymentMethod: first.PaymentMethod || null,
            machineId: first.MachineID || null,
            machineName: first.MachineName || null,
            servicePackage: services.join(", ") || "N/A",
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post("/admin/create", adminAuth, async (req, res) => {
    try {
        const {
            CustomerID,
            BookingDate,
            VehicleType,
            LicensePlate,
            TotalPrice,
            FinalPrice,
            Status,
            ServiceIDs,
        } = req.body;
        const machineId = req.body.MachineID || req.body.machineId || null;
        const scheduledDate = BookingDate ? new Date(BookingDate) : new Date();
        const pool = await poolPromise;
        const assignedMachineId = await getAvailableMachineForBooking(
            pool,
            scheduledDate,
            VehicleType,
            machineId,
        );
        if (!assignedMachineId)
            return res
                .status(409)
                .json({ message: "Không có máy rửa xe nào khả dụng!" });

        const result = await pool
            .request()
            .input("CustomerID", sql.Int, CustomerID)
            .input("BookingDate", sql.DateTime, scheduledDate)
            .input("VehicleType", sql.NVarChar, VehicleType)
            .input("LicensePlate", sql.NVarChar, LicensePlate)
            .input("TotalPrice", sql.Decimal, TotalPrice)
            .input("FinalPrice", sql.Decimal, FinalPrice)
            .input("Status", sql.TinyInt, Status || 2)
            .query(`INSERT INTO BOOKING (CustomerID, BookingDate, VehicleType, LicensePlate, TotalPrice, FinalPrice, Status)
                    OUTPUT INSERTED.BookingID VALUES (@CustomerID, @BookingDate, @VehicleType, @LicensePlate, @TotalPrice, @FinalPrice, @Status)`);
        const newBookingID = result.recordset[0].BookingID;
        if (Array.isArray(ServiceIDs)) {
            for (const serviceID of ServiceIDs) {
                await pool
                    .request()
                    .input("BookingID", sql.Int, newBookingID)
                    .input("ServiceID", sql.Int, serviceID)
                    .input("MachineID", sql.Int, assignedMachineId)
                    .query(
                        `INSERT INTO BOOKING_DETAIL (BookingID, ServiceID, MachineID) VALUES (@BookingID, @ServiceID, @MachineID)`,
                    );
            }
        }
        res.status(201).json({
            message: "Tạo booking thành công",
            id: newBookingID,
            MachineID: assignedMachineId,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put("/admin/:id/status", adminAuth, async (req, res) => {
    try {
        const { status } = req.body;
        const statusInt = parseInt(status, 10);
        if (isNaN(statusInt) || statusInt < 1 || statusInt > 5)
            return res.status(400).json({ message: "Trạng thái không hợp lệ." });
        const pool = await poolPromise;
        await processBookingStatusChange(
            parseInt(req.params.id, 10),
            statusInt,
            pool,
        );
        res.json({ message: "Cập nhật trạng thái thành công" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete("/admin/:id", adminAuth, async (req, res) => {
    try {
        const bookingId = req.params.id;
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            const request = new sql.Request(transaction);
            request.input("id", sql.Int, bookingId);
            await request.query("DELETE FROM FEEDBACK WHERE BookingID = @id");
            await request.query(
                "DELETE FROM LOYALTY_TRANSACTION WHERE BookingID = @id",
            );
            await request.query("DELETE FROM PAYMENT WHERE BookingID = @id");
            await request.query("DELETE FROM BOOKING_DETAIL WHERE BookingID = @id");
            await request.query("DELETE FROM BOOKING WHERE BookingID = @id");
            await transaction.commit();
            res.json({ message: "Xóa lịch đặt khỏi CSDL thành công" });
        } catch (innerErr) {
            await transaction.rollback();
            throw innerErr;
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get("/admin/dashboard/stats", adminAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                SUM(CASE WHEN Status != 1 THEN 1 ELSE 0 END) AS total,
                0 AS pending,
                SUM(CASE WHEN Status = 3 THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN Status = 4 THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN Status = 5 THEN 1 ELSE 0 END) AS cancelled,
                COALESCE(SUM(CASE WHEN Status = 4 THEN COALESCE(FinalPrice, TotalPrice, 0) ELSE 0 END), 0) AS revenue
            FROM BOOKING
        `);
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.processBookingStatusChange = processBookingStatusChange;
module.exports = router;
