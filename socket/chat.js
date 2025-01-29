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
