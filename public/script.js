// Initialize socket.io
const socket = io();

// WebRTC configuration
const configuration = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302",
        },
    ],
};

let localStream;
let remoteStream;
let peerConnection;

// DOM elements
const startCallButton = document.getElementById("startCall");
const endCallButton = document.getElementById("endCall");
const remoteAudio = document.getElementById("remoteAudio");

startCallButton.addEventListener("click", startCall);
endCallButton.addEventListener("click", endCall);

// Get user media (audio)
async function startCall() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Local audio stream captured:", localStream);

        // Create peer connection
        peerConnection = new RTCPeerConnection(configuration);

        // Add local tracks to the connection
        localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle remote tracks
        peerConnection.ontrack = (event) => {
            console.log("Remote track received:", event.streams[0]);
            remoteAudio.srcObject = event.streams[0]; // Attach remote audio
            remoteAudio.play();
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("Sending ICE candidate:", event.candidate);
                socket.emit("ice-candidate", {
                    target: targetId, // Replace with the target user's socket ID
                    candidate: event.candidate,
                });
            }
        };

        // Create offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        console.log("Sending offer:", offer);

        // Emit the offer to the target user
        socket.emit("offer", {
            target: targetId, // Replace with the target user's socket ID
            sdp: offer,
        });
    } catch (error) {
        console.error("Error starting call:", error);
    }
}

// Handle incoming offer
socket.on("offer", async (data) => {
    console.log("Received offer:", data);

    if (!peerConnection) {
        peerConnection = new RTCPeerConnection(configuration);

        // Add local tracks to the connection
        localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle remote tracks
        peerConnection.ontrack = (event) => {
            console.log("Remote track received:", event.streams[0]);
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.play();
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("Sending ICE candidate:", event.candidate);
                socket.emit("ice-candidate", {
                    target: data.caller,
                    candidate: event.candidate,
                });
            }
        };
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));

    // Create and send answer
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    console.log("Sending answer:", answer);
    socket.emit("answer", {
        target: data.caller,
        sdp: answer,
    });
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
