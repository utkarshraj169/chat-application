const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// 🧑 USERS DATABASE (IN-MEMORY)
const users = {
  ka: "123",
  raj: "123",
  admin: "admin"
};

// 👥 ACTIVE USERS
const activeUsers = new Set();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // 📝 SIGNUP
  socket.on("signup", ({ user, pass }) => {
    if (!user || !pass) {
      socket.emit("signup error", "Username and password required");
      return;
    }

    if (users[user]) {
      socket.emit("signup error", "Username already exists");
      return;
    }

    users[user] = pass;
    socket.emit("signup success", "Signup successful! Please login.");

    console.log(`New user signed up: ${user}`);
  });

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
  });

  // 💬 CHAT
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

      socket.username = null;
    }
  });

  // ❌ DISCONNECT
  socket.on("disconnect", () => {
    if (socket.username) {
      activeUsers.delete(socket.username);

      socket.broadcast.emit("system message", {
        text: `${socket.username} left the chat`,
        time: new Date().toISOString()
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
