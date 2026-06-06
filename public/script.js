const socket = io();

let currentUser = null;
let mode = "group";
let privateTo = null;

/* ===== ELEMENTS ===== */
const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");

const signupUser = document.getElementById("signupUser");
const signupPass = document.getElementById("signupPass");

const forgotUser = document.getElementById("forgotUser");
const forgotPass = document.getElementById("forgotPass");

const loginBox = document.getElementById("loginBox");
const signupBox = document.getElementById("signupBox");
const forgotBox = document.getElementById("forgotBox");
const chatBox = document.getElementById("chatBox");

const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const typingEl = document.getElementById("typing");
const userList = document.getElementById("userList");

/* ===== PAGE SWITCH ===== */

function showSignup() {
  loginBox.classList.add("hidden");
  forgotBox.classList.add("hidden");
  signupBox.classList.remove("hidden");
}

function showForgot() {
  loginBox.classList.add("hidden");
  signupBox.classList.add("hidden");
  forgotBox.classList.remove("hidden");
}

function showLogin() {
  signupBox.classList.add("hidden");
  forgotBox.classList.add("hidden");
  loginBox.classList.remove("hidden");
}

function logout() {
  location.reload();
}

function backToGroup() {
  mode = "group";
  privateTo = null;

  document.getElementById("mode").innerText = "Group Chat";
  messages.innerHTML = "";
}

/* ===== LOGIN ===== */

function login() {
  socket.emit("login", {
    user: loginUser.value.trim(),
    pass: loginPass.value.trim()
  });
}

/* ===== SIGNUP ===== */

function signup() {
  socket.emit("signup", {
    user: signupUser.value.trim(),
    pass: signupPass.value.trim()
  });
}

/* ===== RESET PASSWORD ===== */

function resetPassword() {
  socket.emit("forgot-password", {
    user: forgotUser.value.trim(),
    newPass: forgotPass.value.trim()
  });
}

/* ===== LOGIN EVENTS ===== */

socket.on("login-success", user => {
  currentUser = user;

  loginBox.classList.add("hidden");
  signupBox.classList.add("hidden");
  forgotBox.classList.add("hidden");

  chatBox.classList.remove("hidden");
});

socket.on("login-failed", msg => {
  alert(msg);
});

/* ===== SIGNUP EVENTS ===== */

socket.on("signup-success", msg => {
  alert(msg);

  signupUser.value = "";
  signupPass.value = "";

  showLogin();
});

socket.on("signup-failed", msg => {
  alert(msg);
});

/* ===== FORGOT EVENTS ===== */

socket.on("forgot-success", msg => {
  alert(msg);

  forgotUser.value = "";
  forgotPass.value = "";

  showLogin();
});

socket.on("forgot-failed", msg => {
  alert(msg);
});

/* ===== ONLINE USERS ===== */

socket.on("online-users", users => {
  if (!userList) return;

  userList.innerHTML = "";

  users.forEach(user => {
    if (user === currentUser) return;

    const li = document.createElement("li");
    li.textContent = user;

    li.onclick = () => {
      mode = "private";
      privateTo = user;

      document.getElementById("mode").innerText =
        "Private Chat : " + user;

      messages.innerHTML = "";
    };

    userList.appendChild(li);
  });
});

/* ===== CHAT HISTORY ===== */

socket.on("chat-history", msgs => {
  messages.innerHTML = "";

  msgs.forEach(msg => {
    addMessage(msg);
  });
});

/* ===== RECEIVE MESSAGE ===== */

socket.on("receive-message", msg => {
  addMessage(msg);
});
socket.on("message-seen", ({ id, seenBy }) => {

  const li = document.getElementById(id);

  if (!li) return;

  const small = li.querySelector(".seen");

  if (!small) return;

  small.innerText =
    seenBy.length > 1
      ? "✓✓ Seen"
      : "✓ Sent";

});


socket.on("message-edited", ({ id, newText }) => {
  const li = document.getElementById(id);

  if (!li) return;

  const textEl = li.querySelector(".text");

  if (textEl) {
    textEl.innerText = newText;
  }
});

socket.on("message-deleted", id => {
  const li = document.getElementById(id);

  if (li) {
    li.remove();
  }
});

socket.on("message-reacted", ({ id, reactions }) => {

  const div = document.getElementById(
    "react-" + id
  );

  if (!div) return;

  div.innerHTML =
    Object.values(reactions).join(" ");

});

/* ===== SEND MESSAGE ===== */

function sendMessage() {
  const text = messageInput.value.trim();

  if (!text) return;

  socket.emit("send-message", {
    text,
    mode,
    to: privateTo
  });

  messageInput.value = "";
}

/* ===== ADD MESSAGE ===== */

function addMessage(msg) {
  const li = document.createElement("li");

  li.id = msg._id;

  li.className =
    msg.from === currentUser ? "me" : "other";

  li.innerHTML = `
  <b>${msg.from}</b>
  <span class="text">${msg.text}</span>

  <br>

  <small class="time">
  ${new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })}
</small>

  <small class="seen">
    ${
      msg.seenBy &&
      msg.seenBy.length > 1
        ? "✓✓ Seen"
        : "✓ Sent"
    }
  </small>

  ${
    msg.from === currentUser
      ? `
        <button onclick="editMsg('${msg._id}')">✏️</button>
        <button onclick="deleteMsg('${msg._id}')">🗑️</button>
        <div class="reaction-bar">
  <span onclick="reactMsg('${msg._id}','❤️')">❤️</span>
  <span onclick="reactMsg('${msg._id}','😂')">😂</span>
  <span onclick="reactMsg('${msg._id}','👍')">👍</span>
</div>

<div class="reactions" id="react-${msg._id}">
  ${
    msg.reactions
      ? Object.values(msg.reactions).join(" ")
      : ""
  }
</div>
      `
      : ""
  }
`;

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;


socket.emit("seen", msg._id);
}

function editMsg(id) {
  const newText = prompt("Edit message");

  if (!newText) return;

  socket.emit("edit-message", {
    id,
    newText
  });
}

function deleteMsg(id) {
  socket.emit("delete-message", id);
}

/* ===== REACTION ===== */

function reactMsg(id, reaction) {

  socket.emit("react-message", {
    id,
    reaction
  });

}
/* ===== TYPING ===== */

function typing() {
  socket.emit("typing", {
    mode,
    to: privateTo
  });
}

function stopTyping() {
  socket.emit("stop-typing");
}

socket.on("show-typing", user => {
  typingEl.innerText = user + " is typing...";
  typingEl.classList.remove("hidden");
});

socket.on("hide-typing", () => {
  typingEl.classList.add("hidden");
});

function editMsg(id) {
  const newText = prompt("Edit message");

  if (!newText) return;

  socket.emit("edit-message", {
    id,
    newText
  });
}

function deleteMsg(id) {
  socket.emit("delete-message", id);
}

/* ===== MAKE FUNCTIONS GLOBAL ===== */

window.login = login;
window.signup = signup;
window.showSignup = showSignup;
window.showForgot = showForgot;
window.showLogin = showLogin;
window.resetPassword = resetPassword;
window.sendMessage = sendMessage;
window.logout = logout;
window.backToGroup = backToGroup;
window.typing = typing;
window.stopTyping = stopTyping;
window.editMsg = editMsg;
window.deleteMsg = deleteMsg;
window.reactMsg = reactMsg;