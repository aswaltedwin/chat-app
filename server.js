const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(express.static(path.join(__dirname, "public")));

const users = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("new-user", ({ name, publicKey }) => {
    users[socket.id] = { name, publicKey };
    console.log(`${name} joined the chat`);

    socket.broadcast.emit("user-connected", { name, publicKey });
  });

  socket.on("chat-message", ({ encryptedMessage }) => {
    const sender = users[socket.id];
    if (sender) {
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      socket.broadcast.emit("chat-message", { username: sender.name, encryptedMessage, time });
    }
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      socket.broadcast.emit("user-disconnected", user.name);
      delete users[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
