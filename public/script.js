const socket = io();

// Generate RSA Key Pair for Encryption
async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKeyPair(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicKey: btoa(String.fromCharCode(...new Uint8Array(publicKey))),
    privateKey: btoa(String.fromCharCode(...new Uint8Array(privateKey))),
  };
}

// Initialize Keys and Join Chat
async function initializeKeys() {
  const { publicKey, privateKey } = await generateKeyPair();

  // Store keys locally
  sessionStorage.setItem("publicKey", publicKey);
  sessionStorage.setItem("privateKey", privateKey);

  // Emit public key to server
  socket.emit("new-user", { name: userName, publicKey });
}

// Encrypt Message
async function encryptMessage(message, recipientPublicKey) {
  const publicKey = await window.crypto.subtle.importKey(
    "spki",
    Uint8Array.from(atob(recipientPublicKey), (c) => c.charCodeAt(0)),
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );

  const encryptedMessage = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    new TextEncoder().encode(message)
  );

  return btoa(String.fromCharCode(...new Uint8Array(encryptedMessage)));
}

// Decrypt Message
async function decryptMessage(encryptedMessage) {
  const privateKey = await window.crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(sessionStorage.getItem("privateKey")), (c) => c.charCodeAt(0)),
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );

  const decryptedMessage = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    Uint8Array.from(atob(encryptedMessage), (c) => c.charCodeAt(0))
  );

  return new TextDecoder().decode(decryptedMessage);
}

// Prompt user for name
const userName = prompt("Enter your name:") || "Anonymous";
initializeKeys();

const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");

function addMessage({ userName, message, time, type }) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", type === "user" ? "user" : "others");
  messageElement.innerHTML = `<b>${userName}:</b> ${message}<br><span>${time}</span>`;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Send Message
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  const recipientPublicKey = sessionStorage.getItem("recipientPublicKey");
  const encryptedMessage = await encryptMessage(message, recipientPublicKey);

  socket.emit("chat-message", { encryptedMessage });

  addMessage({ userName: "You", message, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), type: "user" });

  messageInput.value = "";
}

messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

sendButton.addEventListener("click", sendMessage);

socket.on("chat-message", async ({ username, encryptedMessage, time }) => {
  const decryptedMessage = await decryptMessage(encryptedMessage);
  addMessage({ userName: username, message: decryptedMessage, time, type: "others" });
});

socket.on("user-connected", ({ name, publicKey }) => {
  sessionStorage.setItem("recipientPublicKey", publicKey);
  addMessage({ userName: "System", message: `${name} joined the chat`, time: new Date().toLocaleTimeString(), type: "others" });
});

socket.on("user-disconnected", (name) => {
  addMessage({ userName: "System", message: `${name} left the chat`, time: new Date().toLocaleTimeString(), type: "others" });
});
