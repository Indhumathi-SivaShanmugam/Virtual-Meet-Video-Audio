const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Track connected users
let users = [];

app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    users.push(socket.id);
    io.emit("update-users", users);

    socket.on("offer", (data) => {
        socket.to(data.target).emit("offer", {
            sdp: data.sdp,
            caller: socket.id,
        });
    });

    socket.on("answer", (data) => {
        socket.to(data.target).emit("answer", {
            sdp: data.sdp,
        });
    });

    socket.on("ice-candidate", (data) => {
        socket.to(data.target).emit("ice-candidate", {
            candidate: data.candidate,
        });
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        users = users.filter((userId) => userId !== socket.id);
        io.emit("update-users", users);
    });
});

// Start server
server.listen(3000, "localhost", () => {
    console.log("Signaling server is running on http://localhost:3000");
});


