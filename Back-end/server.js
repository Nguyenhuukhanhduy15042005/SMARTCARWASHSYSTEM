const express = require("express");
const cors = require("cors");
const cron = require("node-cron"); // <-- THÊM THƯ VIỆN CRON TẠI ĐÂY
require("dotenv").config();
const { sql, poolPromise } = require("./db"); // <-- Đổi cách gọi db để có thể dùng poolPromise cho Cron Job

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
  }),
);

// IMPORT ROUTERS
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const vehicleRouter = require("./routes/vehicle");
const bookingRouter = require("./routes/booking");
const timeslotRouter = require("./routes/timeslot");
const paymentRouter = require("./routes/paymentRouter");
const promotionRouter = require("./routes/promotion");
const feedbackRouter = require("./routes/feedback");
const loyaltyRouter = require("./routes/loyalty");
const machineRouter = require("./routes/machine");
const analyticsRouter = require("./routes/analytics");

// MOUNT ROUTERS
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/vehicles", vehicleRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/timeslots", timeslotRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/promotions", promotionRouter);
app.use("/api/feedbacks", feedbackRouter);
app.use("/api/loyalty", loyaltyRouter);
app.use("/api/machines", machineRouter);
app.use("/api/analytics", analyticsRouter);

// Test Endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "API Car Wash System hoạt động tốt!" });
});

// ================================================================
// CRON JOB: TỰ ĐỘNG KHÓA MÁY VÀO NGÀY BẢO TRÌ
// Đang set chạy mỗi phút để bạn test (* * * * *).
// Khi đem dùng thật, hãy đổi thành: '1 0 * * *' (00:01 mỗi ngày)
// ================================================================
cron.schedule("* * * * *", async () => {
  console.log("[CRON] Đang quét lịch bảo trì máy hôm nay...");
  try {
    const pool = await poolPromise;
    // Tìm các máy có lịch bảo trì TRONG NGÀY HÔM NAY và khóa chúng lại (Status = 3)
    const result = await pool.request().query(`
      UPDATE MACHINE 
      SET Status = 3 
      WHERE MachineID IN (
        SELECT MachineID 
        FROM MAINTENANCE 
        WHERE CAST(MaintenanceDate AS DATE) = CAST(GETDATE() AS DATE)
      ) AND Status <> 3
    `);

    if (result.rowsAffected[0] > 0) {
      console.log(
        `[CRON] Đã tự động khóa ${result.rowsAffected[0]} máy đến hạn bảo trì.`,
      );
    } else {
      console.log("[CRON] Hôm nay không có máy nào cần khóa bảo trì.");
    }
  } catch (err) {
    console.error("[CRON] Lỗi khi chạy tự động khóa máy:", err.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
