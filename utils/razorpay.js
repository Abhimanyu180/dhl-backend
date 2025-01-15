const razorpay = require("razorpay");

require("dotenv").config();

//creating razorpay instance
const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

module.exports = {razorpayInstance};