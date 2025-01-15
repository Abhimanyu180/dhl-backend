const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    group_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Group",
        required:true
    },
    user_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    message: {
        type: String,
        default:null
    },
    timestamp: {
        type: Date,
        default: Date.now
      }
});

const Message = mongoose.model("Message",messageSchema);

module.exports = { Message };