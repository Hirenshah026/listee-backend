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
connectDB();

const app = express();

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json());

app.use("/uploads", express.static("uploads"));
app.use("/uploads_mess", express.static("uploads_mess"));

/* -------------------- API ROUTES -------------------- */
app.use("/api", publicRoutes);
app.use("/api", protectedRoutes);
app.use("/api/messages", messageRoutes);

/* -------------------- SERVER -------------------- */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

/* -------------------- STATE -------------------- */
// userId => socketId
const userSocketMap = {};
const chatSessions = {};

/* -------------------- SOCKET -------------------- */
io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  /* ---------- REGISTER USER / ASTRO ---------- */
  socket.on("join", (userId) => {
    if (!userId) return;
    userSocketMap[userId] = socket.id;
    socket.userId = userId;
    console.log(`✅ JOIN ${userId} → ${socket.id}`);
  });

  /* ---------- CHAT ---------- */
  socket.on("sendMessage", (message) => {
    const receiverSocket = userSocketMap[message?.receiverId];
    if (receiverSocket) {
      io.to(receiverSocket).emit("receiveMessage", message);
    }
  });

  socket.on("messages-read", ({ senderId, receiverId }) => {
    const senderSocket = userSocketMap[senderId];
    if (senderSocket) {
      io.to(senderSocket).emit("messages-read-update", {
        senderId,
        receiverId,
        read: true
      });
    }
  });

  /* ---------- CHAT TIMER ---------- */
  socket.on("start-chat-timer", ({ userId, astroId, initialTime }) => {
    const roomId = [userId, astroId].sort().join("_");
    socket.join(roomId);

    if (chatSessions[roomId]) return;

    chatSessions[roomId] = {
      timeLeft: initialTime,
      interval: setInterval(async () => {
        if (chatSessions[roomId].timeLeft > 0) {
          chatSessions[roomId].timeLeft--;
          io.to(roomId).emit("timer-update", {
            timeLeft: chatSessions[roomId].timeLeft
          });
        } else {
          clearInterval(chatSessions[roomId].interval);
          await User.findByIdAndUpdate(userId, { freeChatTime: 0 });
          io.to(roomId).emit("timer-ended");
          delete chatSessions[roomId];
        }
      }, 1000)
    };
  });

  /* =====================================================
     ================= LIVE STREAM ======================
     ===================================================== */

  // VIEWER joins astro live
  socket.on("join-live-room", ({ astroId }) => {
    const astroSocketId = userSocketMap[astroId];

    console.log("👀 Viewer", socket.id, "wants astro", astroId);

    if (!astroSocketId) {
      console.log("❌ Astro offline");
      return;
    }

    io.to(astroSocketId).emit("new-viewer", {
      viewerId: socket.id
    });
  });

  // ASTRO sends offer to viewer
  socket.on("send-offer-to-viewer", ({ to, offer }) => {
    io.to(to).emit("offer-from-astro", {
      from: socket.id,
      offer
    });
  });

  // VIEWER sends answer to astro
  socket.on("answer-to-astro", ({ to, answer }) => {
    io.to(to).emit("answer-from-viewer", {
      from: socket.id,
      answer
    });
  });

  // ICE candidates (both sides)
  socket.on("ice-candidate", ({ to, candidate }) => {
    if (!to || !candidate) return;

    io.to(to).emit("ice-candidate", {
      from: socket.id,
      candidate
    });
  });

  /* ---------- DISCONNECT ---------- */
  socket.on("disconnect", () => {
    if (socket.userId) {
      delete userSocketMap[socket.userId];
    }

    socket.broadcast.emit("viewer-disconnected", {
      viewerId: socket.id
    });

    console.log("❌ Disconnected:", socket.id);
  });
});

/* -------------------- START -------------------- */
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
