const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// ✅ CREATE io HERE (THIS WAS MISSING)
const io = new Server(server);

// serve public folder
app.use(express.static(path.join(__dirname, "public")));

// SIMPLE IN-MEMORY USERS
const users = {
  ka: "123",
  raj: "123",
  admin: "admin"
};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // LOGIN HANDLER
  socket.on("login", ({ user, pass }) => {
    if (!users[user] || users[user] !== pass) {
      socket.emit("login error", "Invalid username or password");
      return;
    }

    socket.username = user;

    socket.emit("login success", user);

    socket.broadcast.emit("system message", {
      text: `${user} joined the chat`,
      time: new Date().toISOString()
    });
  });

  // CHAT MESSAGE
  socket.on("chat message", (data) => {
    data.time = new Date().toISOString();
    io.emit("chat message", data);
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    if (socket.username) {
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
