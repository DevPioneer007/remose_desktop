const { desktopCapturer, ipcRenderer } = require("electron");
const socket = require("socket.io-client")("http://192.168.106.44:3000");
const peerConnection = new RTCPeerConnection();

window.onload = () => {
  const $ = require("jquery");
  const joinBtn = document.getElementById("join");
  const userNameInput = document.getElementById("user-name");
  const roomNameInput = document.getElementById("room-name");
  const localScreen = document.getElementById("local");
  const remoteScreen = document.getElementById("remote");
  const fullScreenBtn = document.getElementById("full");
  const modalBody = document.getElementById("modal-body");
  const requestAccessBtn = document.getElementById("request-access");
  const allowAccessBtn = document.getElementById("allow");
  const banAccessBtn = document.getElementById("ban-access");
  const shareBtn = document.getElementById("share");
  const selectedScreenIDInput = document.getElementById("selectedScreenID");
  let accessAllowed = false;

  const createOffer = () => {
    console.log("create offer");
    peerConnection
      .createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
      .then((sdp) => {
        peerConnection.setLocalDescription(sdp);
        socket.emit("offer", sdp);
      })
      .catch((error) => {
        console.log(error);
      });
  };
  const createAnswer = (sdp) => {
    peerConnection.setRemoteDescription(sdp).then(() => {
      console.log("answer set remote description success");
      peerConnection
        .createAnswer({
          offerToReceiveVideo: true,
          offerToReceiveAudio: true,
        })
        .then((sdp1) => {
          console.log("create answer");
          peerConnection.setLocalDescription(sdp1);
          socket.emit("answer", sdp1);
        })
        .catch((error) => {
          console.log(error);
        });
    });
  };
  const requestFullScreen = (element) => {
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
    console.log(element.controls, "controls");
    element.style.pointerEvents = "none";
  };
  const exitFullScreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  };

  // peer connection
  socket.on("connect", () => {
    console.log("connected with socket server");
  });
  socket.on("room_users", (data) => {
    console.log("join:", data);
    // createOffer();
  });
  socket.on("getOffer", (sdp) => {
    console.log("get offer:" + sdp);
    createAnswer(sdp);
  });
  socket.on("getAnswer", (sdp) => {
    console.log("get answer:" + sdp);
    peerConnection.setRemoteDescription(sdp);
  });

  peerConnection.onicecandidate = (e) => {
    if (e.candidate) {
      console.log("onicecandidate");
      socket.emit("candidate", e.candidate);
    }
  };
  peerConnection.oniceconnectionstatechange = (e) => {
    console.log(e);
  };
  peerConnection.ontrack = (e) => {
    console.log("add remote track success");
    if (remoteScreen) {
      remoteScreen.srcObject = e.streams[0];
      requestAccessBtn.style.display = "initial";
    }
  };

  // remote control
  socket.on("request-access", () => {
    $("#requestControl").modal("show");
  });
  ipcRenderer.on("SEND_DISPLAYS", async (e, displays) => {
    socket.on("mouse-move", (obj) => {
      const selectedDisplay = displays.find(
        (item) => item.id == selectedScreenIDInput.value
      );
      if (accessAllowed) {
        let x = obj.x;
        let y = obj.y;
        const { remoteDimension } = obj;
        let c = selectedDisplay.bounds.height;
        let d = selectedDisplay.bounds.width;
        let a = remoteDimension.height;
        let b = remoteDimension.width;
        let m = 0;
        let n = 0;

        n = (y * c) / a + selectedDisplay.bounds.y;
        m = (x * d) / b + selectedDisplay.bounds.x;
        ipcRenderer.send("mouse-move", { m, n });
      }
      // robot.moveMouse(m, n);
    });
  });
  socket.on("mouse-click", (obj) => {
    if (accessAllowed) {
      ipcRenderer.send("mouse-click", obj);
    }
  });
  socket.on("mouse-toggle", (obj) => {
    if (accessAllowed) {
      ipcRenderer.send("mouse-toggle", obj);
    }
  });
  socket.on("mouse-wheel", (obj) => {
    console.log({ accessAllowed, obj }, "socket-wheel");
    if (accessAllowed) {
      ipcRenderer.send("mouse-wheel", obj);
    }
  });
  socket.on("type", (obj) => {
    if (accessAllowed) {
      ipcRenderer.send("type", obj);
    }
  });

  // add event listeners to the video tag
  remoteScreen.addEventListener("mousemove", (e) => {
    e.preventDefault();
    var posX = remoteScreen.offsetLeft;
    var posY = remoteScreen.offsetTop;

    var x = e.pageX - posX;
    var y = e.pageY - posY;
    let remoteDimension = {
      width: remoteScreen.offsetWidth,
      height: remoteScreen.offsetHeight,
    };
    const room = localStorage.getItem("room-id") || "";
    var obj = { x, y, remoteDimension, room };
    socket.emit("mouse-move", obj);
  });
  remoteScreen.addEventListener("mousedown", (e) => {
    e.preventDefault();
    socket.emit("mouse-toggle", { upOrDown: "down", direction: e.which });
  });
  remoteScreen.addEventListener("mouseup", (e) => {
    socket.emit("mouse-toggle", { upOrDown: "up", direction: e.which });
  });
  remoteScreen.addEventListener("dblclick", (e) => {
    if (e.which === 1) {
      socket.emit("mouse-dblclick");
    }
  });
  remoteScreen.addEventListener("wheel", (e) => {
    const { deltaX, deltaY } = e;
    socket.emit("mouse-wheel", { deltaX, deltaY });
  });
  window.addEventListener("keyup", (e) => {
    let modifier = [];

    //for combination keys
    if (e.altKey) {
      modifier.push("alt");
    }
    if (e.shiftKey) {
      modifier.push("shift");
    }
    if (e.ctrlKey) {
      modifier.push("control");
    }
    if (e.metaKey) {
      modifier.push("meta");
    }
    if (e.key == "Meta") {
      e.key = "command";
    }
    var obj = { key: e.key == "Meta" ? "command" : e.key, modifier };
    socket.emit("type", obj);
  });

  desktopCapturer
    .getSources({
      types: [
        "screen",
        // "window",
      ],
    })
    .then(async (sources) => {
      sources.forEach((obj) => {
        const optionElement = document.createElement("div");
        const spanElement = document.createElement("h5");
        const inputElement = document.createElement("input");

        spanElement.innerText = `${
          obj.name.split(" - ")[obj.name.split(" - ").length - 1]
        }`;
        spanElement.style.textAlign = "center";

        const imgElement = document.createElement("img");
        imgElement.src = obj.thumbnail.toDataURL();
        imgElement.style.width = "160px";
        imgElement.style.height = "auto";

        imgElement.addEventListener("click", async (e) => {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: obj.id, // screen share source id
                minWidth: 1280,
                maxWidth: 1280,
                minHeight: 720,
                maxHeight: 720,
              },
            },
          });
          localScreen.srcObject = stream;
          stream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, stream);
          });
          selectedScreenIDInput.value = obj.display_id;
          createOffer();
          $("#screenSelector").modal("hide");
        });

        inputElement.value = `${obj.name}`;
        inputElement.style.display = "none";

        optionElement.appendChild(spanElement);
        optionElement.appendChild(imgElement);
        optionElement.appendChild(inputElement);

        modalBody.appendChild(optionElement);
      });
    })
    .catch((err) => console.log(err));

  // Event listener to toggle full screen on key press
  fullScreenBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (document.fullscreenElement) {
      exitFullScreen();
    } else {
      requestFullScreen(remoteScreen);
    }
  });
  joinBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (userNameInput.value === "" || roomNameInput.value === "") {
      alert("Please input the user and room names");
    } else {
      localStorage.setItem("room-id", roomNameInput.value);
      socket.emit("join", {
        name: userNameInput.value,
        room: roomNameInput.value,
      });
    }
  });
  requestAccessBtn.addEventListener("click", (e) => {
    e.preventDefault();
    socket.emit("request-access");
  });
  banAccessBtn.addEventListener("click", (e) => {
    e.preventDefault();
    accessAllowed = false;
  });
  shareBtn.addEventListener("click", (e) => {
    createOffer();
  });
  allowAccessBtn.addEventListener("click", () => {
    // socket.emit("access-allowed");
    accessAllowed = true;
    banAccessBtn.style.display = "initial";
  });
};
