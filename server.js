const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// ================= MONGODB =================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    // 🔥 FORCE TEST INSERT (IMPORTANT)
    testInsert();
  })
  .catch((err) => console.error("❌ MongoDB error:", err));

const messageSchema = new mongoose.Schema({
  user: String,
  text: String,
  time: String,
});

const Message = mongoose.model("Message", messageSchema);

// 🔥 TEST INSERT FUNCTION
async function testInsert() {
  try {
    const testMsg = new Message({
      user: "system",
      text: "MongoDB test message",
      time: new Date().toISOString(),
    });

    await testMsg.save();
    console.log("✅ Test message saved to MongoDB");
  } catch (err) {
    console.error("❌ Test insert failed:", err);
  }
}

// ================= SOCKET =================
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("login", async (username) => {
    socket.username = username;

    const history = await Message.find().sort({ _id: 1 });
    socket.emit("chat history", history);
  });

  socket.on("chat message", async (data) => {
    console.log("📩 Message received:", data);

    const msg = new Message({
      user: data.user,
      text: data.text,
      time: new Date().toISOString(),
    });

    await msg.save();
    console.log("✅ Message saved");

    io.emit("chat message", msg);
  });
});

// ================= START =================
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
