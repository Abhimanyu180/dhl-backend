const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema({
    user:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],
    name:{        
        type:String,           
        required:true
    },
    plan_id:{
        type:String,
        required:true
    },
    trialDays:{
        type:Number,
        required:true
    },
    have_trial:{
        type:Boolean,
        default:false
    },
    maxGroup:{
        type:Number,
        required:true
    },
    maxMember:{
        type:Number,
        required:true
    },
    pricePerMonth:{
        type:Number,
        required:true
    },
},{timestamps:true})

const SubscriptionPlan = mongoose.model("SubscriptionPlan",subscriptionPlanSchema);

module.exports = SubscriptionPlan