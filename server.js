require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// ================= MONGODB =================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// ================= MODELS =================
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  resetToken: String,
});

const messageSchema = new mongoose.Schema({
  user: String,
  text: String,
  time: String,
});

const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);

// ================= SOCKET =================
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // LOGIN
  socket.on("login", async ({ user, pass }) => {
    const found = await User.findOne({ username: user });
    if (!found) {
      socket.emit("login-error", "User not found");
      return;
    }

    const ok = await bcrypt.compare(pass, found.password);
    if (!ok) {
      socket.emit("login-error", "Wrong password");
      return;
    }

    socket.username = user;
    socket.emit("login-success", user);

    const history = await Message.find().sort({ _id: 1 });
    socket.emit("chat-history", history);
  });

  // SIGNUP
  socket.on("signup", async ({ user, pass }) => {
    const exists = await User.findOne({ username: user });
    if (exists) {
      socket.emit("signup-error", "User already exists");
      return;
    }

    const hash = await bcrypt.hash(pass, 10);
    await User.create({ username: user, password: hash });
    socket.emit("signup-success");
  });

  // FORGOT PASSWORD
  socket.on("forgot", async (user) => {
    const found = await User.findOne({ username: user });
    if (!found) {
      socket.emit("forgot-msg", "User not found");
      return;
    }

    const token = Math.random().toString(36).slice(2, 8);
    found.resetToken = token;
    await found.save();

    socket.emit("forgot-msg", "Reset token: " + token);
  });

  socket.on("reset-pass", async ({ user, token, pass }) => {
    const found = await User.findOne({ username: user, resetToken: token });
    if (!found) {
      socket.emit("forgot-msg", "Invalid token");
      return;
    }

    found.password = await bcrypt.hash(pass, 10);
    found.resetToken = "";
    await found.save();

    socket.emit("forgot-msg", "Password reset successful");
  });

  // CHAT MESSAGE
  socket.on("chat-message", async (data) => {
    const msg = new Message({
      user: socket.username,
      text: data,
      time: new Date().toLocaleTimeString(),
    });

    await msg.save();
    io.emit("chat-message", msg);
  });
});

// ================= START =================
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () =>
  console.log("Server running on port", PORT)
);
