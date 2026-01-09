const socket = io();

function login() {
  socket.emit("login", {
    user: loginUser.value.trim(),
    pass: loginPass.value.trim(),
  });
}

socket.on("login-success", () => {
  loginBox.style.display = "none";
  chatBox.style.display = "block";
});

socket.on("login-error", (msg) => {
  loginError.innerText = msg;
});

socket.on("chat-history", (msgs) => {
  messages.innerHTML = "";
  msgs.forEach(addMsg);
});

function send() {
  socket.emit("chat-message", msg.value);
  msg.value = "";
}

socket.on("chat-message", addMsg);

function addMsg(m) {
  const li = document.createElement("li");
  li.innerText = `[${m.time}] ${m.user}: ${m.text}`;
  messages.appendChild(li);
}

function signup() {
  socket.emit("signup", {
    user: signupUser.value,
    pass: signupPass.value,
  });
}

socket.on("signup-success", () => {
  alert("Signup successful");
  showLogin();
});

socket.on("signup-error", (msg) => {
  signupError.innerText = msg;
});

function forgot() {
  socket.emit("forgot", forgotUser.value);
}

function resetPass() {
  socket.emit("reset-pass", {
    user: forgotUser.value,
    token: resetToken.value,
    pass: newPass.value,
  });
}

socket.on("forgot-msg", (msg) => {
  forgotMsg.innerText = msg;
});

function logout() {
  location.reload();
}

function showSignup() {
  loginBox.style.display = "none";
  signupBox.style.display = "block";
}

function showForgot() {
  loginBox.style.display = "none";
  forgotBox.style.display = "block";
}

function showLogin() {
  signupBox.style.display = "none";
  forgotBox.style.display = "none";
  loginBox.style.display = "block";
}
