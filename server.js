const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// 🟢 CHAT HISTORY ARRAY
let chatHistory = [];

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // SEND OLD MESSAGES TO NEW USER
  socket.emit("chat history", chatHistory);

  socket.on("join", (username) => {
    socket.username = username;

    const msg = {
      text: `${username} joined the chat`,
      time: new Date().toISOString(),
      system: true
    };

    chatHistory.push(msg);
    socket.broadcast.emit("system message", msg);
  });

  socket.on("chat message", (data) => {
    data.time = new Date().toISOString();
    data.system = false;

    // SAVE MESSAGE
    chatHistory.push(data);

    io.emit("chat message", data);
  });

  socket.on("disconnect", () => {
    if (socket.username) {
      const msg = {
        text: `${socket.username} left the chat`,
        time: new Date().toISOString(),
        system: true
      };

      chatHistory.push(msg);
      socket.broadcast.emit("system message", msg);
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

