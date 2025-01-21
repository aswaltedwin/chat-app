const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from any domain.
    methods: ["GET", "POST"],
  },
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Track connected users
const users = {};

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  // When a new user joins
  socket.on("new-user", (username) => {
    users[socket.id] = username;
    console.log(`${username} has joined the chat`);

    // Emit the user's name to everyone (including the sender)
    socket.emit("user-connected", username);
    socket.broadcast.emit("user-connected", username);
  });

  // When a message is sent
  socket.on("chat-message", (data) => {
    const username = users[socket.id]; // Fetch the username of the sender
    if (username) {
      // Get current time in IST (UTC +5:30)
      const ISTDate = new Date();
      const ISTTime = new Date(ISTDate.getTime() + (5.5 * 60 * 60 * 1000)); // UTC +5:30
      const timeInIST = ISTTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      // Emit the message to all clients EXCEPT the sender
      socket.broadcast.emit("chat-message", {
        message: data.message,
        username: username, // Send the correct username here
        time: timeInIST, // Send the time in IST
      });
    }
  });

  // When a user disconnects
  socket.on("disconnect", () => {
    const username = users[socket.id];
    if (username) {
      socket.broadcast.emit("user-disconnected", username);
      delete users[socket.id];
      console.log(`${username} has left the chat`);
    }
  });
});

// Use the environment-provided port or default to 3000
const PORT = process.env.PORT || 3000;

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
