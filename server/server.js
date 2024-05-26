const express = require("express");
const { Server } = require("socket.io");
const { createServer } = require("http");
const cors = require("cors");

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow requests from the frontend
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let rooms = {};
let socketToRoom = {};

app.use(cors());

io.on("connection", (socket) => {
  socket.on("join", (data = { room: "", name: "" }) => {
    // let a new user join to the room
    const roomId = data.room;
    socket.join(roomId);
    socketToRoom[socket.id] = roomId;

    // persist the new user in the room
    if (rooms[roomId]) {
      rooms[roomId].push({ id: socket.id, name: data.name });
    } else {
      rooms[roomId] = [{ id: socket.id, name: data.name }];
    }

    // sends a list of joined users to a new user
    const users = rooms[roomId].filter((user) => user.id !== socket.id);
    io.sockets.to(socket.id).emit("room_users", users);
    console.log("[joined] room:" + roomId + " name: " + data.name);
  });
  socket.on("offer", (sdp) => {
    socket.to(socketToRoom[socket.id]).emit("getOffer", sdp);
    console.log("offer: " + socket.id);
  });
  socket.on("answer", (sdp) => {
    socket.to(socketToRoom[socket.id]).emit("getAnswer", sdp);
    console.log("answer: " + socket.id);
  });
  socket.on("candidate", (candidate) => {
    socket.to(socketToRoom[socket.id]).emit("getCandidate", candidate);
    console.log("candidate: " + socket.id);
  });
  socket.on("disconnect", () => {
    const roomId = socketToRoom[socket.id];
    let room = rooms[roomId];
    if (room) {
      room = room.filter((user) => user.id !== socket.id);
      rooms[roomId] = room;
    }
    socket.broadcast.to(room).emit("user_exit", { id: socket.id });
    console.log(`[${socketToRoom[socket.id]}]: ${socket.id} exit`);
  });
  socket.on("chat message", (msg) => {
    console.log("message: " + msg);
    io.emit("chat message", msg);
  });

  // remote control
  socket.on("request-access", () => {
    socket.to(socketToRoom[socket.id]).emit("request-access");
  });
  socket.on("mouse-move", (data) => {
    socket.to(data.room).emit("mouse-move", data);
  });
  socket.on("mouse-dblclick", () => {
    console.log("mouse-dblclick");
    socket.to(socketToRoom[socket.id]).emit("mouse-dblclick");
  });
  socket.on("mouse-toggle", (data) => {
    console.log("mouse-toggle", data);
    socket.to(socketToRoom[socket.id]).emit("mouse-toggle", data);
  });
  socket.on("mouse-wheel", (data) => {
    console.log("mouse-wheel", data);
    socket.to(socketToRoom[socket.id]).emit("mouse-wheel", data);
  });
  socket.on("type", (data) => {
    console.log({ room: socketToRoom[socket.id], ...data }, "typed");
    socket.to(socketToRoom[socket.id]).emit("type", data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
