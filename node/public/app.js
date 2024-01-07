//const socket = new WebSocket("ws://localhost:8080/");
const socket = new WebSocket("ws://192.168.1.235:8080/"); //192.168.89.138
//const socket = new WebSocket("ws://92.37.13.194:8080/");

socket.addEventListener("open", () => {
  console.log("I am connected!");
});

socket.addEventListener("message", (message) => {
  const data = JSON.parse(message.data);
  if (data.type === "id") {
    var myID = data.id;
    console.log("This is my ID:", myID);

    const displayID = document.querySelector("#userID");
    displayID.textContent = myID.toString();
  }
});

// Create an RTCPeerConnection
var peerConnection = new RTCPeerConnection();
console.log("RTCPeerConnection created");

const constraints = (window.constraints = {
  audio: false,
  video: {
    width: 640,
    height: 480,
  },
});
/*
const iceConfiguration = {
  iceServers: [
    {
      urls: "turn:4.212.242.245:3478",
      username: "admin",
      credential: "password",

      //urls: "stun:stun.l.google.com:19302",
    },
  ],
};
*/
async function openCamera() {
  try {
    // Make sure localVideo element is active
    const localVideoElement = document.querySelector("#localVideo");
    localVideoElement.style.display = "block";

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = document.querySelector("#localVideo");
    const videoTracks = stream.getVideoTracks();
    console.log("Got stream with constraints:", constraints);
    console.log(`Using video device: ${videoTracks[0].label}`);
    window.stream = stream; // make variable available to browser console
    video.srcObject = stream;
    return stream;
  } catch (error) {
    console.log("Error in opening camera!");
    handleError(error);
  }
}

async function closeCall() {
  try {
    const localTracks = document
      .querySelector("#localVideo")
      .srcObject.getTracks();
    localTracks.forEach((track) => {
      track.stop();
    });
    const remoteTracks = document
      .querySelector("#remoteVideo")
      .srcObject.getTracks();
    remoteTracks.forEach((track) => {
      track.stop();
    });

    if (peerConnection) {
      peerConnection.close();
      console.log("Peer connection closed!");
    }
    // Close localVideo element
    const localVideoElement = document.querySelector("#localVideo");
    localVideoElement.style.display = "none";

    const endCallButton = document.querySelector("#endCall");
    endCallButton.style.display = "none";
    const remoteVideoElement = document.querySelector("#remoteVideo");
    remoteVideoElement.style.display = "none";
  } catch (e) {
    console.log("Error in opening camera!");
    handleError(e);
  }
}

function handleError(error) {
  if (error.name === "OverconstrainedError") {
    errorMsg("Video resolution is not supported by your device!");
  } else if (error.name === "NotAllowedError") {
    errorMsg("Permissions for using microphone and camera are denied!");
  }
  errorMsg(`getUserMedia error: ${error.name}`, error);
}

function errorMsg(msg, error) {
  const errorElement = document.querySelector("#errorMsg");
  errorElement.innerHTML += `<p>${msg}</p>`;
  if (typeof error !== "undefined") {
    console.error(error);
  }
}

async function makeCall(stream, localPeerConnection) {
  const receiverForm = document.querySelector("#form");
  const receiverID = receiverForm.querySelector("[name=receiverID]").value;

  // Make sure remoteVideo element is active
  const remoteVideoElement = document.querySelector("#remoteVideo");
  remoteVideoElement.style.display = "block";

  // Add the local stream to the connection
  stream
    .getTracks()
    .forEach((localTrack) => localPeerConnection.addTrack(localTrack, stream));
  console.log("Stream on client 1 side added to the connection: ", stream);

  // Create offer
  const localOffer = await localPeerConnection.createOffer();

  // Set that offer as local description
  await localPeerConnection.setLocalDescription(localOffer);
  console.log("Local description set");

  // Send offer
  socket.send(
    JSON.stringify({
      callerID: document.querySelector("#userID").textContent,
      receiverID: receiverID,
      type: "offer",
      sdp: localOffer.sdp,
    })
  );
  console.log(
    "This is localOffer: ",
    JSON.stringify({ type: "offer", sdp: localOffer.sdp })
  );
  console.log("Local offer send");

  // Listening for offers
  socket.addEventListener("message", async (message) => {
    const data = JSON.parse(message.data);
    console.log("Answer data: ", data);

    if (
      data.callerID === document.querySelector("#userID").textContent &&
      !localPeerConnection.currentRemoteDescription &&
      data.type === "answer"
    ) {
      // Set this offer as remote description
      await localPeerConnection.setRemoteDescription(
        new RTCSessionDescription(data)
      );
      console.log("Remote description set");
    }
  });

  // Listen for local ICE candidates on the local RTCPeerConnection
  localPeerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      console.log(event.candidate);

      socket.send(
        JSON.stringify({
          callerID: document.querySelector("#userID").textContent,
          receiverID: receiverID,
        })
      );
      //socket.send(JSON.stringify(event.candidate));
      console.log("Ice candidates send");
    }
  });

  socket.addEventListener("message", async (message) => {
    try {
      const data = JSON.parse(message.data);
      //console.log(data);
      if (
        data.callerID === document.querySelector("#userID").textContent &&
        data.candidate
      ) {
        try {
          await localPeerConnection.addIceCandidate(data.candidate);
        } catch (e) {
          console.error("Error adding received ice candidate", e);
        }
      }
    } catch (error) {
      console.error("Error parsing JSON:", error);
      handleError(error);
    }
  });
}

// RECEIVER //

// Listening for offers
socket.addEventListener("message", async (message) => {
  const data = JSON.parse(message.data);
  //console.log("This is a message: ", data);

  if (
    data.receiverID === document.querySelector("#userID").textContent &&
    data.type === "offer"
  ) {
    // Add the stream to the connection
    stream
      .getTracks()
      .forEach((localTrack) => peerConnection.addTrack(localTrack, stream));
    console.log("Stream on client 2 side added to the connection: ", stream);

    const callerID = data.callerID;

    // Set remote descripton
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
    console.log("Remote description set");
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    console.log("Local description set");
    console.log(
      "This is answer:",
      JSON.stringify({
        callerID: callerID,
        receiverID: document.querySelector("#userID").textContent,
        type: "answer",
        sdp: answer.sdp,
      })
    );
    socket.send(
      JSON.stringify({
        callerID: callerID,
        receiverID: document.querySelector("#userID").textContent,
        type: "answer",
        sdp: answer.sdp,
      })
    );

    // Listening for ice candidates
    peerConnection.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        console.log(event.candidate);

        socket.send(
          JSON.stringify({
            callerID: callerID,
            receiverID: document.querySelector("#userID").textContent,
            candidate: event.candidate,
          })
        );
        //socket.send(JSON.stringify(event.candidate));
        console.log("Ice candidates send");
      }
    });
  }
});

socket.addEventListener("message", async (message) => {
  try {
    const data = JSON.parse(message.data);
    //console.log(data);
    if (
      data.receiverID === document.querySelector("#userID").textContent &&
      data.candidate
    ) {
      try {
        await peerConnection.addIceCandidate(data.candidate);
      } catch (e) {
        console.error("Error adding received ice candidate", e);
      }
    }
  } catch (error) {
    console.error("Error parsing JSON:", error);
    handleError(error);
  }
});
// RECEIVER //

// Adding remote video
const remoteVideo = document.querySelector("#remoteVideo");

peerConnection.addEventListener("track", async (event) => {
  const [remoteStream] = event.streams;
  remoteVideo.srcObject = remoteStream;
  console.log("Remote video added: ", remoteStream);
});

// Listen for connectionstatechange
peerConnection.addEventListener("connectionstatechange", (event) => {
  if (peerConnection.connectionState === "connected") {
    console.log("Peers connected!");

    const endButton = document.querySelector("#endCall");
    endButton.style.display = "block";
  }
});

// Disconnection check
peerConnection.addEventListener("connectionstatechange", (event) => {
  if (peerConnection.connectionState === "disconnected") {
    console.log("Peer connection closed!");
    peerConnection.close();

    const localTracks = document
      .querySelector("#localVideo")
      .srcObject.getTracks();
    localTracks.forEach((track) => {
      track.stop();
    });

    const endCallButton = document.querySelector("#endCall");
    endCallButton.style.display = "none";
    // Close localVideo and remoteVideo element
    const localVideoElement = document.querySelector("#localVideo");
    localVideoElement.style.display = "none";
    const remoteVideoElement = document.querySelector("#remoteVideo");
    remoteVideoElement.style.display = "none";
  }
});
/*
            async function restoreRTC() {
              let peerConnection = new RTCPeerConnection();
              console.log("RTCPeerConnection created. Ready for new one.");
            }
      */
document.querySelector("#showVideo").addEventListener("click", () => {
  var stream = openCamera();
});

document.querySelector("#endCall").addEventListener("click", () => {
  closeCall();
});
