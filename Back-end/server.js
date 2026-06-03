const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./db'); // Khởi tạo kết nối SQL Server ngay khi chạy ứng dụng

const app = express();
app.use(express.json());
app.use(cors());

// ========================================================
// IMPORT ROUTERS (Mỗi thành viên sẽ viết code ở file route riêng)
// ========================================================
const authRouter = require('./routes/auth');       // Thắng: Đăng ký / Đăng nhập
const userRouter = require('./routes/user');       // Duy: Quản lý Profile / Phân quyền
const vehicleRouter = require('./routes/vehicle'); // Thái: Quản lý phương tiện
const bookingRouter = require('./routes/booking'); // Trọng & Huy: Đặt lịch & Lịch sử & FSM
const timeslotRouter = require('./routes/timeslot'); //Thái: Booking TimeSlot

// ========================================================
// MOUNT ROUTERS 
// ========================================================
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/vehicles', vehicleRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/timeslots', timeslotRouter);

// Test Endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: "API Car Wash System hoạt động tốt!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
