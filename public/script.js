const socket = io()

// WebRTC configuration
const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

let localStream;
let remoteStream;
let peerConnection;
let targetId; // Dynamic target user ID

// DOM elements
const startCallButton = document.getElementById("startCall");
const endCallButton = document.getElementById("endCall");
const remoteAudio = document.getElementById("remoteAudio");
const usersList = document.getElementById("usersList");

// Update users list on connection
socket.on("update-users", (users) => {
    usersList.innerHTML = ""; // Clear the list
    users.forEach((userId) => {
        if (userId !== socket.id) {
            const userItem = document.createElement("li");
            userItem.textContent = userId;
            userItem.addEventListener("click", () => {
                targetId = userId;
                console.log(`Target set to: ${targetId}`);
            });
            usersList.appendChild(userItem);
        }
    });
});

startCallButton.addEventListener("click", startCall);
endCallButton.addEventListener("click", endCall);

async function startCall() {
    if (!targetId) {
        alert("Please select a user to call!");
        return;
    }

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Local audio stream captured:", localStream);

        peerConnection = new RTCPeerConnection(configuration);

        localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.ontrack = (event) => {
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.play().catch((error) => console.error("Error playing remote audio:", error));
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("Sending ICE candidate:", event.candidate);
                socket.emit("ice-candidate", { target: targetId, candidate: event.candidate });
            }
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        console.log("Sending offer:", offer);
        socket.emit("offer", { target: targetId, sdp: offer });
    } catch (error) {
        console.error("Error starting call:", error);
    }
}

// Handle incoming offer
socket.on("offer", async (data) => {
    console.log("Received offer:", data);

    peerConnection = new RTCPeerConnection(configuration);

    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.play().catch((error) => console.error("Error playing remote audio:", error));
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log("Sending ICE candidate:", event.candidate);
            socket.emit("ice-candidate", { target: data.caller, candidate: event.candidate });
        }
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    console.log("Sending answer:", answer);
    socket.emit("answer", { target: data.caller, sdp: answer });
});

// Handle incoming answer
socket.on("answer", async (data) => {
    console.log("Received answer:", data);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
});

// Handle ICE candidate
socket.on("ice-candidate", async (data) => {
    console.log("Received ICE candidate:", data);
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
        console.error("Error adding received ICE candidate:", error);
    }
});

// End call
function endCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    console.log("Call ended");
}
