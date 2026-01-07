const socket = io();
let username = "";
let privateTo = null;

// -------- UI SWITCH --------
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

// -------- SIGNUP --------
function signup() {
  socket.emit("signup", {
    user: signupUser.value,
    pass: signupPass.value,
  });
}
socket.on("signup success", (msg) => {
  alert(msg);
  showLogin();
});
socket.on("signup error", (msg) => signupError.textContent = msg);

// -------- LOGIN --------
function login() {
  socket.emit("login", {
    user: loginUser.value,
    pass: loginPass.value,
  });
}
socket.on("login success", (user) => {
  username = user;
  loginBox.style.display = "none";
  signupBox.style.display = "none";
  forgotBox.style.display = "none";
  chatBox.style.display = "block";
});
socket.on("login error", (msg) => loginError.textContent = msg);

// -------- PUBLIC CHAT --------
function sendMessage() {
  if (!messageInput.value) return;

  if (privateTo) {
    socket.emit("private message", {
      to: privateTo,
      from: username,
      text: messageInput.value,
    });
  } else {
    socket.emit("chat message", {
      user: username,
      text: messageInput.value,
    });
  }
  messageInput.value = "";
}

socket.on("chat message", (d) => {
  const li = document.createElement("li");
  li.textContent = `${d.user}: ${d.text}`;
  messages.appendChild(li);
});

// -------- PRIVATE CHAT --------
socket.on("private message", (d) => {
  alert(`Private from ${d.from}: ${d.text}`);
});

// -------- ONLINE USERS --------
socket.on("online users", (list) => {
  users.innerHTML = "";
  list.forEach((u) => {
    const li = document.createElement("li");
    li.textContent = u;
    li.onclick = () => {
      privateTo = u;
      alert("Private chat with " + u);
    };
    users.appendChild(li);
  });
});

// -------- SYSTEM --------
socket.on("system message", (d) => {
  const li = document.createElement("li");
  li.textContent = d.text;
  li.style.fontStyle = "italic";
  messages.appendChild(li);
});

// -------- LOGOUT --------
function logout() {
  socket.emit("logout");
  chatBox.style.display = "none";
  loginBox.style.display = "block";
  messages.innerHTML = "";
  privateTo = null;
}

// -------- FORGOT PASSWORD --------
function forgot() {
  socket.emit("forgot password", forgotUser.value);
}
socket.on("reset token", (t) => {
  forgotMsg.textContent = "Reset Token: " + t;
});
function resetPass() {
  socket.emit("reset password", {
    token: resetToken.value,
    newPass: newPass.value,
  });
}
socket.on("reset success", (m) => alert(m));
socket.on("reset error", (m) => alert(m));
