// bookingrouter.js

const router = require("express").Router();

const { adminAuth } = require("../auth");
const ctrl = require("./booking.controller");

// ======================================================
// Tất cả route đều yêu cầu ADMIN
// ======================================================
router.use(adminAuth);

// ======================================================
// Danh sách booking + filter
// GET /
// ======================================================
router.get("/", ctrl.getAllBookings);

// ======================================================
// Thống kê dashboard
// GET /stats
// ======================================================
router.get("/stats", ctrl.getStats);

// ======================================================
// Chi tiết booking
// GET /:id
// ======================================================
router.get("/:id", ctrl.getBookingById);

// ======================================================
// Tạo booking mới
// POST /
// ======================================================
router.post("/", ctrl.createBooking);

// ======================================================
// Cập nhật trạng thái booking
// PATCH /:id/status
// ======================================================
router.patch("/:id/status", ctrl.updateStatus);

// ======================================================
// Hủy booking
// DELETE /:id
// ======================================================
router.delete("/:id", ctrl.cancelBooking);

module.exports = router;
