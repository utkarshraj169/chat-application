require("dotenv").config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

/* DATABASE */

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.log("❌ MongoDB Error:", err.message));

/* USER MODEL */

const User = mongoose.model("User", new mongoose.Schema({
  username: {
    type: String,
    unique: true
  },
  password: String
}));

/* MESSAGE MODEL */

const Message = mongoose.model("Message", new mongoose.Schema({
  from: String,
  text: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}));

const onlineUsers = {};



/* SOCKET */

io.on("connection", (socket) => {

  console.log("🟢 User Connected");

  /* LOGIN */

  socket.on("login", async ({ user, pass }) => {

    const found = await User.findOne({
      username: user
    });

    if (!found) {
      return socket.emit(
        "login-failed",
        "User not found"
      );
    }

    const ok = await bcrypt.compare(
      pass,
      found.password
    );

    if (!ok) {
      return socket.emit(
        "login-failed",
        "Wrong password"
      );
    }

    socket.username = user;

    /* ONLINE USER ADD */

onlineUsers[user] = socket.id;

io.emit(
  "online-users",
  Object.keys(onlineUsers)
);


    socket.emit(
      "login-success",
      user
    );

    const history =
      await Message.find()
      .sort({ createdAt: 1 });

    socket.emit(
      "chat-history",
      history
    );

  });


  

  /* SIGNUP */

  socket.on("signup", async ({ user, pass }) => {

    const exists =
      await User.findOne({
        username: user
      });

    if (exists) {
      return socket.emit(
        "signup-failed",
        "User already exists"
      );
    }

    const hash =
      await bcrypt.hash(pass, 10);

    await User.create({
      username: user,
      password: hash
    });

    socket.emit(
      "signup-success",
      "Account created"
    );

  });

  /* FORGOT PASSWORD */

  socket.on(
    "forgot-password",
    async ({ user, newPass }) => {

      const found =
        await User.findOne({
          username: user
        });

      if (!found) {
        return socket.emit(
          "forgot-failed",
          "User not found"
        );
      }

      found.password =
        await bcrypt.hash(
          newPass,
          10
        );

      await found.save();

      socket.emit(
        "forgot-success",
        "Password updated"
      );

    }
  );

  /* SEND MESSAGE */

  socket.on(
    "send-message",
    async ({ text }) => {

      if (!text) return;

      const msg =
        await Message.create({
          from: socket.username,
          text
        });

      io.emit(
        "receive-message",
        msg
      );

    }
  );

 socket.on("disconnect", () => {

  if (socket.username) {

    delete onlineUsers[socket.username];

    io.emit(
      "online-users",
      Object.keys(onlineUsers)
    );

  }

});

/* CLOSE io.on("connection") */
});

server.listen(PORT, () => {
  console.log(
    "🚀 Server running on port",
    PORT
  );
});


