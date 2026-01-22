import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import User from "./models/ChatUser.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
connectDB();

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"]
});

let userSocketMap = {}; 
let liveRooms = {}; 
let chatSessions = {};

io.on("connection", (socket) => {
  // 1. Connection & Mapping
  socket.on("join", (userId) => {
    if (!userId) return;
    userSocketMap[userId] = socket.id;
    socket.join(userId);
  });

  // 2. Live Stream Room Entry
  socket.on("join-live-room", ({ astroId, role }) => {
    const roomName = `live_room_${astroId}`;
    socket.join(roomName);
    
    if (!liveRooms[astroId]) liveRooms[astroId] = new Set();
    liveRooms[astroId].add(socket.id);

    // Ye line count fix karegi (Host aur Viewer dono ke liye)
    io.to(roomName).emit("update-viewers", liveRooms[astroId].size);

    if (role === "viewer") {
      const astroSocketId = userSocketMap[astroId];
      if (astroSocketId) io.to(astroSocketId).emit("new-viewer", { viewerId: socket.id });
    }
  });

  // 3. CHAT FIX: Sabko message dikhane ke liye
  socket.on("send-message", (data) => {
    const roomName = data.roomId || `live_room_${data.astroId}`;
    // io.to(roomName).emit ensures sender and receiver both get it
    io.to(roomName).emit("receive-message", data);
  });

  // 4. Timer Logic (Aapka Purana Logic)
  socket.on("start-chat-timer", ({ userId, astroId, initialTime }) => {
    const roomId = [userId, astroId].sort().join("_");
    socket.join(roomId);
    if (!chatSessions[roomId]) {
      chatSessions[roomId] = {
        timeLeft: initialTime,
        interval: setInterval(async () => {
          if (chatSessions[roomId].timeLeft > 0) {
            chatSessions[roomId].timeLeft -= 1;
            io.to(roomId).emit("timer-update", { timeLeft: chatSessions[roomId].timeLeft });
          } else {
            clearInterval(chatSessions[roomId].interval);
            await User.findByIdAndUpdate(userId, { freeChatTime: 0 });
            io.to(roomId).emit("timer-ended");
            delete chatSessions[roomId];
          }
        }, 1000)
      };
    }
  });

  // 5. WebRTC Signaling
  socket.on("send-offer-to-viewer", ({ to, offer }) => io.to(to).emit("offer-from-astro", { offer, from: socket.id }));
  socket.on("answer-to-astro", ({ to, answer }) => io.to(to).emit("answer-from-viewer", { from: socket.id, answer }));
  socket.on("ice-candidate", (data) => { if (data.to) io.to(data.to).emit("ice-candidate", { candidate: data.candidate, from: socket.id }); });

  socket.on("disconnect", () => {
    for (const astroId in liveRooms) {
      if (liveRooms[astroId].has(socket.id)) {
        liveRooms[astroId].delete(socket.id);
        io.to(`live_room_${astroId}`).emit("update-viewers", liveRooms[astroId].size);
      }
    }
  });
});

server.listen(process.env.PORT || 5000, "0.0.0.0");
