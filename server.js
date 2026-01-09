require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ================= BASIC CHECK =================
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET missing in .env");
  process.exit(1);
}

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ================= MONGODB =================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  });

// ================= MODELS =================
const User = mongoose.model(
  "User",
  new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
  })
);

const Message = mongoose.model(
  "Message",
  new mongoose.Schema({
    from: String,
    to: String, // null = group
    text: String,
    time: String,
  })
);

// ================= ONLINE USERS =================
const onlineUsers = new Map(); // socket.id -> username

// ================= SOCKET =================
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  // ---------- SIGNUP ----------
  socket.on("signup", async ({ user, pass }) => {
    try {
      if (!user || !pass) {
        socket.emit("signup-failed", "All fields required");
        return;
      }

      const exists = await User.findOne({ username: user });
      if (exists) {
        socket.emit("signup-failed", "Username already exists");
        return;
      }

      const hashed = await bcrypt.hash(pass, 10);
      await User.create({ username: user, password: hashed });

      socket.emit("signup-success", "Signup successful. Please login.");
      console.log("🆕 User created:", user);
    } catch (err) {
      console.error("❌ Signup error:", err);
      socket.emit("signup-failed", "Signup failed");
    }
  });

  // ---------- LOGIN ----------
  socket.on("login", async ({ user, pass }) => {
    try {
      if (!user || !pass) {
        socket.emit("login-failed", "All fields required");
        return;
      }

      const foundUser = await User.findOne({ username: user });
      if (!foundUser) {
        socket.emit("login-failed", "User not found");
        return;
      }

      const match = await bcrypt.compare(pass, foundUser.password);
      if (!match) {
        socket.emit("login-failed", "Wrong password");
        return;
      }

      const token = jwt.sign(
        { username: user },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      socket.username = user;
      onlineUsers.set(socket.id, user);

      socket.emit("login-success", { user, token });
      io.emit("online-users", Array.from(onlineUsers.values()));

      const history = await Message.find({ to: null }).sort({ _id: 1 });
      socket.emit("chat-history", history);

      console.log("✅ Login success:", user);
    } catch (err) {
      console.error("❌ Login error:", err);
      socket.emit("login-failed", "Server error");
    }
  });

  // ---------- GROUP CHAT ----------
  socket.on("group-message", async (text) => {
    if (!socket.username || !text) return;

    const msg = new Message({
      from: socket.username,
      to: null,
      text,
      time: new Date().toLocaleTimeString(),
    });

    await msg.save();
    io.emit("group-message", msg);
  });

  // ---------- PRIVATE CHAT ----------
  socket.on("private-message", async ({ to, text }) => {
    if (!socket.username || !to || !text) return;

    const msg = new Message({
      from: socket.username,
      to,
      text,
      time: new Date().toLocaleTimeString(),
    });

    await msg.save();

    for (const [id, name] of onlineUsers.entries()) {
      if (name === to) {
        io.to(id).emit("private-message", msg);
      }
    }

    socket.emit("private-message", msg);
  });

  // ---------- DISCONNECT ----------
  socket.on("disconnect", () => {
    if (socket.username) {
      onlineUsers.delete(socket.id);
      io.emit("online-users", Array.from(onlineUsers.values()));
      console.log("❌ Disconnected:", socket.username);
    }
  });
});

// ================= START =================
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port", PORT);
});
