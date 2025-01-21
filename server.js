const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Track connected users
const users = {};

io.on("connection", (socket) => {
  console.log("A user connected");

  // When a new user joins
  socket.on("new-user", (username) => {
    users[socket.id] = username;
    socket.broadcast.emit("user-connected", username);
  });

  // When a message is sent
  socket.on("chat-message", (data) => {
    socket.broadcast.emit("chat-message", {
      message: data.message,
      username: users[socket.id],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  });

  // When a user disconnects
  socket.on("disconnect", () => {
    const username = users[socket.id];
    if (username) {
      socket.broadcast.emit("user-disconnected", username);
      delete users[socket.id];
    }
    console.log("A user disconnected");
  });
});

// Use the environment-provided port or default to 3000
const PORT = process.env.PORT || 3000;

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
