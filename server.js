const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// serve frontend
app.use(express.static(path.join(__dirname, "public")));

// 🔐 USERS (LOGIN CREDENTIALS)
const users = {
  ka: "123",
  raj: "123",
  admin: "admin"
};

// 👥 ACTIVE USERS (PREVENT DUPLICATES)
const activeUsers = new Set();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // 🔑 LOGIN
  socket.on("login", ({ user, pass }) => {
    if (!users[user] || users[user] !== pass) {
      socket.emit("login error", "Invalid username or password");
      return;
    }

    if (activeUsers.has(user)) {
      socket.emit("login error", "Username already in use");
      return;
    }

    socket.username = user;
    activeUsers.add(user);

    socket.emit("login success", user);

    socket.broadcast.emit("system message", {
      text: `${user} joined the chat`,
      time: new Date().toISOString()
    });

    console.log(`User logged in: ${user}`);
  });

  // 💬 CHAT MESSAGE
  socket.on("chat message", (data) => {
    data.time = new Date().toISOString();
    io.emit("chat message", data);
  });

  // 🚪 LOGOUT
  socket.on("logout", () => {
    if (socket.username) {
      activeUsers.delete(socket.username);

      socket.broadcast.emit("system message", {
        text: `${socket.username} left the chat`,
        time: new Date().toISOString()
      });

      console.log(`User logged out: ${socket.username}`);
      socket.username = null;
    }
  });

  // ❌ DISCONNECT (browser closed)
  socket.on("disconnect", () => {
    if (socket.username) {
      activeUsers.delete(socket.username);

      socket.broadcast.emit("system message", {
        text: `${socket.username} left the chat`,
        time: new Date().toISOString()
      });

      console.log(`User disconnected: ${socket.username}`);
    }
  });
});

// 🌍 DEPLOYMENT PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
