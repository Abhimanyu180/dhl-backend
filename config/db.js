const mongoose = require("mongoose");

const connectDb = async() =>{
    try {
        const connection = await mongoose.connect(process.env.MONGODB_URL);
        console.log("Database connected successfully");
    } catch (error) {
        console.error("Database connection failed:", error.message);
        process.exit(1);
    }
}

module.exports = connectDb;