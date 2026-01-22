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

// Render Optimization: Polling and WebSocket both allowed
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
  transports: ["polling", "websocket"],
  allowEIO3:true,
  pingTimeout:60000,
  pingInterval:25000,
});

// States
const chatSessions = {};
let userSocketMap = {}; 
let liveRooms = {}; // { astroId: Set(viewerSocketIds) }

io.on("connection", (socket) => {
  console.log("Socket Connected:", socket.id);

  // --- 1. REGISTRATION & MAPPING ---
  socket.on("join", (userId) => {
    if (!userId) return;
    socket.join(userId);
    userSocketMap[userId] = socket.id;
    console.log(`User/Astro ${userId} mapped to socket ${socket.id}`);
  });

  socket.on("register-user", (userId) => {
    userSocketMap[userId] = socket.id;
  });

  // --- 2. ONE-TO-ONE CHAT LOGIC (IMPORTANT) ---
  socket.on("sendMessage", (message) => {
    if (!message?.receiverId) return;
    const receiverSocketId = userSocketMap[message.receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveMessage", message);
    }
  });

  socket.on("messages-read", ({ senderId, receiverId }) => {
    if (!senderId || !receiverId) return;
    const senderSocketId = userSocketMap[senderId];
    if (senderSocketId) {
      io.to(senderSocketId).emit("messages-read-update", { senderId, receiverId, read: true });
    }
  });

  // --- 3. CHAT TIMER LOGIC (IMPORTANT) ---
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

  // --- 4. ONE-TO-ONE VIDEO CALL LOGIC ---
  socket.on("call-user", (data) => {
    const receiverSocketId = userSocketMap[data.to];
    if (receiverSocketId) io.to(receiverSocketId).emit("call-made", data);
  });
  
  socket.on("make-answer", (data) => {
    const receiverSocketId = userSocketMap[data.to];
    if (receiverSocketId) io.to(receiverSocketId).emit("answer-made", data);
  });

  socket.on("end-call", (data) => {
    const receiverSocketId = userSocketMap[data.to];
    if (receiverSocketId) io.to(receiverSocketId).emit("call-ended");
  });

  // --- 5. LIVE STREAMING LOGIC (NAYA & ROBUST) ---
  socket.on("join-live-room", ({ astroId, role }) => {
    if (!astroId) return;
    const roomName = `live_room_${astroId}`;
    socket.join(roomName);
    
    console.log(`Live Room Join: ${socket.id} as ${role} in ${roomName}`);

    if (role === "viewer") {
      if (!liveRooms[astroId]) liveRooms[astroId] = new Set();
      liveRooms[astroId].add(socket.id);
      
      const astroSocketId = userSocketMap[astroId];
      if (astroSocketId) {
        io.to(astroSocketId).emit("new-viewer", { viewerId: socket.id });
      }
    }

    const currentCount = liveRooms[astroId] ? liveRooms[astroId].size : 0;
    io.to(roomName).emit("update-viewers", currentCount);
  });

  socket.on("send-message", (data) => {
  console.log("Message received on server:", data); // Isse Render logs mein check kar paoge
  
  const id = data.roomId || data.astroId;
  if (!id) return;

  // Simple logic: Agar prefix nahi hai toh add karo
  const targetRoom = id.toString().includes("live_room_") 
                     ? id.toString() 
                     : `live_room_${id}`;

  console.log(`Broadcasting to: ${targetRoom}`);
  
  // io.to use karna hai (socket.to nahi)
  io.to(targetRoom).emit("receive-message", data);
});

  socket.on("end-stream", ({ astroId }) => {
    const roomName = `live_room_${astroId}`;
    io.to(roomName).emit("stream-ended");
    delete liveRooms[astroId];
  });

  // --- 6. WEBRTC SIGNALING FOR LIVE ---
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

  // --- 7. CLEANUP ON DISCONNECT ---
  socket.on("disconnect", () => {
    // Live viewers cleanup
    Object.keys(liveRooms).forEach(astroId => {
      if (liveRooms[astroId].has(socket.id)) {
        liveRooms[astroId].delete(socket.id);
        io.to(`live_room_${astroId}`).emit("update-viewers", liveRooms[astroId].size);
      }
    });

    // Mapping cleanup
    for (const [uid, sid] of Object.entries(userSocketMap)) {
      if (sid === socket.id) {
        delete userSocketMap[uid];
        break;
      }
    }
    console.log("Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is flying on port ${PORT}`);
});
