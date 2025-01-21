const socket = io();

// Prompt the user for their name
const userName = prompt("Enter your name:") || "Anonymous";
socket.emit('userJoined', userName);

const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

// Add a message to the chat box
function addMessage({ userName, message, time, type }) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type === 'user' ? 'user' : 'others');
    messageElement.innerHTML = `<b>${userName}</b>: ${message}<br><span>${time}</span>`;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Add a notification to the chat box
function addNotification(notification) {
    const notificationElement = document.createElement('div');
    notificationElement.classList.add('notification');
    notificationElement.innerText = notification;
    chatBox.appendChild(notificationElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Format time (remove seconds)
function getFormattedTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Send a message
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    const time = getFormattedTime();

    // Display the message locally
    addMessage({ userName: "You", message, time, type: 'user' });

    // Emit the message to the server
    socket.emit('chatMessage', { userName, message, time });
    messageInput.value = '';
}

// Handle the Enter key to send messages
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Handle the send button
sendButton.addEventListener('click', sendMessage);

// Listen for messages from the server (received messages)
socket.on('chatMessage', ({ userName, message, time }) => {
    addMessage({ userName, message, time, type: 'others' });
});

// Listen for user join notifications
socket.on('userJoined', (name) => {
    addNotification(`${name} joined the chat`);
});

// Listen for user leave notifications
socket.on('userLeft', (name) => {
    addNotification(`${name} left the chat`);
});
