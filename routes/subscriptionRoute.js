const express = require("express");
const { 
    addPlan,
    getAllPlans,
    createSubscription,
    paymentVerification,
    getRazorPayKey,
    cancelSubscription,
    subscriptionStatus
} = require("../controllers/subscriptionController");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/addPlan",addPlan);
router.get("/getPlans",getAllPlans);
router.post("/createSubscription",verifyToken,createSubscription);
router.post("/verifyPayment",verifyToken,paymentVerification);
router.get("/razorpayKey",getRazorPayKey);
router.get("/subscription-status",verifyToken,subscriptionStatus);
router.delete("/cancel-subscription",cancelSubscription);

module.exports = router;