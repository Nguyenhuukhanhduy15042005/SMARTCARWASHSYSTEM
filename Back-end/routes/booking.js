// Back-end/routes/booking.js
// NHIỆM VỤ CỦA TRỌNG & HUY (Task 6, 7) VÀ THẮNG (Task 5)
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
// const controller = require('../src/modules/booking/bookingcontroller');

// THẮNG (Task 5): Tạo lịch đặt xe mới
router.post('/', async (req, res) => {
    try {
        res.status(201).json({ message: "Placeholder: Tạo booking thành công" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// TRỌNG & HUY (Task 6): Chuyển đổi trạng thái FSM (Pending -> Confirmed -> In Service -> Completed -> Cancelled)
router.post('/:id/transition', async (req, res) => {
    try {
        res.json({ message: "Placeholder: Chuyển trạng thái thành công" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// TRỌNG (Task 7): Xem lịch sử booking
router.get('/', async (req, res) => {
    try {
        res.json([]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// TRỌNG (Task 7): Chi tiết lịch đặt xe
router.get('/:id', async (req, res) => {
    try {
        res.json({ message: "Placeholder: Chi tiết booking" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// HUY ------------------ Booking for Admin ---------------
// const { adminAuth } = require('./auth'); // Disabled to avoid collision with local function adminAuth declaration
// const ctrl = require('../src/modules/booking/booking.controller'); // Disabled as files do not exist yet
// const jwt = require('jsonwebtoken'); // Disabled as already declared at the top of the file

// Mock bookingService to prevent ReferenceError when routes are accessed
const bookingService = {
  getAllBookings: async (filters) => {
    return [
      { id: 1, customerName: "Nguyễn Văn A", vehicleType: "SUV", licensePlate: "30A-12345", status: 1, date: "2026-06-03" },
      { id: 2, customerName: "Trần Thị B", vehicleType: "Sedan", licensePlate: "29C-54321", status: 2, date: "2026-06-03" }
    ];
  },
  getBookingById: async (id) => {
    return { id, customerName: "Nguyễn Văn A", vehicleType: "SUV", licensePlate: "30A-12345", status: 1, date: "2026-06-03" };
  },
  createBooking: async (data) => {
    return { id: 99, ...data };
  },
  updateBookingStatus: async (id, status) => {
    return { id, status };
  },
  cancelBooking: async (id) => {
    return { id, status: 5 }; // 5 for Cancelled
  },
  getBookingStats: async () => {
    return { total: 2, pending: 1, active: 1, completed: 0, cancelled: 0 };
  }
};

// Middleware kiểm tra ADMIN
function adminAuth(req, res, next) {

const token = req.headers.authorization?.split(' ')[1];

if (!token) {
    return res.status(401).json({
        message: 'Không có token'
    });
}

try {

    const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
    );

    // roleId = 1 là ADMIN
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

// ===============================
// ADMIN - Lấy toàn bộ booking
// ===============================
router.get('/admin/all', adminAuth, async (req, res) => {

try {

    const result = await bookingService.getAllBookings({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        status: req.query.status,
        vehicleType: req.query.vehicleType,
        search: req.query.search,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
    });

    res.json(result);

} catch (err) {

    res.status(500).json({
        message: err.message
    });

}

});

// ===============================
// ADMIN - Chi tiết booking
// ===============================
router.get('/admin/', adminAuth, async (req, res) => {

try {

    const booking = await bookingService.getBookingById(
        req.params.id
    );

    if (!booking) {
        return res.status(404).json({
            message: 'Không tìm thấy booking'
        });
    }

    res.json(booking);

} catch (err) {

    res.status(500).json({
        message: err.message
    });

}

});

// ===============================
// ADMIN - Tạo booking
// ===============================
router.post('/admin/create', adminAuth, async (req, res) => {

try {

    const result = await bookingService.createBooking(
        req.body
    );

    res.status(201).json({
        message: 'Tạo booking thành công',
        data: result
    });

} catch (err) {

    res.status(500).json({
        message: err.message
    });

}

});

// ===============================
// ADMIN - Cập nhật trạng thái
// ===============================
router.put('/admin/:id/status', adminAuth, async (req, res) => {

try {

    const result = await bookingService.updateBookingStatus(
        req.params.id,
        req.body.status
    );

    res.json({
        message: 'Cập nhật trạng thái thành công',
        data: result
    });

} catch (err) {

    res.status(500).json({
        message: err.message
    });

}

});

// ===============================
// ADMIN - Hủy booking
// ===============================
router.delete('/admin/', adminAuth, async (req, res) => {

try {

    const result = await bookingService.cancelBooking(
        req.params.id
    );

    res.json({
        message: 'Hủy booking thành công',
        data: result
    });

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

    const stats = await bookingService.getBookingStats();

    res.json(stats);

} catch (err) {

    res.status(500).json({
        message: err.message
    });

}

});


module.exports = router;
