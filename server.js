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

/* ---------- middlewares ---------- */
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use("/uploads_mess", express.static("uploads_mess"));

/* ---------- DB ---------- */
connectDB();

/* ---------- routes ---------- */
app.use("/api", publicRoutes);
app.use("/api", protectedRoutes);
app.use("/api/messages", messageRoutes);

/* ---------- SOCKET SETUP ---------- */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const chatSessions = {};
/* ---------- SOCKET LOGIC ---------- */
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  // --- REAL CHATTING LOGIC ---
  socket.on("sendMessage", (message) => {
    if (!message?.receiverId || !message?._id) return;
    io.to(message.receiverId).emit("receiveMessage", message);
  });

  // --- REAL VOIP/VIDEO CALL SIGNALING (WebRTC) ---

  // 1. Jab Astro call start karega
  socket.on("call-user", ({ to, offer, from, type }) => {
    console.log(`Call offer from ${from} to ${to} (${type})`);
    io.to(to).emit("call-made", { offer, from, type });
  });

  // 2. Jab User call uthayega (Answer)
  socket.on("make-answer", ({ to, answer }) => {
    console.log(`Answer made to ${to}`);
    io.to(to).emit("answer-made", { answer });
  });

  // 3. Internet connectivity (ICE Candidates) exchange karna
  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", { candidate });
  });

  // 4. Call katne par
  socket.on("end-call", ({ to }) => {
    console.log(`Call ended for ${to}`);
    io.to(to).emit("call-ended");
  });

  //--------
  socket.on("start-chat-timer", ({ userId, astroId, initialTime }) => {
    const roomId = [userId, astroId].sort().join("_");
    socket.join(roomId);

    if (!chatSessions[roomId]) {
      chatSessions[roomId] = {
        timeLeft: initialTime, 
        interval: setInterval(async () => { // async banaya taaki DB update ho sake
          if (chatSessions[roomId].timeLeft > 0) {
            chatSessions[roomId].timeLeft -= 1;
            io.to(roomId).emit("timer-update", { timeLeft: chatSessions[roomId].timeLeft });
          } else {
            // --- TIMER KHATAM HONE PAR ---
            clearInterval(chatSessions[roomId].interval);
            
            try {
              // 1. Database mein user ka freeChatTime 0 kar do
              await User.findByIdAndUpdate(userId, { 
                freeChatTime: 0, 
                
              });
              console.log(`User ${userId} ka free chat time khatam aur DB update ho gaya.`);
              
              // 2. Dono ko batao ki chat khatam ho gayi
              io.to(roomId).emit("timer-ended");
            } catch (err) {
              console.error("DB Update Error:", err);
            }

            delete chatSessions[roomId];
          }
        }, 1000)
      };
    } else {
      socket.emit("timer-update", { timeLeft: chatSessions[roomId].timeLeft });
    }
  });
  //-------
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

/* ---------- SERVER ---------- */
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});