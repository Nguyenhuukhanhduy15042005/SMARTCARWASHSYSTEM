// NhiemVu_Trong/Code_Moi/Back-end/test_booking.js
const express = require('express');
const { router, bookings, machines, usersLoyaltyPoints, schedulerInterval } = require('./bookingRouter');

const PORT = 5002; // Dùng port riêng để tránh trùng lắp
const BASE_URL = `http://localhost:${PORT}/api`;

const app = express();
app.use(express.json());
app.use(router);

let server;

function startServer() {
  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`[Test Mock Server] Started at ${BASE_URL}`);
      resolve();
    });
  });
}

function stopServer() {
  if (server) {
    console.log("[Test Mock Server] Stopping...");
    clearInterval(schedulerInterval);
    server.close();
  }
}

async function runTests() {
  try {
    // 1. Tạo booking mới (Trạng thái Pending)
    console.log("\n--- Test 1: Tạo booking mới (Pending) ---");
    const createRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: "Lê Minh Huy",
        customerPhone: "0987654321",
        vehicleType: "BIKE",
        servicePackage: "Rửa bọt tuyết (Snow Wash)",
        price: 50000,
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2h tới
      })
    });
    
    if (!createRes.ok) throw new Error("Failed to create booking");
    const booking = await createRes.json();
    console.log(`✓ Booking created successfully. ID: ${booking.id}, Status: ${booking.status}`);
    if (booking.status !== 'Pending') throw new Error("Initial status is not Pending");

    // 2. Kiểm tra chặn chuyển đổi trạng thái không hợp lệ (Pending -> Completed)
    console.log("\n--- Test 2: Chặn chuyển trạng thái không hợp lệ (Pending -> Completed) ---");
    const invalidRes = await fetch(`${BASE_URL}/bookings/${booking.id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'complete',
        note: 'Cố ý kết thúc rửa xe trái quy trình'
      })
    });
    
    console.log(`HTTP Status code: ${invalidRes.status}`);
    if (invalidRes.status === 400) {
      const errData = await invalidRes.json();
      console.log(`✓ Successfully blocked invalid transition. Error message: "${errData.message}"`);
    } else {
      throw new Error("Invalid transition should have returned 400 Bad Request");
    }

    // 3. Chuyển đổi trạng thái qua các bước hợp lệ
    console.log("\n--- Test 3: Chu trình chuyển trạng thái hợp lệ ---");
    
    // Bước a: Pending -> Confirmed (Thanh toán)
    console.log("a. Chuyển sang Confirmed (Thanh toán)...");
    const payRes = await fetch(`${BASE_URL}/bookings/${booking.id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pay', note: 'Khách hàng thanh toán qua ATM' })
    });
    const bookingPaid = await payRes.json();
    console.log(`Status now: ${bookingPaid.status}, Payment: ${bookingPaid.paymentStatus}`);
    if (bookingPaid.status !== 'Confirmed' || bookingPaid.paymentStatus !== 'Paid') {
      throw new Error("Transition to Confirmed failed");
    }

    // Bước b: Confirmed -> In Service (Check-in)
    console.log("b. Chuyển sang In Service (Khách check-in)...");
    const checkinRes = await fetch(`${BASE_URL}/bookings/${booking.id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checkin', note: 'Khách check-in trực tiếp' })
    });
    const bookingInService = await checkinRes.json();
    console.log(`Status now: ${bookingInService.status}`);
    if (bookingInService.status !== 'In Service') {
      throw new Error("Transition to In Service failed");
    }

    // Bước c: In Service -> Completed (Hoàn thành rửa xe, tích điểm)
    console.log("c. Chuyển sang Completed (Rửa xe xong, tích điểm)...");
    const completeRes = await fetch(`${BASE_URL}/bookings/${booking.id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', note: 'Máy rửa hoàn tất chu trình' })
    });
    const bookingCompleted = await completeRes.json();
    console.log(`Status now: ${bookingCompleted.status}`);
    console.log(`Points earned: ${bookingCompleted.loyaltyPointsEarned} points`);
    if (bookingCompleted.status !== 'Completed' || bookingCompleted.loyaltyPointsEarned !== 5) {
      throw new Error("Transition to Completed failed or loyalty points calculated incorrectly");
    }

    console.log("\n==================================");
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("==================================");
  } catch (error) {
    console.error("❌ TEST RUN FAILED:", error.message);
    process.exitCode = 1;
  }
}

async function main() {
  try {
    await startServer();
    await runTests();
  } catch (err) {
    console.error("Initialization error:", err);
  } finally {
    stopServer();
  }
}

main();
