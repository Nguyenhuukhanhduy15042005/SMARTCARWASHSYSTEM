const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./db");

// [FIX] Kiểm tra JWT_SECRET bắt buộc phải có trong .env
if (!process.env.JWT_SECRET) {
  console.error("FATAL: Thiếu JWT_SECRET trong file .env. Dừng server.");
  process.exit(1);
}

const app = express();
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// IMPORT ROUTERS
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const vehicleRouter = require('./routes/vehicle');
const bookingRouter = require('./routes/booking');
const timeslotRouter = require('./routes/timeslot');
const feedbackRouter = require('./routes/feedback');
const promotionRouter = require('./routes/promotion');

// MOUNT ROUTERS
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/vehicles', vehicleRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/timeslots', timeslotRouter);
app.use('/api/feedbacks', feedbackRouter);
app.use('/api/promotions', promotionRouter);
// Test Endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "API Car Wash System hoạt động tốt!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});

require('dotenv').config();
