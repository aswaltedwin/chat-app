const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle user joining
    socket.on('userJoined', (userName) => {
        socket.userName = userName;
        io.emit('userJoined', userName);
    });

    // Handle chat messages
    socket.on('chatMessage', ({ userName, message, time }) => {
        // Emit the message to everyone except the sender
        socket.broadcast.emit('chatMessage', { userName, message, time });
    });

    // Handle user disconnecting
    socket.on('disconnect', () => {
        if (socket.userName) {
            io.emit('userLeft', socket.userName);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
