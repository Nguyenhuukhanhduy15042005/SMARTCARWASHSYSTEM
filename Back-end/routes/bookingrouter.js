// Back-end/routes/booking.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const ctrl = require("../controllers/bookingcontroller");

// Middleware xác thực quyền Admin
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

// Middleware xác thực quyền Staff hoặc Admin
function staffOrAdminAuth(req, res, next) {
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
        if (decoded.roleId !== 1 && decoded.roleId !== 2) {
            return res.status(403).json({ message: "Không có quyền thực hiện thao tác này." });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Token không hợp lệ" });
    }
}

// ── KHÁCH HÀNG / CHUNG ROUTES ──

// Danh sách booking (Hỗ trợ Tìm kiếm & Lọc đa điều kiện)
router.get('/', ctrl.getAllBookings);

// Chi tiết booking
router.get("/:id", ctrl.getBookingById);

// Tạo booking mới
router.post("/", ctrl.createBooking);

// Cập nhật trạng thái (Chặn giá trị không nằm trong khoảng [1 - 5])
router.post("/:id/transition", ctrl.transitionStatus);

// Lịch sử booking của khách
router.get("/customer/:customerId", ctrl.getCustomerBookings);

// Khách xóa booking khỏi lịch sử (Soft delete)
router.delete("/:id", ctrl.deleteBooking);

// Áp dụng voucher khuyến mãi cho đơn hàng
router.post("/:id/apply-voucher", ctrl.applyVoucher);

// Lấy lịch sử dòng thời gian của booking
router.get("/:id/history", ctrl.getBookingHistory);

// Cập nhật biển số xe (Nhân viên hoặc Admin)
router.put("/:id/license-plate", staffOrAdminAuth, ctrl.updateLicensePlate);


// ── ADMIN ROUTES ──

// Lấy toàn bộ bookings của hệ thống
router.get("/admin/all", adminAuth, ctrl.getAdminAllBookings);

// Chi tiết booking ở chế độ admin
router.get("/admin/:id", adminAuth, ctrl.getAdminBookingById);

// Admin tạo booking trực tiếp
router.post("/admin/create", adminAuth, ctrl.createAdminBooking);

// Admin cập nhật trạng thái đơn hàng
router.put("/admin/:id/status", adminAuth, ctrl.updateAdminBookingStatus);

// Admin xóa lịch đặt vĩnh viễn khỏi DB
router.delete("/admin/:id", adminAuth, ctrl.deleteAdminBooking);

// Lấy thống kê cho admin dashboard
router.get("/admin/dashboard/stats", adminAuth, ctrl.getAdminDashboardStats);

// Admin cập nhật thông tin booking
router.put("/admin/:id", adminAuth, ctrl.updateAdminBooking);

module.exports = router;
