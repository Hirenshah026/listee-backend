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
app.use("/uploads", express.static("uploads"));
app.use("/uploads_mess", express.static("uploads_mess"));

connectDB();

app.use("/api", publicRoutes);
app.use("/api", protectedRoutes);
app.use("/api/messages", messageRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const chatSessions = {};
let userSocketMap = {}; // Sabse important mapping

io.on("connection", (socket) => {
  console.log("Socket Connected:", socket.id);

  // 1. REGISTER & JOIN (Sab ke liye common)
  socket.on("join", (userId) => {
    if (!userId) return;
    socket.join(userId);
    userSocketMap[userId] = socket.id; // User ID ko Socket ID se link kiya
    console.log(`User/Astro ${userId} joined and mapped`);
  });

  socket.on("register-user", (userId) => {
    userSocketMap[userId] = socket.id;
  });

  // 2. CHAT & MESSAGE LOGIC
  socket.on("sendMessage", (message) => {
    if (!message?.receiverId) return;
    io.to(message.receiverId).emit("receiveMessage", message);
  });

  socket.on("messages-read", ({ senderId, receiverId }) => {
    if (!senderId || !receiverId) return;
    io.to(senderId).emit("messages-read-update", { senderId, receiverId, read: true });
  });

  // 3. CHAT TIMER LOGIC
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
            } catch (err) { console.error(err); }
            delete chatSessions[roomId];
          }
        }, 1000)
      };
    }
  });

  // 4. --- 1-ON-1 CALL LOGIC (TERA PURANA CODE) ---
  socket.on("call-user", (data) => io.to(data.to).emit("call-made", data));
  socket.on("make-answer", (data) => io.to(data.to).emit("answer-made", data));
  socket.on("end-call", (data) => io.to(data.to).emit("call-ended"));

  // 5. --- LIVE STREAMING LOGIC (NAYA CODE) ---
  socket.on("join-live-room", ({ astroId }) => {
    const astroSocketId = userSocketMap[astroId];
    if (astroSocketId) {
      io.to(astroSocketId).emit("new-viewer", { viewerId: socket.id });
    }
  });

  socket.on("send-offer-to-viewer", ({ to, offer }) => {
    io.to(to).emit("offer-from-astro", { offer, from: socket.id });
  });

  socket.on("answer-to-astro", ({ to, answer }) => {
    io.to(to).emit("answer-from-viewer", { from: socket.id, answer });
  });

  // Common ICE Candidates (1-on-1 aur Live dono mein kaam aayega)
  socket.on("ice-candidate", (data) => {
    if (data.to) {
      io.to(data.to).emit("ice-candidate", data);
    }
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    for (const [userId, socketId] of Object.entries(userSocketMap)) {
      if (socketId === socket.id) {
        delete userSocketMap[userId];
        break;
      }
    }
    console.log("Disconnected:", socket.id);
  });
});

server.listen(5000, "0.0.0.0", () => console.log(`Server running on 5000`));
