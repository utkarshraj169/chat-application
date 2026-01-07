const socket = io();
let username = "";

// 🔁 UI SWITCH
function showSignup() {
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("signupBox").style.display = "block";
}

function showLogin() {
  document.getElementById("signupBox").style.display = "none";
  document.getElementById("loginBox").style.display = "block";
}

// 📝 SIGNUP
function signup() {
  const user = document.getElementById("signupUser").value.trim();
  const pass = document.getElementById("signupPass").value.trim();

  if (!user || !pass) return;

  socket.emit("signup", { user, pass });
}

socket.on("signup success", (msg) => {
  alert(msg);
  showLogin();
});

socket.on("signup error", (msg) => {
  document.getElementById("signupError").textContent = msg;
});

// 🔑 LOGIN
function login() {
  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();

  if (!user || !pass) return;

  socket.emit("login", { user, pass });
}

socket.on("login success", (user) => {
  username = user;
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("signupBox").style.display = "none";
  document.getElementById("chatBox").style.display = "block";
  document.getElementById("loginError").textContent = "";
});

socket.on("login error", (msg) => {
  document.getElementById("loginError").textContent = msg;
});

// 💬 CHAT
function sendMessage() {
  const input = document.getElementById("messageInput");
  if (!input.value.trim()) return;

  socket.emit("chat message", {
    user: username,
    text: input.value
  });

  input.value = "";
}

socket.on("chat message", (data) => {
  const li = document.createElement("li");
  li.textContent = `${data.user}: ${data.text}`;
  document.getElementById("messages").appendChild(li);
});

socket.on("system message", (data) => {
  const li = document.createElement("li");
  li.textContent = data.text;
  li.style.fontStyle = "italic";
  document.getElementById("messages").appendChild(li);
});

// 🚪 LOGOUT
function logout() {
  socket.emit("logout");
  username = "";

  document.getElementById("chatBox").style.display = "none";
  document.getElementById("loginBox").style.display = "block";
  document.getElementById("messages").innerHTML = "";
}
