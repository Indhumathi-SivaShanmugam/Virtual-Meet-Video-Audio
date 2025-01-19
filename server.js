const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files (frontend)
app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Handle offer
    socket.on("offer", (data) => {
        socket.to(data.target).emit("offer", {
            sdp: data.sdp,
            caller: socket.id,
        });
    });

    // Handle answer
    socket.on("answer", (data) => {
        socket.to(data.target).emit("answer", {
            sdp: data.sdp,
        });
    });

    // Handle ICE candidate
    socket.on("ice-candidate", (data) => {
        socket.to(data.target).emit("ice-candidate", {
            candidate: data.candidate,
        });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// Start server

server.listen(3000, "localhost", () => {
    console.log("Signaling server is running on http://localhost:3000");
});

