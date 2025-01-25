const {User} = require("../models/userModel");
// const sendSMS = require("../services/sendSMS");
const jwt = require("jsonwebtoken");
const axios = require("axios");
// const twilio = require("twilio");
const crypto = require("crypto");
const { group } = require("console");
const { route } = require("../routes/authRoute");
// const Numbers = require("twilio/lib/rest/Numbers");

exports.sendOTP = async (req, res) => {
  const { phone } = req.body;        // Phone number format (e.g., '7488957789')
  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  // Function to generate OTP
  function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
  }

  // Generate a new OTP and expiration time
  const otp = generateOTP();
  const expiration = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

  try {
    // Sending OTP via Fast2SMS
    const apiKey = process.env.FAST2SMS_API_KEY;
    // console.log("API Key:", apiKey);

    const message = `Your OTP for login into our application is ${otp}. Please don't share it with anyone.`;

    // Prepare SMS data
    const smsData = {
      message: message,
      language: "english",
      route: "q",
      numbers: phone,
    };

    // Sending OTP using Fast2SMS API
    await axios.post("https://www.fast2sms.com/dev/bulkV2", smsData, {
      headers: {
        Authorization: apiKey,
      },
    });

    // Check if the user already exists in the database
    let user = await User.findOne({ phone });

    if (user) {
      // If the user exists, update the OTP and expiry time
      user.otp = otp;
      user.otpExpiryTime = expiration;
      user.freeTrialStartDate = Date.now();
      user.freeTrialEndDate = new Date(
      user.freeTrialStartDate + 30 * 24 * 60 * 60 * 1000
      );
      await user.save();
    } else {
      // If the user does not exist, create a new user with the OTP
      const freeTrialStartDate = Date.now();
      const freeTrialEndDate = new Date(
        freeTrialStartDate + 30 * 24 * 60 * 60 * 1000
      );

      user = new User({
        phone,
        otp,
        otpExpiryTime: expiration,
        freeTrialStartDate,
        freeTrialEndDate,
      });
      await user.save();
    }

    // Respond with success
    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      user: {
        phone: user.phone,
        // otp:user.otp,
        // otpExpiryTime: user.otpExpiryTime,
      },
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ 
      success: false, 
     message:`failed ${error.message}`
    });
  }
};


exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res
        .status(400)
        .json({ message: "Mobile number and OTP are required" });
    }
    //finding user
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // console.log("user:",user);
    //verifying otp
    if (user.otp != otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }
    //checking if otp has expired or not
    const currentTime = Date.now();
    if (user.otpExpiryTime < currentTime) {
      return res
        .status(400)
        .json({ message: "OTP has expired. Please request a new one." });
    }
    //clear otp and expiry time after verifying successfully
    user.otp = null;
    user.otpExpiryTime = null;

    //checking free trail start date is there or not
    if(user.freeTrialStartDate === null || user.freeTrialEndDate === null){
        user.freeTrialStartDate = Date.now();
        user.freeTrialEndDate = user.freeTrialStartDate + 30 * 24 * 60 * 60 * 1000; 
    }
    
    await user.save();

    //generate JWT token
    const tokenPayload = { userId: user._id, phone: user.phone};
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      // {
      //   expiresIn: "24h"
      // } 
    )

    
    res.status(200).json({
      message: "OTP verified successfully",
      token, 
      user:{
        userId:user._id,
        phone:user.phone,
      },
      pendingGroupIds:user.pendingGroupIds,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    //finding user from database
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

  // Function to generate OTP
  function generateOTP() {
    return crypto.randomInt(1000, 9999).toString();
  }
   // Generate a new OTP and expiration time
   const otp = generateOTP();
  //  console.log("otp:",otp);
   const expiration = new Date(Date.now() + 5 * 60 * 1000);

    //updating user with new otp and expiry time
    // user.otp = otp;
    // user.otpExpiryTime = expiration;

    // await user.save();

    const apiKey = process.env.FAST2SMS_API_KEY;
    const message = `Your OTP for login into our application is ${otp}. Please don't share it with anyone.`;

    // Prepare SMS data
    const smsData = {
      message: message,
      language: "english",
      route: "q",
      numbers: phone,
    };

    // Sending OTP using Fast2SMS API
    await axios.post("https://www.fast2sms.com/dev/bulkV2", smsData, {
      headers: {
        Authorization: apiKey,
      },
    });
    user.otp = otp;
    user.otpExpiryTime = expiration;

    await user.save();
    // Sending OTP via Twilio 
  //   const message = await twilioClient.messages.create({
  //     body: `Your OTP is ${otp}`,
  //     from: '+1 608 691 6800',           // Twilio phone number
  //     to: phone,
  // });

  res.status(200).json({
    success: true,
    message: "OTP sent successfully",
    user: {
      phone: user.phone,
      // otp:user.otp,
      // otpExpiryTime: user.otpExpiryTime,
    },
  });
  } catch (error) {
    console.error("Error resending OTP:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getUserData = async(req,res) =>{
  try {
    // const { phone } = req.body;
    const userId = req.user.userId;
    // console.log("UserID:",userId);
    // if (!phone) {
    //   return res.status(400).json({ message: "Mobile number is required" });
    // }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message:"user data fetched successfully",
      data:user.toObject(),
    });
  } catch (error) {
    console.log("Error fetching user data:",error.message);
    return res.status(500).json(error.message);
  }
};

