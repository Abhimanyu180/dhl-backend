const mongoose = require("mongoose");

const subscriptionDetailsSchema = new mongoose.Schema({
    user_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    subscription_id:{
        type:String,
        required:false
    },
    subscription_schedule_id:{
        type:String,
        required:false
    },
    planId:{
        type:String,
        required:false
    }
},{timestamps:true})

const SubscriptionDetails = mongoose.model("SubscriptionDetails",subscriptionDetailsSchema);

module.exports = SubscriptionDetails;