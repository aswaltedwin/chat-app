const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, "public")));

const users = {};

io.on("connection", (socket) => {
  console.log("A user connected");

  // When a new user joins
  socket.on("userJoined", (username) => {
    users[socket.id] = username;
    socket.broadcast.emit("userJoined", username);
    console.log(`${username} joined the chat`);
  });

  // When a message is sent
  socket.on("chatMessage", (data) => {
    socket.broadcast.emit("chatMessage", {
      userName: data.userName,
      message: data.message,
      time: data.time
    });
  });

  // When a user disconnects
  socket.on("disconnect", () => {
    const username = users[socket.id];
    if (username) {
      socket.broadcast.emit("userLeft", username);
      delete users[socket.id];
      console.log(`${username} left the chat`);
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});