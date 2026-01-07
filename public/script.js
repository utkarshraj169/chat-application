const socket = io();
let username = "";

// time formatter
function formatTimeISO(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

// LOGIN
function login() {
  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();

  if (!user || !pass) return;

  socket.emit("login", { user, pass });
}

// LOGIN SUCCESS
socket.on("login success", (user) => {
  username = user;
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("chatBox").style.display = "block";
  document.getElementById("loginError").textContent = "";
});

// LOGIN ERROR
socket.on("login error", (msg) => {
  document.getElementById("loginError").textContent = msg;
});

// SEND MESSAGE
function sendMessage() {
  const input = document.getElementById("messageInput");
  if (!input.value.trim()) return;

  socket.emit("chat message", {
    user: username,
    text: input.value
  });

  input.value = "";
}

// RECEIVE CHAT MESSAGE
socket.on("chat message", (data) => {
  const li = document.createElement("li");
  li.textContent = `[${formatTimeISO(data.time)}] ${data.user}: ${data.text}`;

  if (data.user === username) {
    li.style.background = "#DCF8C6";
    li.style.textAlign = "right";
  }

  document.getElementById("messages").appendChild(li);
});

// SYSTEM MESSAGE
socket.on("system message", (data) => {
  const li = document.createElement("li");
  li.textContent = `[${formatTimeISO(data.time)}] ${data.text}`;
  li.style.fontStyle = "italic";
  li.style.color = "gray";
  document.getElementById("messages").appendChild(li);
});

// LOGOUT
function logout() {
  socket.emit("logout");
  username = "";

  document.getElementById("chatBox").style.display = "none";
  document.getElementById("loginBox").style.display = "block";
  document.getElementById("messages").innerHTML = "";
}
