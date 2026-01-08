const socket = io();

let username = "";
let privateTo = null;

/* ---------------- UI SWITCH ---------------- */

function showSignup() {
  loginBox.style.display = "none";
  signupBox.style.display = "block";
}

function showLogin() {
  signupBox.style.display = "none";
  forgotBox.style.display = "none";
  loginBox.style.display = "block";
}

function showForgot() {
  loginBox.style.display = "none";
  forgotBox.style.display = "block";
}

/* ---------------- SIGNUP ---------------- */

function signup() {
  socket.emit("signup", {
    user: signupUser.value.trim(),
    pass: signupPass.value.trim()
  });
}

socket.on("signup success", (msg) => {
  alert(msg);
  showLogin();
});

socket.on("signup error", (msg) => {
  signupError.textContent = msg;
});

/* ---------------- LOGIN ---------------- */

function login() {
  socket.emit("login", {
    user: loginUser.value.trim(),
    pass: loginPass.value.trim()
  });
}

socket.on("login success", (user) => {
  username = user;

  loginBox.style.display = "none";
  signupBox.style.display = "none";
  forgotBox.style.display = "none";
  chatBox.style.display = "block";

  mode.textContent = "Mode: Group Chat";
});

socket.on("login error", (msg) => {
  loginError.textContent = msg;
});

/* ---------------- SEND MESSAGE ---------------- */

function sendMessage() {
  if (!messageInput.value.trim()) return;

  if (privateTo) {
    socket.emit("private message", {
      to: privateTo,
      from: username,
      text: messageInput.value
    });
  } else {
    socket.emit("chat message", {
      user: username,
      text: messageInput.value
    });
  }

  messageInput.value = "";
}

/* ---------------- RECEIVE GROUP MESSAGE ---------------- */

socket.on("chat message", (data) => {
  const li = document.createElement("li");
  li.textContent = `${data.user}: ${data.text}`;
  messages.appendChild(li);
});

/* ---------------- RECEIVE PRIVATE MESSAGE ---------------- */

socket.on("private message", (data) => {
  const li = document.createElement("li");
  li.textContent = `(Private) ${data.from}: ${data.text}`;
  li.style.color = "purple";
  messages.appendChild(li);
});

/* ---------------- ONLINE USERS ---------------- */

socket.on("online users", (list) => {
  users.innerHTML = "";

  list.forEach((u) => {
    if (u === username) return;

    const li = document.createElement("li");
    li.textContent = u;
    li.onclick = () => startPrivateChat(u);
    users.appendChild(li);
  });
});

function startPrivateChat(user) {
  privateTo = user;

  const modeEl = document.getElementById("mode");
  if (modeEl) {
    modeEl.textContent = "Mode: Private chat with " + user;
  }

  console.log("Private chat with", user);
}


/* ---------------- BACK TO GROUP ---------------- */


function backToGroup() {
  privateTo = null;

  const modeEl = document.getElementById("mode");
  if (modeEl) {
    modeEl.textContent = "Mode: Group Chat";
  }

  console.log("Switched back to group chat");
}



/* ---------------- SYSTEM MESSAGE ---------------- */

socket.on("system message", (data) => {
  const li = document.createElement("li");
  li.textContent = data.text;
  li.style.fontStyle = "italic";
  messages.appendChild(li);
});

/* ---------------- LOGOUT ---------------- */

function logout() {
  socket.emit("logout");

  privateTo = null;
  username = "";

  chatBox.style.display = "none";
  loginBox.style.display = "block";
  messages.innerHTML = "";
}

/* ---------------- FORGOT PASSWORD ---------------- */

function forgot() {
  socket.emit("forgot password", forgotUser.value.trim());
}

socket.on("reset token", (token) => {
  forgotMsg.textContent = "Reset Token: " + token;
});

function resetPass() {
  socket.emit("reset password", {
    token: resetToken.value.trim(),
    newPass: newPass.value.trim()
  });
}

socket.on("reset success", (msg) => {
  alert(msg);
  showLogin();
});

socket.on("reset error", (msg) => {
  alert(msg);
});
