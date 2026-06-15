// Back-end/routes/booking.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../db");
const { processLoyaltyPoints } = require("./loyaltyService");

// Helper to format date and time safely preserving local timezone offsets
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

// Helper to process FSM state changes (Loyalty calculation, Machine status updates, Payment auto-generation)
const processBookingStatusChange = async (bookingId, nextStatus, pool) => {
  const statusInt = parseInt(nextStatus, 10);

  // 1. Get current booking info
  const bookingRes = await pool
    .request()
    .input("bookingId", sql.Int, bookingId)
    .query(
      "SELECT CustomerID, TotalPrice, FinalPrice, Status FROM BOOKING WHERE BookingID = @bookingId",
    );

  if (bookingRes.recordset.length === 0) {
    throw new Error("Không tìm thấy lịch đặt xe!");
  }

  const booking = bookingRes.recordset[0];
  const oldStatus = booking.Status;
  const customerId = booking.CustomerID;

  if (oldStatus === statusInt) return; // No change needed

  // 2. Update booking status & CheckInTime if In Service (status = 3)
  await pool
    .request()
    .input("bookingId", sql.Int, bookingId)
    .input("status", sql.TinyInt, statusInt).query(`
            UPDATE BOOKING 
            SET Status = @status, 
                CheckInTime = CASE WHEN @status = 3 THEN GETDATE() ELSE CheckInTime END
            WHERE BookingID = @bookingId
        `);

  // 3. Update machine status (assigned to the booking in BOOKING_DETAIL)
  const detailRes = await pool
    .request()
    .input("bookingId", sql.Int, bookingId)
    .query("SELECT MachineID FROM BOOKING_DETAIL WHERE BookingID = @bookingId");
  const machineIds = detailRes.recordset
    .map((r) => r.MachineID)
    .filter(Boolean);

  for (const machineId of machineIds) {
    if (statusInt === 3) {
      // Set machine status to 2 (Busy/Operating)
      await pool
        .request()
        .input("machineId", sql.Int, machineId)
        .query("UPDATE MACHINE SET Status = 2 WHERE MachineID = @machineId");
    } else if (statusInt === 4 || statusInt === 5) {
      // Free the machine: set status to 1 (Available)
      await pool
        .request()
        .input("machineId", sql.Int, machineId)
        .query("UPDATE MACHINE SET Status = 1 WHERE MachineID = @machineId");
    }
  }

  // 3.5. Hoàn lại voucher nếu huỷ booking (status = 5)
  if (statusInt === 5) {
    await pool.request()
      .input("bookingId", sql.Int, bookingId)
      .query(`
        UPDATE MEMBER_PROMOTION 
        SET IsUsed = 0 
        WHERE MemberPromoID = (SELECT MemberPromoID FROM BOOKING WHERE BookingID = @bookingId)
      `);
  }

  // 4. Booking Completion Flow (statusInt === 4)
  if (statusInt === 4) {
    const finalPrice = Number(booking.FinalPrice || booking.TotalPrice || 0);

    // GỌI HÀM SERVICE CHUẨN ĐỂ XỬ LÝ ĐIỂM & HẠNG TỪ FILE LOYALTY_SERVICE
    if (customerId && finalPrice > 0) {
      try {
        await processLoyaltyPoints(customerId, bookingId, finalPrice);
        console.log(
          `[Loyalty] Đã cộng điểm cho Khách ${customerId}, Mã đơn ${bookingId}`,
        );
      } catch (err) {
        console.error("❌ Lỗi khi chạy service cộng điểm:", err.message);
      }
    }

    // Ghi nhận hóa đơn thanh toán (Payment)
    try {
      const paymentCheck = await pool
        .request()
        .input("bookingId", sql.Int, bookingId)
        .query("SELECT PaymentID, PaymentMethod FROM PAYMENT WHERE BookingID = @bookingId");

      if (paymentCheck.recordset.length === 0) {
        await pool
          .request()
          .input("bookingId", sql.Int, bookingId)
          .input("amount", sql.Decimal, finalPrice)
          .query(`INSERT INTO PAYMENT (BookingID, PaymentMethod, Amount, PaidAt)
                  VALUES (@bookingId, N'Tiền mặt', @amount, GETDATE())`);
      } else {
        // Nếu đã có thanh toán cọc (Method = 'cash'), cập nhật thành thanh toán đầy đủ khi hoàn thành
        const payment = paymentCheck.recordset[0];
        if (payment.PaymentMethod === 'cash') {
          await pool
            .request()
            .input("bookingId", sql.Int, bookingId)
            .input("amount", sql.Decimal, finalPrice)
            .query(`UPDATE PAYMENT 
                    SET Amount = @amount, PaymentMethod = N'Tiền mặt' 
                    WHERE BookingID = @bookingId`);
        }
      }
    } catch (err) {
      console.error("❌ Lỗi tạo/cập nhật Payment:", err.message);
    }
  }
};

// Middleware to authorize admin requests
function adminAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  // Bypass authentication checks during test/demo mode
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

    if (decoded.roleId !== 1) {
      return res.status(403).json({
        message: "Chỉ ADMIN mới được truy cập",
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      message: "Token không hợp lệ",
    });
  }
}

// ==========================================
// STAFF & USER ROUTES (Database PascalCase Casing)
// ==========================================

// 1. Xem danh sách booking (Cho Staff Dashboard hoặc User Dashboard)
router.get("/", async (req, res) => {
  try {
    const pool = await poolPromise;
    const token = req.headers.authorization?.split(" ")[1];
    let customerId = req.query.customerId;

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
        // Nếu là user thường, chỉ cho phép xem dữ liệu của chính họ
        if (decoded && decoded.role === "user") {
          customerId = decoded.userId;
        }
      } catch (err) {
        // Bỏ qua lỗi verify token trong môi trường demo/dev
      }
    }

    let query = `
            SELECT b.*, u.FullName AS CustomerName, u.PhoneNumber AS Phone
            FROM BOOKING b
            LEFT JOIN [USER] u ON b.CustomerID = u.UserID
        `;

    const request = pool.request();
    if (customerId) {
      query += ` WHERE b.CustomerID = @customerId`;
      request.input("customerId", sql.Int, customerId);
    }

    query += ` ORDER BY b.BookingDate DESC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Chi tiết lịch đặt xe
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool.request().input("bookingId", sql.Int, id).query(`
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

// 3. Khách hàng tạo booking mới (Database connected + Validation & Anti-spam checks)
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

    // Validation checks
    if (
      !CustomerID ||
      !BookingDate ||
      !VehicleType ||
      !LicensePlate ||
      !ServiceIDs ||
      !Array.isArray(ServiceIDs) ||
      ServiceIDs.length === 0
    ) {
      return res.status(400).json({
        message: "Thiếu thông tin đặt lịch hoặc gói dịch vụ không hợp lệ!",
      });
    }

    const scheduledDate = new Date(BookingDate);
    if (isNaN(scheduledDate.getTime())) {
      return res
        .status(400)
        .json({ message: "Thời gian đặt lịch không hợp lệ!" });
    }
    if (scheduledDate < new Date()) {
      return res
        .status(400)
        .json({ message: "Thời gian đặt lịch không được ở trong quá khứ!" });
    }

    const pool = await poolPromise;

    // Anti-spam check: Maximum of 2 pending bookings (Status = 1 or 2)
    const pendingCheck = await pool
      .request()
      .input("customerId", sql.Int, CustomerID)
      .query(
        "SELECT COUNT(*) AS PendingCount FROM BOOKING WHERE CustomerID = @customerId AND Status IN (1, 2)",
      );
    const pendingCount = pendingCheck.recordset[0].PendingCount;
    if (pendingCount >= 2) {
      return res.status(400).json({
        message:
          "Bạn đã có 2 lịch đặt xe đang chờ xử lý. Vui lòng hoàn tất hoặc hủy lịch cũ trước khi đặt lịch mới!",
      });
    }

    // Clash check: same customer cannot book another wash in the exact same timeslot
    const clashCheck = await pool
      .request()
      .input("customerId", sql.Int, CustomerID)
      .input("bookingDate", sql.DateTime, scheduledDate)
      .query(
        "SELECT BookingID FROM BOOKING WHERE CustomerID = @customerId AND BookingDate = @bookingDate AND Status <> 5",
      );
    if (clashCheck.recordset.length > 0) {
      return res
        .status(400)
        .json({ message: "Bạn đã có một lịch hẹn khác vào khung giờ này!" });
    }

    const result = await pool
      .request()
      .input("CustomerID", sql.Int, CustomerID)
      .input("BookingDate", sql.DateTime, scheduledDate)
      .input("VehicleType", sql.NVarChar, VehicleType)
      .input("LicensePlate", sql.NVarChar, LicensePlate)
      .input("TotalPrice", sql.Decimal, TotalPrice)
      .input("FinalPrice", sql.Decimal, FinalPrice)
      .input("Status", sql.TinyInt, Status || 1) // 1 = Chờ duyệt
      .query(`
                INSERT INTO BOOKING (CustomerID, BookingDate, VehicleType, LicensePlate, TotalPrice, FinalPrice, Status)
                OUTPUT INSERTED.BookingID
                VALUES (@CustomerID, @BookingDate, @VehicleType, @LicensePlate, @TotalPrice, @FinalPrice, @Status)
            `);

    const newBookingID = result.recordset[0].BookingID;

    if (Array.isArray(ServiceIDs) && ServiceIDs.length > 0) {
      for (const serviceID of ServiceIDs) {
        await pool
          .request()
          .input("BookingID", sql.Int, newBookingID)
          .input("ServiceID", sql.Int, serviceID).query(`
                        INSERT INTO BOOKING_DETAIL (BookingID, ServiceID)
                        VALUES (@BookingID, @ServiceID)
                    `);
      }
    }
    res
      .status(201)
      .json({ message: "Tạo booking thành công", BookingID: newBookingID });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Staff cập nhật trạng thái FSM (Pending -> Confirmed -> In Service -> Completed -> Cancelled)
router.post("/:id/transition", async (req, res) => {
  try {
    const { id } = req.params;
    const { nextStatus } = req.body;

    const statusInt = parseInt(nextStatus, 10);
    if (isNaN(statusInt) || statusInt < 1 || statusInt > 5) {
      return res
        .status(400)
        .json({ message: "Trạng thái không hợp lệ. Giá trị phải từ 1 đến 5." });
    }

    const pool = await poolPromise;
    // Trọng thêm: Sử dụng processBookingStatusChange để cập nhật trạng thái đồng bộ FSM (giải phóng máy, tính điểm, vv) và tránh lỗi sql.VarChar với TinyInt
    await processBookingStatusChange(parseInt(id, 10), statusInt, pool);

    res.json({
      message: `Cập nhật trạng thái thành công (Status: ${statusInt})`,
    });
  } catch (err) {
    console.error("[transition error]", err.message);
    res.status(500).json({ message: err.message });
  }
});

// 5. Xem lịch sử booking của một Khách hàng cụ thể (Sử dụng cho User Dashboard)
router.get("/customer/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;
    const pool = await poolPromise;
    const result = await pool.request().input("customerId", sql.Int, customerId)
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

// 5.5. Áp dụng voucher/khuyến mãi cho Booking
router.post("/:id/apply-voucher", async (req, res) => {
  const bookingId = Number(req.params.id);
  const { memberPromoId } = req.body; // memberPromoId: null hoặc id voucher

  if (!bookingId) {
    return res.status(400).json({ message: "Mã đặt lịch không hợp lệ" });
  }

  // Lấy User từ token nếu có
  const token = req.headers.authorization?.split(" ")[1];
  let userId = null;
  if (token && token !== "mock-token" && token !== "null" && token !== "undefined") {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "secretkey_placeholder"
      );
      userId = decoded.userId;
    } catch (err) {
      console.error("Token verification failed:", err.message);
    }
  }

  try {
    const pool = await poolPromise;

    // 1. Lấy thông tin booking
    const bookingRes = await pool.request()
      .input("bookingId", sql.Int, bookingId)
      .query("SELECT CustomerID, TotalPrice, FinalPrice, MemberPromoID FROM BOOKING WHERE BookingID = @bookingId");

    if (bookingRes.recordset.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy thông tin đặt lịch" });
    }

    const booking = bookingRes.recordset[0];

    // Kiểm tra quyền sở hữu đơn đặt lịch (nếu có userId từ token)
    if (userId && booking.CustomerID !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền thay đổi thông tin đặt lịch này" });
    }

    // 2. Nếu gỡ bỏ voucher (memberPromoId là null)
    if (!memberPromoId) {
      await pool.request()
        .input("bookingId", sql.Int, bookingId)
        .query("UPDATE BOOKING SET MemberPromoID = NULL, FinalPrice = TotalPrice WHERE BookingID = @bookingId");

      return res.json({
        message: "Đã gỡ bỏ voucher thành công",
        FinalPrice: booking.TotalPrice,
        MemberPromoID: null
      });
    }

    // 3. Áp dụng voucher
    const voucherRes = await pool.request()
      .input("memberPromoId", sql.Int, memberPromoId)
      .input("userId", sql.Int, booking.CustomerID)
      .query(`
        SELECT mp.MemberPromoID, mp.PromotionID, mp.IsUsed, 
               p.DiscountPercent, p.EndDate
        FROM MEMBER_PROMOTION mp
        INNER JOIN PROMOTION p ON mp.PromotionID = p.PromotionID
        WHERE mp.MemberPromoID = @memberPromoId AND mp.UserID = @userId
      `);

    if (voucherRes.recordset.length === 0) {
      return res.status(400).json({ message: "Voucher không tồn tại hoặc không thuộc sở hữu của bạn" });
    }

    const voucher = voucherRes.recordset[0];

    if (voucher.IsUsed) {
      return res.status(400).json({ message: "Voucher này đã được sử dụng" });
    }

    if (voucher.EndDate && new Date(voucher.EndDate) < new Date()) {
      return res.status(400).json({ message: "Voucher này đã hết hạn" });
    }

    // Tính tiền giảm giá
    const discountPercent = Number(voucher.DiscountPercent || 0);
    const discount = (Number(booking.TotalPrice) * discountPercent) / 100;
    let finalPrice = Number(booking.TotalPrice) - discount;
    if (finalPrice < 0) finalPrice = 0;

    // Cập nhật booking
    await pool.request()
      .input("bookingId", sql.Int, bookingId)
      .input("memberPromoId", sql.Int, memberPromoId)
      .input("finalPrice", sql.Decimal(18, 2), finalPrice)
      .query(`
        UPDATE BOOKING 
        SET MemberPromoID = @memberPromoId, FinalPrice = @finalPrice 
        WHERE BookingID = @bookingId
      `);

    return res.json({
      message: "Áp dụng voucher thành công",
      FinalPrice: finalPrice,
      DiscountAmount: discount,
      MemberPromoID: memberPromoId
    });

  } catch (err) {
    console.error("Apply voucher error:", err);
    return res.status(500).json({ message: "Lỗi server khi áp dụng voucher: " + err.message });
  }
});

// 6. Khách hàng xóa vĩnh viễn booking (khi đã hoàn thành hoặc đã hủy) - Trọng thêm
router.delete("/:id", async (req, res) => {
  try {
    const bookingId = req.params.id;
    const pool = await poolPromise;

    // 1. Kiểm tra quyền sở hữu đơn hàng (nếu có token) - Trọng thêm
    const token = req.headers.authorization?.split(" ")[1];
    let customerId = null;

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
        if (decoded && decoded.role === "user") {
          customerId = decoded.userId;
        }
      } catch (err) {
        // Bỏ qua lỗi token trong dev
      }
    }

    // 2. Lấy thông tin đơn hàng để kiểm tra tính hợp lệ - Trọng thêm
    const bookingCheck = await pool
      .request()
      .input("id", sql.Int, bookingId)
      .query("SELECT CustomerID, Status FROM BOOKING WHERE BookingID = @id");

    if (bookingCheck.recordset.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy lịch đặt xe" });
    }

    const booking = bookingCheck.recordset[0];

    // 3. Nếu có customerId, kiểm tra xem đơn hàng có phải của user này không - Trọng thêm
    if (customerId && booking.CustomerID !== customerId) {
      return res.status(403).json({
        message: "Bạn không có quyền xóa lịch đặt xe của người khác!",
      });
    }

    // 4. Chỉ cho phép xóa nếu đơn hàng ở trạng thái Hoàn thành (4) hoặc Đã hủy (5) - Trọng thêm
    if (booking.Status !== 4 && booking.Status !== 5) {
      return res.status(400).json({
        message: "Chỉ có thể xóa lịch đặt xe đã hoàn thành hoặc đã hủy!",
      });
    }

    // 5. Thực hiện xóa trong transaction - Trọng thêm
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
      res.json({ message: "Xóa lịch đặt khỏi lịch sử thành công" });
    } catch (innerErr) {
      await transaction.rollback();
      throw innerErr;
    }
  } catch (err) {
    console.error("[delete booking error]", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// ADMIN ROUTES (Với quyền kiểm tra adminAuth - camelCase Casing)
// ==========================================

// 1. Lấy toàn bộ danh sách booking cho Admin (Có bộ lọc tìm kiếm)
router.get("/admin/all", adminAuth, async (req, res) => {
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
          servicesList: [],
        };
      }
      if (row.ServiceName) {
        bookingsMap[row.BookingID].servicesList.push(row.ServiceName);
      }
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

// 2. Chi tiết booking cho Admin
router.get("/admin/:id", adminAuth, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().input("id", sql.Int, req.params.id)
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
    const services = result.recordset.map((r) => r.ServiceName).filter(Boolean);
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
      servicePackage: services.join(", ") || "N/A",
    };
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Admin tạo đơn rửa xe trực tiếp
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
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("CustomerID", sql.Int, CustomerID)
      .input(
        "BookingDate",
        sql.DateTime,
        BookingDate ? new Date(BookingDate) : new Date(),
      )
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

    if (Array.isArray(ServiceIDs) && ServiceIDs.length > 0) {
      for (const serviceID of ServiceIDs) {
        await pool
          .request()
          .input("BookingID", sql.Int, newBookingID)
          .input("ServiceID", sql.Int, serviceID).query(`
                        INSERT INTO BOOKING_DETAIL (BookingID, ServiceID)
                        VALUES (@BookingID, @ServiceID)
                    `);
      }
    }
    res
      .status(201)
      .json({ message: "Tạo booking thành công", id: newBookingID });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Admin cập nhật trạng thái
router.put("/admin/:id/status", adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const statusInt = parseInt(status, 10);
    if (isNaN(statusInt) || statusInt < 1 || statusInt > 5) {
      return res
        .status(400)
        .json({ message: "Trạng thái không hợp lệ. Giá trị phải từ 1 đến 5." });
    }

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

// 5. Admin xóa vĩnh viễn booking (Tương tự route của User)
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

// 6. Thống kê dashboard Admin
router.get("/admin/dashboard/stats", adminAuth, async (req, res) => {
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
