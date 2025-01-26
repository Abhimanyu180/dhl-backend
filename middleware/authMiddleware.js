const jwt = require("jsonwebtoken")
const { User } = require("../models/userModel")

exports.verifyToken = (req, res, next) => {
  const token = req.header("Authorization")

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" })
  }
}

exports.isRegistered = async(req,res,next) =>{
  const token = req.header("Authorization")

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" })
  }
    try {
      const userId = req.user.userId;
      // console.log("UserId:-",userId);
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.isProfileSetupComplete === true) {
        return res.status(200).json({ message: "Profile already created" });
      }
      next();
    } catch (error) {
      console.error("Error in isRegistered middleware:", error);
      res.status(400).json({ message: "Token is not valid", error });
    }
}

exports.isSubscribed = async(req,res,next)=>{
  const token = req.header("Authorization")

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" })
  }

  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    //checking if the freetrial end has ended or not
    const currentDate = new Date();
    const trialExpired = currentDate > user.freeTrialEndDate ;

    if(user.is_subscribed === false && trialExpired){
      return res.status(400).json({ message: "Your Free trial has expired ,You have to subscribe to chat now" });
    }
    next();
  } catch (error) {
    return res.json(error.message);
  }
}