// ================= SOCKET =================
const socket = io();

// ================= DOM =================
const loginBox = document.getElementById("loginBox");
const signupBox = document.getElementById("signupBox");
const chatBox = document.getElementById("chatBox");

const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");
const signupUser = document.getElementById("signupUser");
const signupPass = document.getElementById("signupPass");

const loginError = document.getElementById("loginError");
const signupError = document.getElementById("signupError");

const usersList = document.getElementById("usersList");
const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const modeText = document.getElementById("mode");

// ================= STATE =================
let currentUser = null;
let currentMode = "group"; // group | private
let privateTo = null;

// ================= LOGIN =================
function login() {
  loginError.innerText = "";

  const user = loginUser.value.trim();
  const pass = loginPass.value.trim();

  if (!user || !pass) {
    loginError.innerText = "All fields required";
    return;
  }

  socket.emit("login", { user, pass });
}

socket.on("login-success", ({ user, token }) => {
  currentUser = user;

  // store token (for future use if needed)
  localStorage.setItem("token", token);

  loginBox.style.display = "none";
  signupBox.style.display = "none";
  chatBox.style.display = "block";

  modeText.innerText = "Group Chat";
});

socket.on("login-failed", (msg) => {
  loginError.innerText = msg;
});

// ================= SIGNUP =================
function signup() {
  signupError.innerText = "";

  const user = signupUser.value.trim();
  const pass = signupPass.value.trim();

  if (!user || !pass) {
    signupError.innerText = "All fields required";
    return;
  }

  socket.emit("signup", { user, pass });
}

socket.on("signup-success", (msg) => {
  alert(msg);
  showLogin();
});

socket.on("signup-failed", (msg) => {
  signupError.innerText = msg;
});

// ================= CHAT =================
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  if (currentMode === "group") {
    socket.emit("group-message", text);
  } else {
    socket.emit("private-message", { to: privateTo, text });
  }

  messageInput.value = "";
}

// Receive group messages
socket.on("group-message", addMessage);

// Receive private messages
socket.on("private-message", addMessage);

// Chat history (group)
socket.on("chat-history", (history) => {
  messages.innerHTML = "";
  history.forEach(addMessage);
});

function addMessage(msg) {
  const li = document.createElement("li");
  li.textContent = `[${msg.time}] ${msg.from}: ${msg.text}`;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

// ================= ONLINE USERS =================
socket.on("online-users", (users) => {
  usersList.innerHTML = "";

  users.forEach((u) => {
    if (u === currentUser) return;

    const li = document.createElement("li");
    li.textContent = u;
    li.onclick = () => startPrivate(u);
    usersList.appendChild(li);
  });
});

// ================= MODES =================
function startPrivate(user) {
  currentMode = "private";
  privateTo = user;
  modeText.innerText = "Private chat with " + user;
  messages.innerHTML = "";
}

function backToGroup() {
  currentMode = "group";
  privateTo = null;
  modeText.innerText = "Group Chat";
  messages.innerHTML = "";
}

// ================= UI HELPERS =================
function showSignup() {
  loginBox.style.display = "none";
  signupBox.style.display = "block";
}

function showLogin() {
  signupBox.style.display = "none";
  loginBox.style.display = "block";
}

function logout() {
  localStorage.removeItem("token");
  location.reload();
}
