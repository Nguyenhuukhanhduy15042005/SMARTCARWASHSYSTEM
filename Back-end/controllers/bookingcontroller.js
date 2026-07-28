const service = require("../Services/bookingService");

// [GET] /api/bookings - Lấy danh sách booking theo bộ lọc (dành cho khách hàng hoặc nhân viên)
const getAllBookings = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const bookings = await service.getBookings(req.query, token);
        res.json(bookings);
    } catch (err) {
        console.error("GET /api/bookings filter error:", err);
        res.status(500).json({ message: err.message });
    }
};

// [GET] /api/bookings/:id - Lấy chi tiết thông tin một đơn đặt rửa xe theo BookingID
const getBookingById = async (req, res) => {
    try {
        const booking = await service.getBookingById(parseInt(req.params.id, 10));
        if (!booking) {
            return res.status(404).json({ message: "Không tìm thấy lịch đặt xe" });
        }
        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// [POST] /api/bookings - Tạo đơn đặt rửa xe mới (Tự động phân bổ máy rửa và áp dụng voucher nếu có)
const createBooking = async (req, res) => {
    try {
        const result = await service.createBooking(req.body);
        res.status(201).json({
            message: "Tạo booking thành công",
            ...result
        });
    } catch (err) {
        // Trả về lỗi 409 nếu trùng lịch/máy rửa bận, hoặc 400 nếu tham số sai
        const msg = err.message || "";
        if (msg.includes("đang bảo trì hoặc đã có lịch") || msg.includes("không có máy rửa")) {
            res.status(409).json({ message: msg });
        } else {
            res.status(400).json({ message: msg });
        }
    }
};

// [PATCH] /api/bookings/:id/status - Chuyển trạng thái đơn rửa xe (Pending -> Confirmed -> Washing -> Completed)
const transitionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { nextStatus } = req.body;
        await service.transitionStatus(id, nextStatus);
        res.json({
            message: `Cập nhật trạng thái thành công (Status: ${nextStatus})`,
        });
    } catch (err) {
        console.error("[transition error]", err.message);
        res.status(500).json({ message: err.message });
    }
};

// [GET] /api/bookings/customer/:customerId - Lấy lịch sử tất cả các đơn đặt xe của một khách hàng
const getCustomerBookings = async (req, res) => {
    try {
        const bookings = await service.getCustomerBookings(req.params.customerId);
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// [DELETE] /api/bookings/:id - Ẩn lịch đặt xe khỏi giao diện lịch sử cá nhân (Soft Delete)
const deleteBooking = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        await service.softDeleteBooking(parseInt(req.params.id, 10), token);
        res.json({ message: "Xóa lịch đặt khỏi lịch sử thành công" });
    } catch (err) {
        console.error("DELETE /api/bookings/:id error:", err);
        const msg = err.message || "";
        if (msg.includes("không có quyền") || msg.includes("hết hạn")) {
            res.status(403).json({ message: msg });
        } else if (msg.includes("Không tìm thấy")) {
            res.status(404).json({ message: msg });
        } else {
            res.status(400).json({ message: msg });
        }
    }
};

// [POST] /api/bookings/:id/apply-voucher - Áp dụng mã voucher giảm giá vào đơn đặt xe
const applyVoucher = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const result = await service.applyVoucher(
            parseInt(req.params.id, 10),
            req.body.memberPromoId,
            token
        );
        res.json(result);
    } catch (err) {
        console.error("apply-voucher error:", err);
        const msg = err.message || "";
        if (msg.includes("không có quyền") || msg.includes("hết hạn")) {
            res.status(403).json({ message: msg });
        } else if (msg.includes("Không tìm thấy")) {
            res.status(404).json({ message: msg });
        } else {
            res.status(400).json({ message: msg });
        }
    }
};

// [GET] /api/bookings/admin/all - Admin/Staff lấy toàn bộ danh sách booking trong hệ thống để quản lý
const getAdminAllBookings = async (req, res) => {
    try {
        const bookings = await service.getAdminAllBookings(req.query);
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// [GET] /api/bookings/admin/:id - Admin xem chi tiết đầy đủ thông tin đơn hàng
const getAdminBookingById = async (req, res) => {
    try {
        const booking = await service.getAdminBookingById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: "Không tìm thấy booking" });
        }
        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// [POST] /api/bookings/admin - Admin/Staff tạo đơn đặt rửa xe trực tiếp tại quầy cho khách
const createAdminBooking = async (req, res) => {
    try {
        const result = await service.createAdminBooking(req.body);
        res.status(201).json({
            message: "Tạo booking thành công",
            ...result
        });
    } catch (err) {
        const msg = err.message || "";
        if (msg.includes("không có máy rửa")) {
            res.status(409).json({ message: msg });
        } else {
            res.status(400).json({ message: msg });
        }
    }
};

// [PUT] /api/bookings/admin/:id/status - Admin/Staff cập nhật trạng thái đơn rửa xe
const updateAdminBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        await service.updateAdminBookingStatus(req.params.id, status);
        res.json({ message: "Cập nhật trạng thái thành công" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// [DELETE] /api/bookings/admin/:id - Admin xóa vĩnh viễn đơn đặt xe khỏi CSDL
const deleteAdminBooking = async (req, res) => {
    try {
        await service.deleteAdminBooking(req.params.id);
        res.json({ message: "Xóa lịch đặt khỏi CSDL thành công" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// [GET] /api/bookings/admin/dashboard/stats - Thống kê tổng quan đơn hàng và trạng thái máy cho Admin Dashboard
const getAdminDashboardStats = async (req, res) => {
    try {
        const stats = await service.getAdminDashboardStats();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// [GET] /api/bookings/:id/history - Xem lịch sử thay đổi trạng thái và nhật ký hoạt động (Audit Log) của đơn hàng
const getBookingHistory = async (req, res) => {
    try {
        const history = await service.getBookingHistory(req.params.id);
        res.json(history);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// [PUT] /api/bookings/:id/license-plate - Cập nhật biển số xe trước giờ rửa
const updateLicensePlate = async (req, res) => {
    try {
        const cleanPlate = await service.updateLicensePlate(
            parseInt(req.params.id, 10),
            req.body.licensePlate,
            req.user
        );
        res.json({
            message: "Cập nhật biển số xe thành công.",
            licensePlate: cleanPlate
        });
    } catch (err) {
        const msg = err.message || "";
        if (msg.includes("không có quyền") || msg.includes("chỉ được sửa")) {
            res.status(403).json({ message: msg });
        } else if (msg.includes("Không tìm thấy")) {
            res.status(404).json({ message: msg });
        } else {
            res.status(400).json({ message: msg });
        }
    }
};

// [PUT] /api/bookings/admin/:id - Admin/Staff chỉnh sửa toàn bộ thông tin đơn hàng (ngày giờ, dịch vụ, máy rửa)
const updateAdminBooking = async (req, res) => {
    try {
        await service.updateAdminBooking(parseInt(req.params.id, 10), req.body);
        res.json({ message: "Cập nhật lịch đặt thành công." });
    } catch (err) {
        const msg = err.message || "";
        if (msg.includes("đang bảo trì hoặc đã có lịch")) {
            res.status(409).json({ message: msg });
        } else if (msg.includes("Không tìm thấy")) {
            res.status(404).json({ message: msg });
        } else {
            res.status(400).json({ message: msg });
        }
    }
};

module.exports = {
    getAllBookings,
    getBookingById,
    createBooking,
    transitionStatus,
    getCustomerBookings,
    deleteBooking,
    applyVoucher,
    getAdminAllBookings,
    getAdminBookingById,
    createAdminBooking,
    updateAdminBookingStatus,
    deleteAdminBooking,
    getAdminDashboardStats,
    getBookingHistory,
    updateLicensePlate,
    updateAdminBooking,
};
