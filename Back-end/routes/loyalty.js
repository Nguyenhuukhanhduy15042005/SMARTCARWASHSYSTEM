const express = require("express");
const router = express.Router();

const {
  getLoyaltyProfile,
  getLoyaltyTransactions,
  handleRedeem,
  getMyVouchers,
} = require("./loyaltyController");

router.get("/profile", getLoyaltyProfile);
router.get("/transactions", getLoyaltyTransactions);
router.post("/redeem", handleRedeem);
router.get("/my-vouchers", getMyVouchers);
module.exports = router;
