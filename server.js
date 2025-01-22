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
  console.log("A user connected", socket.id);

  socket.on("new-user", (username) => {
    users[socket.id] = { username };
    console.log(`${username} has joined the chat`);
    socket.emit("user-connected", username);
    socket.broadcast.emit("user-connected", username);
  });

  socket.on("share-public-key", (data) => {
    if (users[socket.id]) {
      users[socket.id].publicKey = data.publicKey;
      socket.broadcast.emit("recipient-public-key", { publicKey: data.publicKey });
    }
  });

  socket.on("chat-message", (data) => {
    const user = users[socket.id];
    if (user && user.publicKey) {
      const timeIST = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      socket.broadcast.emit("chat-message", {
        username: user.username,
        encryptedMessage: data.encryptedMessage,
        time: timeIST,
      });
    }
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      socket.broadcast.emit("user-disconnected", user.username);
      delete users[socket.id];
      console.log(`${user.username} has left the chat`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
