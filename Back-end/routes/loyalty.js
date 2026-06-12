const express = require("express");
const router = express.Router();
const {
  getLoyaltyProfile,
  getLoyaltyTransactions,
} = require("./loyaltyController");

router.get("/profile", getLoyaltyProfile);
router.get("/transactions", getLoyaltyTransactions);

module.exports = router;
