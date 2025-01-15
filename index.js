const express = require('express');
const cors = require("cors");
const http = require("http");  
const connectDb = require('./config/db');
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const authRoutes = require("./routes/authRoute");
const userRoutes = require("./routes/userRoute");
const subscriptionRoutes = require("./routes/subscriptionRoute");
const { initSocket } = require('./utils/socketUtils');
const initializeChat = require("./socket/chat");

dotenv.config();

//connect to DB
connectDb();

const app = express();
const server = http.createServer(app);

//Initialize WebSocket
const io = initSocket(server);

// Initialize Chat WebSocket Logic
initializeChat();

app.use(cors())
app.use(bodyParser.json())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).send("something broke!")
})

//route setup
app.use("/auth",authRoutes);
app.use("/api",userRoutes);
app.use("/api",subscriptionRoutes);

app.get("/",(req,res)=>{
    res.send("hii from backend");
})

const PORT = process.env.PORT || 8081

server.listen(PORT,()=>{
    console.log(`server is running at port ${PORT}`);
})