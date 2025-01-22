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

// Initialize and Store Keys Locally
async function initializeKeys() {
  const { publicKey, privateKey } = await generateKeyPair();

  sessionStorage.setItem("publicKey", publicKey);
  sessionStorage.setItem("privateKey", privateKey);

  // Emit public key to server
  socket.emit("share-public-key", { publicKey });
}

// Encrypt Message Using Recipient's Public Key
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
    {
      name: "RSA-OAEP",
    },
    publicKey,
    new TextEncoder().encode(message)
  );

  return btoa(String.fromCharCode(...new Uint8Array(encryptedMessage)));
}

// Decrypt Message Using Own Private Key
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
    {
      name: "RSA-OAEP",
    },
    privateKey,
    Uint8Array.from(atob(encryptedMessage), (c) => c.charCodeAt(0))
  );

  return new TextDecoder().decode(decryptedMessage);
}

// Prompt the user for their name
const userName = prompt("Enter your name:") || "Anonymous";
initializeKeys().then(() => socket.emit("new-user", userName));

const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");

// Add a message to the chat box
function addMessage({ userName, message, time, type }) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", type === "user" ? "user" : "others");
  messageElement.innerHTML = `<b>${userName}</b>: ${message}<br><span>${time}</span>`;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Add a notification to the chat box
function addNotification(notification) {
  const notificationElement = document.createElement("div");
  notificationElement.classList.add("notification");
  notificationElement.innerText = notification;
  chatBox.appendChild(notificationElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Send a message
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  const recipientPublicKey = sessionStorage.getItem("recipientPublicKey"); // Assume server shares recipient's public key
  const encryptedMessage = await encryptMessage(message, recipientPublicKey);

  // Emit the encrypted message to the server
  socket.emit("chat-message", { encryptedMessage });

  // Display the message locally for the sender
  addMessage({ userName: "You", message, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), type: "user" });

  messageInput.value = "";
}

// Handle the Enter key to send messages
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// Handle the send button
sendButton.addEventListener("click", sendMessage());

// Listen for messages from the server (received messages)
socket.on("chat-message", async ({ username, encryptedMessage, time }) => {
  const message = await decryptMessage(encryptedMessage);
  addMessage({ userName: username, message, time, type: "others" });
});

// Listen for user join notifications
socket.on("user-connected", (name) => {
  addNotification(`${name} joined the chat`);
});

// Listen for user leave notifications
socket.on("user-disconnected", (name) => {
  addNotification(`${name} left the chat`);
});

// Store recipient public key when shared by the server
socket.on("recipient-public-key", (data) => {
  sessionStorage.setItem("recipientPublicKey", data.publicKey);
});
