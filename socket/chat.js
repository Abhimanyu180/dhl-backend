// const { getSocketInstance } = require("../utils/socketUtils");
// const { User, Group } = require("../models/userModel");
// const {Message} = require("../models/messageModel");
// const { socketAuthMiddleware } = require("../middleware/socketAuthMiddleware");

// function initializeChat() {
//   const io = getSocketInstance();           // get the Socket.IO instance  
//   // console.log("WebSocket server is initialized");
 
//   const chat = io.of("/chat");

//   //applying the middlware
//   chat.use(socketAuthMiddleware);
//   chat.on("connection", (socket) => {
//     console.log("New connection established", socket.id);
//     const userId = socket.user.userId;
//     // console.log("UserId:",userId);

//     // Join group room
//     socket.on("joinGroup", async ({ user_id, group_id }) => {
//       try {
//         const group = await Group.findById(group_id);
//         const user_id = socket.userId;
//         console.log("userID:",user_id);
//         if (!group) {
//           return socket.emit("error", "Group not found");
//         }
//         const isMember = group.members.some(
//           (member) => member.user.toString() === user_id
//         );
//         if (!isMember) {
//           return socket.emit("error", "You are not a member of this group");
//         }
//         //fetching past messages of the group
//         const message = await Message.find({group_id}).sort({timestamp:1});   //sorting the messages in ascending order of timestamp
        
//         //sending the past message through previous message event
//         socket.emit("previousMessages",message);
//         console.log("Messages:",message);

//         // Join the group room
//         socket.join(group_id);
//         console.log(`User ${user_id} joined group ${group_id}`);
//         socket.emit("message", "Welcome to the group chat!");
//       } catch (error) {
//         console.error("Error joining group:", error);
//         socket.emit("error", "An error occurred");
//       }
//     });

//     // Sending message
//     socket.on("sendMessage", async({ group_id, user_id, message }) => {
//       if (!message.trim()) return; // Ignore empty messages

//       try {
//         const newMessage = new Message({
//           group_id,
//           user_id,
//           message,
//         });
//         await newMessage.save();
        
//         const group = await Group.findByIdAnd(group_id);
//         group.messages.push(newMessage._id);
//         await group.save();

//         io.to(group_id).emit("message", {
//           user_id,
//           message,
//           timestamp: new Date(),
//         });
//         console.log(`Message sent to group ${group_id}:`, message);
//       } catch (error) {
//         console.error("Error sending message:", error);
//         socket.emit("error", "An error occurred while sending the message.");
//       }
//     });
//     // Handle disconnection
//     socket.on("disconnect", () => {
//       console.log("A user disconnected:", socket.id);
//     });
//   });
// }

// // function initializeChat() {
// // const io = getSocketInstance();   // get the Socket.IO instance

// // const chat = io.of("/chat");

// // //apply the socketAuthMiddleware to the chat namespace
// // chat.use(socketAuthMiddleware);

// // chat.on("connection",(socket)=>{
// //   console.log("New connection established", socket.id);
// //   const userId = socket.user.userId;
// //   console.log("user connected has userId:",userId);

// //   // Join group room
// //      socket.on("joinGroup", async ({ group_id }) => {
// //        try {
// //          const group = await Group.findById(group_id);
// //          const user_id = socket.userId;
// //          if (!group) {
// //            return socket.emit("error", "Group not found");
// //          }
// //          const isMember = group.members.some(
// //            (member) => member.user.toString() === user_id
// //          );
// //          if (!isMember) {
// //            return socket.emit("error", "You are not a member of this group");
// //          }
// //          //fetching past messages of the group
// //          const message = await Message.find({group_id}).sort({timestamp:1});   //sorting the messages in ascending order of timestamp

// //          //sending the past message through previous message event
// //          socket.emit("previousMessages",message);

// //          // Join the group room
// //          socket.join(group_id);
// //          console.log(`User ${user_id} joined group ${group_id}`);
// //          socket.emit("message", "Welcome to the group chat!");
// //        } catch (error) {
// //          console.error("Error joining group:", error);
// //          socket.emit("error", "An error occurred");
// //        }
// //      });
// // })
// // }
// module.exports = initializeChat;


const { getSocketInstance } = require("../utils/socketUtils");
const { User, Group } = require("../models/userModel");
const { Message } = require("../models/messageModel");
const { socketAuthMiddleware } = require("../middleware/socketAuthMiddleware");

function initializeChat() {
  const io = getSocketInstance(); // Get the Socket.IO instance
  const chat = io.of("/chat");

  // Apply the middleware
  chat.use(socketAuthMiddleware);

  chat.on("connection", (socket) => {
    console.log("New connection established", socket.id);

    // Extract user details from middleware
    const userId = socket.user.userId;

    // Event: Join group
    socket.on("joinGroup", async ({ group_id }) => {
      try {
        const group = await Group.findById(group_id);

        if (!group) {
          return socket.emit("error", "Group not found");
        }
        const user = await User.findById(userId);
        const name = user.name;
        console.log("userId:",userId);
        // Check if the user is a member of the group
        const isMember = group.members.some(
          (member) => member.user.toString() === userId
        );

        if (!isMember) {
          return socket.emit("error", "You are not a member of this group");
        }

        // Fetch past messages of the group
        const messages = await Message.find({ group_id }).sort({ timestamp: 1 });

        // Send past messages to the user
        socket.emit("previousMessages", messages);

        // Join the group room
        socket.join(group_id);
        console.log(`User ${name} joined group ${group_id}`);

        // Notify the group of the new member
        chat.to(group_id).emit("systemMessage", {
          message: `User ${name} has joined the group.`,
        });

        socket.emit("message", {
          message: "Welcome to the group chat!",
          user: "System",
        });
      } catch (error) {
        console.error("Error joining group:", error);
        socket.emit("error", "An error occurred while joining the group.");
      }
    });

    // Event: Send message
    socket.on("sendMessage", async ({ group_id, message }) => {
      try {
        if (!message.trim()) return; // Ignore empty messages

        const group = await Group.findById(group_id);

        if (!group) {
          return socket.emit("error", "Group not found");
        }

        // Save the message to the database
        const newMessage = new Message({
          group_id,
          user_id: userId,
          message,
          timestamp: new Date(),
        });
        await newMessage.save();

        // Broadcast the message to the group
        chat.to(group_id).emit("message", {
          user: userId,
          message,
          timestamp: new Date(),
        });

        console.log(`Message sent to group ${group_id}: ${message}`);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", "An error occurred while sending the message.");
      }
    });

    // Event: Disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}

module.exports = initializeChat;
