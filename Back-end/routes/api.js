const express = require("express");
const router = express.Router();
const {
  getLoyaltyProfile,
  getLoyaltyTransactions,
} = require("../loyaltyController");

// Bật 2 cổng này lên để Frontend có chỗ mà gọi vào
router.get("/users/profile", getLoyaltyProfile);
router.get("/bookings", getLoyaltyTransactions);

module.exports = router;
