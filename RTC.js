// Web Socket
// Create WebSocket connection.
const socket = new WebSocket("ws://localhost:8080");

/*
// Connection opened
socket.addEventListener("open", (event) => {
  socket.send("Hello Server!");
});

// Listen for messages
socket.addEventListener("message", (event) => {
  console.log("Message from server ", event.data);
});
*/
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

const constraints = {
  video: true,
  audio: true,
};

makeCall(localStream);
recieveCall();

// ICE
/*
    // Set up event handlers for ICE candidates and negotiation needed
    localPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Send the ICE candidate to the remote peer (you would use a signaling channel for this in a real application)
      }
    };

    // Set up event handler for receiving remote stream
    localPeerConnection.ontrack = (event) => {
      remoteVideo.srcObject = event.streams[0];
    };

    // Create an offer to start the negotiation process
    return peerConnection.createOffer();
  })
  .then((offer) => {
    // Set the local description and send the offer to the remote peer
    return peerConnection.setLocalDescription(offer);
  })
  .catch((error) => {
    console.error("Error accessing media devices:", error);
  });
*/

async function makeCall(stream) {
  // Get user media
  navigator.mediaDevices
    .getUserMedia(constraints) // Promise
    .then((localStream) => {
      localVideo.srcObject = localStream;
    })
    .catch((error) => {
      console.log("Couldn't open camera.", error);
    });

  // Create an RTCPeerConnection
  const localPeerConnection = new RTCPeerConnection();

  // Add the local stream to the connection
  stream
    .getTracks()
    .forEach((localTrack) => localPeerConnection.addTrack(localTrack, stream));

  // Listening for offers
  socket.addEventListener("message", (message) => {
    console.log("Answer: ", message.data);

    if (message.answer) {
      // Set this offer as remote description
      localPeerConnection.setRemoteDescription(
        new RTCSessionDescription(message.answer)
      );
    }
  });

  // Create offer
  const localOffer = await localPeerConnection.createOffer();

  // Set that offer as local description
  await localPeerConnection.setLocalDescription(localOffer);

  // Send offer
  socket.send(localOffer);
}

async function recieveCall() {
  // Create an RTCPeerConnection
  const remotePeerConnection = new RTCPeerConnection();

  // Listening for offers
  socket.addEventListener("message", (message) => {
    console.log("Offer: ", message.data);

    if (message.offer) {
      // Set this offer as remote description
      remotePeerConnection.setRemoteDescription(
        new RTCSessionDescription(message.offer)
      );
    }
  });

  // Get user media
  navigator.mediaDevices
    .getUserMedia(constraints) // Promise
    .then((remoteStream) => {
      remoteVideo.srcObject = remoteStream;
    });

  // Add the remote stream to the connection
  stream
    .getTracks()
    .forEach((remoteTrack) =>
      remotePeerConnection.addTrack(remoteTrack, stream)
    );

  // Create an answer
  const answer = await remotePeerConnection.createAnswer();

  // Set answer as local description
  remotePeerConnection.setLocalDescription(answer);

  // Send answer
  socket.send(answer);
}

// CALLER
navigator.mediaDevices.getUserMedia();
RTCPeerConnection();
RTCPeerConnection.addTrack();
RTCPeerConnection.createOffer();
RTCPeerConnection.setLocalDescription();
//offer se pošlje recipientu

// RECIPENT
RTCPeerConnection.setRemoteDescription();
navigator.mediaDevices.getUserMedia();
RTCPeerConnection();
RTCPeerConnection.addTrack();
RTCPeerConnection.createAnswer();
RTCPeerConnection.setLocalDescription();
//answer se pošlje callerju
RTCPeerConnection.setRemoteDescription();
