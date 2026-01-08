require("dotenv").config(); // safe locally, ignored on Render

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
let Message = null;

if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("✅ MongoDB connected");

      const messageSchema = new mongoose.Schema({
        user: String,
        text: String,
        time: String,
      });

      Message = mongoose.model("Message", messageSchema);

      // 🔥 OPTIONAL: test insert (runs only once)
      Message.create({
        user: "system",
        text: "MongoDB test message",
        time: new Date().toISOString(),
      }).then(() => console.log("✅ Test message saved"));
    })
    .catch((err) => {
      console.error("❌ MongoDB error:", err.message);
    });
} else {
  console.warn("⚠️ MONGO_URI not set — running without database");
}

// ================= SOCKET =================
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("login", async (username) => {
    socket.username = username;

    if (Message) {
      const history = await Message.find().sort({ _id: 1 });
      socket.emit("chat history", history);
    }
  });

  socket.on("chat message", async (data) => {
    console.log("📩 Message received:", data);

    if (Message) {
      const msg = new Message({
        user: data.user,
        text: data.text,
        time: new Date().toISOString(),
      });
      await msg.save();
      io.emit("chat message", msg);
    } else {
      io.emit("chat message", data); // fallback if DB off
    }
  });
});

// ================= START =================
const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});

