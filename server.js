require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// ================== MONGODB ==================
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err.message));

// ================== SCHEMAS ==================
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String
});

const MessageSchema = new mongoose.Schema({
  from: String,
  to: { type: String, default: null }, // null = group
  text: String,
  seenBy: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);
const Message = mongoose.model("Message", MessageSchema);

// ================== ONLINE USERS ==================
const onlineUsers = {}; // username -> socket.id

// ================== SOCKET ==================
io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  // ---------- LOGIN ----------
  socket.on("login", async ({ user, pass }) => {
    const found = await User.findOne({ username: user });
    if (!found) return socket.emit("login-failed", "User not found");

    const ok = await bcrypt.compare(pass, found.password);
    if (!ok) return socket.emit("login-failed", "Wrong password");

    socket.username = user;
    onlineUsers[user] = socket.id;

    socket.emit("login-success", { user });
    io.emit("online-users", Object.keys(onlineUsers));

    const history = await Message.find().sort({ createdAt: 1 }).limit(100);
    socket.emit("chat-history", history);
  });

  // ---------- SIGNUP ----------
  socket.on("signup", async ({ user, pass }) => {
    const exists = await User.findOne({ username: user });
    if (exists) return socket.emit("signup-failed", "User already exists");

    const hash = await bcrypt.hash(pass, 10);
    await User.create({ username: user, password: hash });

    socket.emit("signup-success", "Signup successful");
  });

  // ---------- FORGOT PASSWORD ----------
  socket.on("forgot-password", async ({ user, newPass }) => {
    const found = await User.findOne({ username: user });
    if (!found) return socket.emit("forgot-failed", "User not found");

    const hash = await bcrypt.hash(newPass, 10);
    found.password = hash;
    await found.save();

    socket.emit("forgot-success", "Password updated");
  });

  // ---------- SEND MESSAGE ----------
  socket.on("send-message", async ({ text, mode, to }) => {
    if (!socket.username || !text) return;

    const msg = await Message.create({
      from: socket.username,
      to: mode === "private" ? to : null,
      text,
      seenBy: [socket.username]
    });

    if (mode === "private" && onlineUsers[to]) {
      socket.to(onlineUsers[to]).emit("receive-message", msg);
      socket.emit("receive-message", msg);
    } else {
      io.emit("receive-message", msg);
    }
  });

  // ---------- SEEN ----------
  socket.on("seen", async (id) => {
    const msg = await Message.findById(id);
    if (!msg || msg.seenBy.includes(socket.username)) return;

    msg.seenBy.push(socket.username);
    await msg.save();

    io.emit("message-seen", { id, seenBy: msg.seenBy });
  });

  // ---------- EDIT ----------
  socket.on("edit-message", async ({ id, newText }) => {
    const msg = await Message.findById(id);
    if (!msg || msg.from !== socket.username) return;

    msg.text = newText;
    await msg.save();

    io.emit("message-edited", { id, newText });
  });

  // ---------- DELETE ----------
  socket.on("delete-message", async (id) => {
    const msg = await Message.findById(id);
    if (!msg || msg.from !== socket.username) return;

    await Message.deleteOne({ _id: id });
    io.emit("message-deleted", id);
  });

  // ---------- TYPING ----------
  socket.on("typing", ({ mode, to }) => {
    if (mode === "private" && to && onlineUsers[to]) {
      socket.to(onlineUsers[to]).emit("show-typing", socket.username);
    } else {
      socket.broadcast.emit("show-typing", socket.username);
    }
  });

  socket.on("stop-typing", () => {
    socket.broadcast.emit("hide-typing");
  });

  // ---------- DISCONNECT ----------
  socket.on("disconnect", () => {
    if (socket.username) {
      delete onlineUsers[socket.username];
      io.emit("online-users", Object.keys(onlineUsers));
    }
  });
});

// ================== START ==================
server.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port", PORT);
});
