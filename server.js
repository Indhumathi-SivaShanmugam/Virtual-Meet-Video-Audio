const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public')); // Serve static files from the 'public' folder

// Store connected users
let users = [];

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Add user to the list
    users.push(socket.id);

    // Handle call offer
    socket.on('offer', (offer) => {
        const otherUser = users.find((id) => id !== socket.id);
        if (otherUser) {
            socket.to(otherUser).emit('offer', offer);
        }
    });

    // Handle call answer
    socket.on('answer', (answer) => {
        const otherUser = users.find((id) => id !== socket.id);
        if (otherUser) {
            socket.to(otherUser).emit('answer', answer);
        }
    });

    // Handle ICE candidate exchange
    socket.on('ice-candidate', (candidate) => {
        const otherUser = users.find((id) => id !== socket.id);
        if (otherUser) {
            socket.to(otherUser).emit('ice-candidate', candidate);
        }
    });

    // Remove disconnected user
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        users = users.filter((id) => id !== socket.id);
    });
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

