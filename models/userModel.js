const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name:{
        type:String,
        default:null
    },
    photo:{
        type:String,
        default:null
    },
    role:{
        type:Number,              //1 for admin, 2 for member
        default:0
    },
    phone:{
        type:String,
        required:true,
        unique:true
    },
    otp:{
        type:Number,
    },
    otpExpiryTime:{
        type:Date
    },
    freeTrialStartDate:{
        type:Date,
        default:null,
    },
    freeTrialEndDate:{
        type:Date,
        default:null,
    },
    group : [{
        type: Schema.Types.ObjectId,
        ref: 'Group',
        default:null
    }],
    subscriptionPlan:{
        type:Schema.Types.ObjectId,
        ref:"SubscriptionPlan",
        default:null
    },
    subscription:{
        id:String,
        status:String
    },
    is_subscribed:{
        type:Boolean,
        default:false
    },
    isProfileSetupComplete:{
        type:Boolean,
        default:false
    },
    location: {
        type: {
          type: String, 
          enum: ["Point"], 
          default: "Point", 
        //   required: true,
        },
        coordinates: { 
            type: [Number],   //[longitude,latitude]
            default:[0,0],  
            // required: true 
        }, 
      },
      pendingGroupIds: [{
        type: Schema.Types.ObjectId,
        ref: 'Group',
        default: null
    }]
},{timestamps:true})

const groupSchema = new Schema({
    groupName:{
        type:String,
        required:true
    },
    members: [
        {
          user: {
            type: Schema.Types.ObjectId,
            ref: "User",
          },
          member_role:{
            type:Number,            //1 for admin, 2 for relative and 3 for friend
            default:null
          },
          invitationStatus: {
            type: Number,
            enum: [0, 1],          // 0 for Pending, 1 for Accepted
            default: 0,
          },
          invitationId:{
            type:String,
            default:null
          },
        },
    ],
    groupStatus: {
        type: Number,
        enum: [0, 1],             // 0 for Pending, 1 for Accepted
        default: 0,
    },
    inviter: {
        inviter_id: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        name: String,
        phone: String,
        photo: String,
    },
    messages: [
        {
          type: Schema.Types.ObjectId,
          ref: "Message",
        },
    ],
},{timestamps:true})


const User = mongoose.model("User",userSchema);
const Group = mongoose.model("Group",groupSchema);

module.exports = { User, Group };