const socket = io();

// ================= DOM =================
const loginBox = document.getElementById("loginBox");
const signupBox = document.getElementById("signupBox");
const forgotBox = document.getElementById("forgotBox");
const chatBox = document.getElementById("chatBox");

const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");
const signupUser = document.getElementById("signupUser");
const signupPass = document.getElementById("signupPass");
const forgotUser = document.getElementById("forgotUser");
const forgotPass = document.getElementById("forgotPass");

const messages = document.getElementById("messages");
const users = document.getElementById("users");
const messageInput = document.getElementById("messageInput");
const modeText = document.getElementById("mode");
const typingText = document.getElementById("typing");

// ================= STATE =================
let currentUser = null;
let mode = "group";
let privateTo = null;
let typingTimer;

// ================= AUTH =================
function login() {
  socket.emit("login", {
    user: loginUser.value.trim(),
    pass: loginPass.value.trim()
  });
}

function signup() {
  socket.emit("signup", {
    user: signupUser.value.trim(),
    pass: signupPass.value.trim()
  });
}

function resetPassword() {
  socket.emit("forgot-password", {
    user: forgotUser.value.trim(),
    newPass: forgotPass.value.trim()
  });
}

// ================= UI SWITCH =================
function showSignup() {
  loginBox.classList.add("hidden");
  signupBox.classList.remove("hidden");
}

function showForgot() {
  loginBox.classList.add("hidden");
  forgotBox.classList.remove("hidden");
}

function showLogin() {
  signupBox.classList.add("hidden");
  forgotBox.classList.add("hidden");
  loginBox.classList.remove("hidden");
}

// ================= SOCKET RESPONSES =================
socket.on("login-success", ({ user }) => {
  currentUser = user;
  loginBox.classList.add("hidden");
  chatBox.classList.remove("hidden");
});

socket.on("login-failed", alert);
socket.on("signup-success", msg => { alert(msg); showLogin(); });
socket.on("signup-failed", alert);
socket.on("forgot-success", msg => { alert(msg); showLogin(); });
socket.on("forgot-failed", alert);

// ================= ONLINE USERS =================
socket.on("online-users", list => {
  users.innerHTML = "";
  list.forEach(u => {
    if (u !== currentUser) {
      const li = document.createElement("li");
      li.innerText = u;
      li.onclick = () => startPrivate(u);
      users.appendChild(li);
    }
  });
});

// ================= CHAT =================
socket.on("chat-history", msgs => {
  messages.innerHTML = "";
  msgs.forEach(addMessage);
});

socket.on("receive-message", addMessage);

function sendMessage() {
  if (!messageInput.value.trim()) return;

  socket.emit("send-message", {
    text: messageInput.value,
    mode,
    to: privateTo
  });

  messageInput.value = "";
  socket.emit("stop-typing");
}

// ================= MESSAGE UI (SEEN ✓✓) =================
function addMessage(msg) {
  const li = document.createElement("li");
  li.id = msg._id;

  let seen = "";
  if (msg.from === currentUser) {
    seen = msg.seenBy && msg.seenBy.length > 0 ? " ✓✓" : " ✓";
  }

  li.innerHTML = `
    <b>${msg.from}</b>: <span>${msg.text}</span>${seen}
    ${msg.from === currentUser ? `
      <button onclick="editMsg('${msg._id}')">✏️</button>
      <button onclick="deleteMsg('${msg._id}')">🗑️</button>
    ` : ""}
  `;

  messages.appendChild(li);

  if (msg.from !== currentUser) {
    socket.emit("mark-seen", { mode, withUser: msg.from });
  }
}

// ================= EDIT / DELETE =================
function editMsg(id) {
  const text = prompt("Edit message");
  if (text) socket.emit("edit-message", { id, newText: text });
}

function deleteMsg(id) {
  socket.emit("delete-message", id);
}

socket.on("message-edited", ({ id, newText }) => {
  const el = document.getElementById(id);
  if (el) el.querySelector("span").innerText = newText;
});

socket.on("message-deleted", id => {
  const el = document.getElementById(id);
  if (el) el.remove();
});

// ================= PRIVATE CHAT =================
function startPrivate(u) {
  mode = "private";
  privateTo = u;
  modeText.innerText = "Private Chat → " + u;
  messages.innerHTML = "";
}

function backToGroup() {
  mode = "group";
  privateTo = null;
  modeText.innerText = "Group Chat";
  messages.innerHTML = "";
}

// ================= TYPING =================
messageInput.addEventListener("input", () => {
  socket.emit("typing", { mode, to: privateTo });

  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    socket.emit("stop-typing");
  }, 800);
});

socket.on("show-typing", user => {
  typingText.innerText = user + " is typing...";
});

socket.on("hide-typing", () => {
  typingText.innerText = "";
});

// ================= LOGOUT =================
function logout() {
  location.reload();
}
