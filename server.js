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

/* -------------------- SOCKET SERVER -------------------- */
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

/* -------------------- STATE -------------------- */

// userId => socketId
const userSocketMap = {};

// chat timer storage
const chatSessions = {};

/* -------------------- SOCKET EVENTS -------------------- */
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  /* ---------- REGISTER USER / ASTRO ---------- */
  socket.on("join", (userId) => {
    if (!userId) return;
    userSocketMap[userId] = socket.id;
    socket.userId = userId;
    console.log(`✅ Registered ${userId} → ${socket.id}`);
  });

  socket.on("register-user", (userId) => {
    if (!userId) return;
    userSocketMap[userId] = socket.id;
  });

  /* ---------- CHAT MESSAGE ---------- */
  socket.on("sendMessage", (message) => {
    if (!message?.receiverId) return;
    const receiverSocket = userSocketMap[message.receiverId];
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

  /* ---------- 1-ON-1 CALL ---------- */
  socket.on("call-user", ({ to, offer }) => {
    io.to(to).emit("call-made", { from: socket.id, offer });
  });

  socket.on("make-answer", ({ to, answer }) => {
    io.to(to).emit("answer-made", { from: socket.id, answer });
  });

  socket.on("end-call", ({ to }) => {
    io.to(to).emit("call-ended");
  });

  /* =====================================================
     =============== LIVE STREAM (ASTRO) =================
     ===================================================== */

  /* Viewer joins astro live */
  socket.on("join-live-room", ({ astroId }) => {
    const astroSocketId = userSocketMap[astroId];
    if (!astroSocketId) {
      console.log("❌ Astro offline:", astroId);
      return;
    }

    console.log(`👀 Viewer ${socket.id} joined astro ${astroId}`);
    io.to(astroSocketId).emit("new-viewer", {
      viewerId: socket.id
    });
  });

  /* Astro sends offer to viewer */
  socket.on("send-offer-to-viewer", ({ to, offer }) => {
    io.to(to).emit("offer-from-astro", {
      from: socket.id,
      offer
    });
  });

  /* Viewer sends answer */
  socket.on("answer-to-astro", ({ to, answer }) => {
    io.to(to).emit("answer-from-viewer", {
      from: socket.id,
      answer
    });
  });

  /* ICE candidates (shared) */
  socket.on("ice-candidate", ({ to, candidate }) => {
    if (to && candidate) {
      io.to(to).emit("ice-candidate", { candidate });
    }
  });

  /* ---------- DISCONNECT ---------- */
  socket.on("disconnect", () => {
    if (socket.userId) {
      delete userSocketMap[socket.userId];
    }
    console.log("❌ Socket disconnected:", socket.id);
  });
});

/* -------------------- START SERVER -------------------- */
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
