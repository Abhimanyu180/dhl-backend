const express = require("express");
const { 
    sendOTP, 
    verifyOTP, 
    resendOTP, 
    getUserData
} = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/send-otp",sendOTP);
router.post("/verify-otp",verifyOTP);
router.post("/resend-otp",resendOTP);
router.get("/getUser-data",verifyToken,getUserData);

module.exports = router;