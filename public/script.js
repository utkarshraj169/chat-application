const socket = io();
let username = "";

// format time
function formatTimeISO(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// join chat
function setUsername() {
  const input = document.getElementById("usernameInput");
  if (input.value.trim() === "") return;

  username = input.value;
  socket.emit("join", username);

  document.getElementById("userBox").style.display = "none";
  document.getElementById("chatBox").style.display = "block";
}

// send message
function sendMessage() {
  const input = document.getElementById("messageInput");
  if (input.value.trim() === "") return;

  socket.emit("chat message", {
    user: username,
    text: input.value
  });

  input.value = "";
}

// RECEIVE CHAT MESSAGE ✅
socket.on("chat message", (data) => {
  const li = document.createElement("li");
  li.textContent = `[${formatTimeISO(data.time)}] ${data.user}: ${data.text}`;
  document.getElementById("messages").appendChild(li);
});

// RECEIVE SYSTEM MESSAGE ✅
socket.on("system message", (data) => {
  const li = document.createElement("li");
  li.textContent = `[${formatTimeISO(data.time)}] ${data.text}`;
  li.style.fontStyle = "italic";
  li.style.color = "gray";
  document.getElementById("messages").appendChild(li);
});

