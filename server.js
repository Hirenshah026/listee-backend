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

// Middlewares
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use("/uploads_mess", express.static("uploads_mess"));

// Database Connection
connectDB();

// API Routes
app.use("/api", publicRoutes);
app.use("/api", protectedRoutes);
app.use("/api/messages", messageRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// States
const chatSessions = {};
let userSocketMap = {}; 
let liveRooms = {}; 

io.on("connection", (socket) => {
  console.log("Socket Connected:", socket.id);

  // --- 1. REGISTRATION ---
  socket.on("join", (userId) => {
    if (!userId) return;
    socket.join(userId);
    userSocketMap[userId] = socket.id;
  });

  socket.on("register-user", (userId) => {
    userSocketMap[userId] = socket.id;
  });

  // --- 2. ONE-TO-ONE CHAT LOGIC ---
  socket.on("sendMessage", (message) => {
    if (!message?.receiverId) return;
    const receiverSocketId = userSocketMap[message.receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveMessage", message);
    }
  });

  // --- 3. CHAT TIMER LOGIC ---
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
            try {
              await User.findByIdAndUpdate(userId, { freeChatTime: 0 });
              io.to(roomId).emit("timer-ended");
            } catch (err) { console.error("Timer DB Error:", err); }
            delete chatSessions[roomId];
          }
        }, 1000)
      };
    }
  });

  // --- 4. LIVE STREAMING LOGIC (FIXED) ---
  socket.on("join-live-room", ({ astroId, role }) => {
    if (!astroId) return;
    const roomName = `live_room_${astroId}`;
    socket.join(roomName);
    
    if (!liveRooms[astroId]) liveRooms[astroId] = new Set();
    liveRooms[astroId].add(socket.id);

    // Count sabko bhejein
    io.to(roomName).emit("update-viewers", liveRooms[astroId].size);

    if (role === "viewer") {
      const astroSocketId = userSocketMap[astroId];
      if (astroSocketId) {
        io.to(astroSocketId).emit("new-viewer", { viewerId: socket.id });
      }
    }
  });

  socket.on("send-message", (data) => {
    const targetRoom = data.roomId || `live_room_${data.astroId}`;
    // io.to pure room ko broadcast karega (Host + All Viewers)
    io.to(targetRoom).emit("receive-message", data);
  });

  // --- 5. WEBRTC SIGNALING ---
  socket.on("send-offer-to-viewer", ({ to, offer }) => {
    io.to(to).emit("offer-from-astro", { offer, from: socket.id });
  });

  socket.on("answer-to-astro", ({ to, answer }) => {
    io.to(to).emit("answer-from-viewer", { from: socket.id, answer });
  });

  socket.on("ice-candidate", (data) => {
    if (data.to) {
      io.to(data.to).emit("ice-candidate", { candidate: data.candidate, from: socket.id });
    }
  });

  socket.on("disconnect", () => {
    Object.keys(liveRooms).forEach(astroId => {
      if (liveRooms[astroId].has(socket.id)) {
        liveRooms[astroId].delete(socket.id);
        io.to(`live_room_${astroId}`).emit("update-viewers", liveRooms[astroId].size);
      }
    });
    for (const [uid, sid] of Object.entries(userSocketMap)) {
      if (sid === socket.id) { delete userSocketMap[uid]; break; }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
