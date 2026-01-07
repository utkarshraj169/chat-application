const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// ================= USERS & STATE =================

// username -> hashedPassword
const users = {
  ka: bcrypt.hashSync("123", 10),
  raj: bcrypt.hashSync("123", 10),
  admin: bcrypt.hashSync("admin", 10),
};

// online usernames
const activeUsers = new Set();

// username -> socketId (for private chat)
const userSockets = {};

// resetToken -> username
const resetTokens = {};

// ================= SOCKET =================

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // -------- SIGNUP --------
  socket.on("signup", async ({ user, pass }) => {
    if (!user || !pass) {
      socket.emit("signup error", "Username & password required");
      return;
    }
    if (users[user]) {
      socket.emit("signup error", "Username already exists");
      return;
    }
    users[user] = await bcrypt.hash(pass, 10);
    socket.emit("signup success", "Signup successful! Please login.");
  });

  // -------- LOGIN --------
  socket.on("login", async ({ user, pass }) => {
    if (!users[user]) {
      socket.emit("login error", "Invalid credentials");
      return;
    }

    const ok = await bcrypt.compare(pass, users[user]);
    if (!ok) {
      socket.emit("login error", "Invalid credentials");
      return;
    }

    if (activeUsers.has(user)) {
      socket.emit("login error", "User already online");
      return;
    }

    socket.username = user;
    activeUsers.add(user);
    userSockets[user] = socket.id;

    socket.emit("login success", user);
    io.emit("online users", Array.from(activeUsers));

    socket.broadcast.emit("system message", {
      text: `${user} joined the chat`,
      time: new Date().toISOString(),
    });
  });

  // -------- PUBLIC CHAT --------
  socket.on("chat message", (data) => {
    data.time = new Date().toISOString();
    io.emit("chat message", data);
  });

  // -------- PRIVATE CHAT --------
  socket.on("private message", ({ to, from, text }) => {
    const targetId = userSockets[to];
    if (targetId) {
      io.to(targetId).emit("private message", {
        from,
        text,
        time: new Date().toISOString(),
      });
    }
  });

  // -------- LOGOUT --------
  socket.on("logout", () => {
    if (socket.username) {
      activeUsers.delete(socket.username);
      delete userSockets[socket.username];

      io.emit("online users", Array.from(activeUsers));
      socket.broadcast.emit("system message", {
        text: `${socket.username} left the chat`,
        time: new Date().toISOString(),
      });

      socket.username = null;
    }
  });

  // -------- FORGOT PASSWORD --------
  socket.on("forgot password", (user) => {
    if (!users[user]) {
      socket.emit("forgot error", "User not found");
      return;
    }
    const token = Math.random().toString(36).substring(2, 8);
    resetTokens[token] = user;
    socket.emit("reset token", token); // demo: shown on screen
  });

  socket.on("reset password", async ({ token, newPass }) => {
    const user = resetTokens[token];
    if (!user) {
      socket.emit("reset error", "Invalid token");
      return;
    }
    users[user] = await bcrypt.hash(newPass, 10);
    delete resetTokens[token];
    socket.emit("reset success", "Password reset successful");
  });

  // -------- DISCONNECT --------
  socket.on("disconnect", () => {
    if (socket.username) {
      activeUsers.delete(socket.username);
      delete userSockets[socket.username];
      io.emit("online users", Array.from(activeUsers));
      socket.broadcast.emit("system message", {
        text: `${socket.username} left the chat`,
        time: new Date().toISOString(),
      });
    }
  });
});

// ================= START =================
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
