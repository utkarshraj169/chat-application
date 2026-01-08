const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ================= STATIC FILES =================
app.use(express.static(path.join(__dirname, "public")));

// ================= MONGODB =================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// Message schema
const messageSchema = new mongoose.Schema({
  user: String,
  text: String,
  time: String,
});

const Message = mongoose.model("Message", messageSchema);

// ================= USERS =================
const onlineUsers = new Set();

// ================= SOCKET =================
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // LOGIN
  socket.on("login", async (username) => {
    socket.username = username;
    onlineUsers.add(username);

    io.emit("online users", Array.from(onlineUsers));

    // 🔥 SEND CHAT HISTORY
    const history = await Message.find().sort({ _id: 1 });
    socket.emit("chat history", history);
  });

  // GROUP CHAT MESSAGE
  socket.on("chat message", async (data) => {
    const msg = new Message({
      user: data.user,
      text: data.text,
      time: new Date().toISOString(),
    });

    await msg.save(); // 👈 THIS CREATES chatdb + messages
    io.emit("chat message", msg);
  });

  // LOGOUT / DISCONNECT
  socket.on("disconnect", () => {
    if (socket.username) {
      onlineUsers.delete(socket.username);
      io.emit("online users", Array.from(onlineUsers));
    }
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
