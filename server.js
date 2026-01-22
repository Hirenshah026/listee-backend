import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import publicRoutes from "./routes/publicRoutes.js";
import protectedRoutes from "./routes/protectedRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import User from "./models/ChatUser.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
connectDB();

app.use("/api", publicRoutes);
app.use("/api", protectedRoutes);
app.use("/api/messages", messageRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"]
});

let userSocketMap = {}; 
let liveRooms = {}; 
let chatSessions = {};

io.on("connection", (socket) => {
  // --- Registration ---
  socket.on("join", (userId) => {
    if (!userId) return;
    socket.join(userId);
    userSocketMap[userId] = socket.id;
  });

  // --- Live Stream Logic (Fix) ---
  socket.on("join-live-room", ({ astroId, role }) => {
    const roomName = `live_room_${astroId}`;
    socket.join(roomName);
    
    if (!liveRooms[astroId]) liveRooms[astroId] = new Set();
    liveRooms[astroId].add(socket.id);

    // Update count for everyone
    io.to(roomName).emit("update-viewers", liveRooms[astroId].size);

    if (role === "viewer") {
      const astroSocketId = userSocketMap[astroId];
      if (astroSocketId) io.to(astroSocketId).emit("new-viewer", { viewerId: socket.id });
    }
  });

  socket.on("send-message", (data) => {
    const targetRoom = data.roomId || `live_room_${data.astroId}`;
    io.to(targetRoom).emit("receive-message", data); // Pure room ko jayega
  });

  // --- WebRTC Signaling ---
  socket.on("send-offer-to-viewer", ({ to, offer }) => {
    io.to(to).emit("offer-from-astro", { offer, from: socket.id });
  });

  socket.on("answer-to-astro", ({ to, answer }) => {
    io.to(to).emit("answer-from-viewer", { from: socket.id, answer });
  });

  socket.on("ice-candidate", (data) => {
    if (data.to) io.to(data.to).emit("ice-candidate", { candidate: data.candidate, from: socket.id });
  });

  // --- Timer & One-to-One Chat ---
  socket.on("sendMessage", (message) => {
    const receiverSocketId = userSocketMap[message.receiverId];
    if (receiverSocketId) io.to(receiverSocketId).emit("receiveMessage", message);
  });

  // --- Disconnect Cleanup ---
  socket.on("disconnect", () => {
    for (const astroId in liveRooms) {
      if (liveRooms[astroId].has(socket.id)) {
        liveRooms[astroId].delete(socket.id);
        io.to(`live_room_${astroId}`).emit("update-viewers", liveRooms[astroId].size);
      }
    }
    for (const uid in userSocketMap) {
      if (userSocketMap[uid] === socket.id) delete userSocketMap[uid];
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => console.log(`Server running on ${PORT}`));
