const socket = new WebSocket("ws://localhost:8080/");
//const socket = new WebSocket("ws://192.168.1.235:8080/");

const localVideo = document.querySelector("#localVideo");
const remoteVideo = document.querySelector("#remoteVideo");
localVideo.style.display = "none";
remoteVideo.style.display = "none";

const form = document.querySelector("#form");
const cameraButton = document.querySelector("#showVideo");
const endCallButton = document.querySelector("#endCall");
endCallButton.disabled = true;
cameraButton.disabled = false;
form.style.display = "block";

const userID = document.querySelector("#userID");
let receiverID;

const errorElement = document.querySelector("#errorMsg");

let peerConnection;
let stream;

const constraints = (window.constraints = {
  audio: false, //{ echoCancellation: true },
  video: {
    width: 640,
    height: 480,
  },
});

/*
const iceConfiguration = {
  iceServers: [
    {
      urls: process.env.URL,
      username: process.env.USERNAME,
      credential: process.env.PASSWORD,
    },
  ],
};
*/

cameraButton.addEventListener("click", () => {
  openCamera();
});

endCallButton.addEventListener("click", () => {
  closeCall();
});

socket.addEventListener("open", () => {
  console.log("I am connected!");
});

// WebSocket message handler
socket.addEventListener("message", (message) => {
  const data = JSON.parse(message.data);
  if (data.type === "id") {
    const myID = data.id;
    console.log("This is my ID:", myID);

    userID.textContent = myID.toString();
  } else if (data.type === "callResponse") {
    if (localVideo.srcObject !== null && localVideo.srcObject.active === true) {
      makeCall();
    } else {
      errorMsg("First you need to open your camera!");
      console.log("First you need to open your camera!");
    }
  } else if (data.type === "callRequest") {
    if (confirm(`Call from: ${data.userID}`)) {
      if (!peerConnection) {
        if (
          localVideo.srcObject !== null &&
          localVideo.srcObject.active === true
        ) {
          receiverID = data.userID;
          takeTheCall();
          socket.send(
            JSON.stringify({
              toUserID: receiverID,
              type: "callResponse",
            })
          );
        } else {
          errorMsg("First you need to open your camera!");
          console.log("First you need to open your camera!");

          socket.send(
            JSON.stringify({
              toUserID: data.userID,
              type: "callRejected",
            })
          );
        }
      } else {
        console.log("First you need to end current call!");
        errorMsg("First you need to end current call!");

        socket.send(
          JSON.stringify({
            toUserID: data.userID,
            type: "callRejected",
          })
        );
      }
    } else {
      console.log("Call request rejected!");
      errorMsg("Call request rejected!");

      socket.send(
        JSON.stringify({
          toUserID: data.userID,
          type: "callRejected",
        })
      );
    }
  } else if (data.type === "callRejected") {
    console.log("Call was rejected by callee!");
    errorMsg("Call was rejected by callee!");
  }
});

// Camera handler
async function openCamera() {
  try {
    // Make sure localVideo element is active
    localVideo.style.display = "block";

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    const videoTracks = stream.getVideoTracks();
    console.log("Got stream with constraints:", constraints);
    console.log(`Using video device: ${videoTracks[0].label}`);
    window.stream = stream; // make variable available to browser console
    localVideo.srcObject = stream;

    cameraButton.disabled = true;
  } catch (error) {
    console.log("Error in opening camera!");
    handleError(error);
  }
}

async function closeCall() {
  try {
    const localTracks = localVideo.srcObject.getTracks();
    localTracks.forEach((track) => {
      track.stop();
    });
    const remoteTracks = remoteVideo.srcObject.getTracks();
    remoteTracks.forEach((track) => {
      track.stop();
    });

    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
      console.log("Peer connection closed!");
    }
    // Close video elements
    localVideo.style.display = "none";
    remoteVideo.style.display = "none";

    cameraButton.disabled = false;
    endCallButton.disabled = true;

    form.style.display = "block";
  } catch (error) {
    console.error("Cannot end the call:", error);
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
  errorElement.innerHTML = `<p>${msg}</p>`;
  if (typeof error !== "undefined") {
    console.error(error);
  }
}

async function sendCallRequest() {
  try {
    if (localVideo.srcObject !== null && localVideo.srcObject.active === true) {
      const receiverForm = document.querySelector("#form");
      receiverID = receiverForm.querySelector("[name=receiverID]").value;

      socket.send(
        JSON.stringify({
          userID: userID.textContent,
          toUserID: receiverID,
          type: "callRequest",
        })
      );
    } else {
      errorMsg("First you need to open your camera!");
      console.log("First you need to open your camera!");
    }
  } catch (error) {
    errorMsg("Can not send call request!");
    console.log("Can not send call request!");
  }
}

async function makeCall() {
  // Create an RTCPeerConnection
  peerConnection = new RTCPeerConnection();
  console.log("RTCPeerConnection created");

  try {
    // Make sure remoteVideo element is active
    remoteVideo.style.display = "block";

    // Add the local stream to the connection
    stream
      .getTracks()
      .forEach((localTrack) => peerConnection.addTrack(localTrack, stream));
    console.log("Stream on client 1 side added to the connection: ", stream);

    peerConnection.addEventListener("negotiationneeded", async () => {
      try {
        // Create offer
        const localOffer = await peerConnection.createOffer();

        // Set that offer as local description
        await peerConnection.setLocalDescription(localOffer);
        console.log("Local description set");

        // Send offer
        socket.send(
          JSON.stringify({
            toUserID: receiverID,
            type: "offer",
            sdp: localOffer.sdp,
          })
        );
        console.log(
          "This is localOffer: ",
          JSON.stringify({ type: "offer", sdp: localOffer.sdp })
        );
        console.log("Local offer send");
      } catch (error) {
        console.error("Error in start of negotiation:", error);
      }
    });

    socket.addEventListener("message", async (message) => {
      try {
        const data = JSON.parse(message.data);
        // Listening for answer
        if (
          (!peerConnection.currentRemoteDescription ||
            peerConnection.currentRemoteDescription === null) &&
          data.type === "answer"
        ) {
          console.log("This is answer: ", data);
          try {
            // Set this answer as remote description
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(data)
            );
            console.log("Remote description set");
          } catch (error) {
            console.error("Error adding remote descriprtion:", error);
          }
          // Listening for candidates
        } else if (data.candidate) {
          console.log("I received candidate:", data);
          try {
            await peerConnection.addIceCandidate(data.candidate);
          } catch (e) {
            console.error("Error adding received ice candidate", e);
          }
        }
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    });

    // Listen for local ICE candidates on the local RTCPeerConnection
    peerConnection.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        console.log(event.candidate);

        socket.send(
          JSON.stringify({
            toUserID: receiverID,
            candidate: event.candidate,
          })
        );
        console.log("Ice candidates send");
      }
    });

    // Adding remote video
    peerConnection.addEventListener("track", async (event) => {
      try {
        const [remoteStream] = event.streams;
        remoteVideo.srcObject = remoteStream;
        console.log("Remote video added: ", remoteStream);
      } catch (error) {
        console.error("Error adding remote video:", error);
      }
    });

    // Listen for connectionstatechange
    peerConnection.addEventListener("connectionstatechange", () => {
      // Connection check
      if (peerConnection.connectionState === "connected") {
        console.log("Peers connected!");

        form.style.display = "none";
        endCallButton.disabled = false;
        errorElement.innerHTML = `<p></p>`;
      }
      // Disconnection check
      if (peerConnection.connectionState === "disconnected") {
        closeCall();
      }
    });

    // Listen for iceconnectionstatechange
    peerConnection.addEventListener("iceconnectionstatechange", () => {
      // ICE fail check
      if (peerConnection.iceConnectionState === "failed") {
        peerConnection.restartIce();
      }
      // ICE agent closed check
      if (peerConnection.iceConnectionState === "closed") {
        closeCall();
      }
    });
  } catch (error) {
    console.error("Error in making call:", error);
  }
}

async function takeTheCall() {
  // Make sure remoteVideo element is active
  remoteVideo.style.display = "block";

  // Create an RTCPeerConnection
  peerConnection = new RTCPeerConnection();
  console.log("RTCPeerConnection created");

  // Add the stream to the connection
  stream
    .getTracks()
    .forEach((localTrack) => peerConnection.addTrack(localTrack, stream));
  console.log("Stream on client 2 side added to the connection: ", stream);

  // Listening for offers
  socket.addEventListener("message", async (message) => {
    try {
      const data = JSON.parse(message.data);

      if (
        (!peerConnection.currentRemoteDescription ||
          peerConnection.currentRemoteDescription === null) &&
        data.type === "offer"
      ) {
        console.log("This is offer:", data);
        try {
          // Set remote descripton
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data)
          );
          console.log("Remote description set");
          try {
            // Create answer and set local description
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            console.log("Local description set");
            console.log(
              "This is answer:",
              JSON.stringify({
                type: "answer",
                sdp: answer.sdp,
              })
            );
            socket.send(
              JSON.stringify({
                toUserID: receiverID,
                type: "answer",
                sdp: answer.sdp,
              })
            );
          } catch (error) {
            console.error("Error setting local description:", error);
          }
        } catch (error) {
          console.error("Error setting remote description:", error);
        }
      } else if (data.candidate) {
        console.log("I received candidate:", data);
        try {
          await peerConnection.addIceCandidate(data.candidate);
        } catch (error) {
          console.error("Error adding received ice candidate:", error);
        }
      }
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }
  });

  // Listening for ice candidates
  peerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      console.log(event.candidate);

      socket.send(
        JSON.stringify({
          toUserID: receiverID,
          candidate: event.candidate,
        })
      );
      console.log("Ice candidates send");
    }
  });

  // Adding remote video
  peerConnection.addEventListener("track", async (event) => {
    try {
      const [remoteStream] = event.streams;
      remoteVideo.srcObject = remoteStream;
      console.log("Remote video added: ", remoteStream);
    } catch (error) {
      console.error("Error adding remote video:", error);
    }
  });

  // Listen for connectionstatechange
  peerConnection.addEventListener("connectionstatechange", () => {
    // Connection check
    if (peerConnection.connectionState === "connected") {
      console.log("Peers connected!");

      form.style.display = "none";
      endCallButton.disabled = false;
      errorElement.innerHTML = `<p></p>`;
    }

    if (peerConnection.connectionState === "failed") {
      peerConnection.restartIce();
    }

    // Disconnection check
    if (peerConnection.connectionState === "disconnected") {
      closeCall();
    }
  });

  // Listen for iceconnectionstatechange
  peerConnection.addEventListener("iceconnectionstatechange", () => {
    // ICE fail check
    if (peerConnection.iceConnectionState === "failed") {
      peerConnection.restartIce();
    }
    // ICE agent closed check
    if (peerConnection.iceConnectionState === "closed") {
      closeCall();
    }
  });
}
