import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import publicRoutes from "./routes/publicRoutes.js";
import protectedRoutes from "./routes/protectedRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";

dotenv.config();

const app = express();

/* ---------- middlewares ---------- */
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

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

/* ---------- SOCKET LOGIC ---------- */
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  /**
   * IMPORTANT:
   * frontend se jo message aata hai
   * wahi exact object emit karna hai
   */
  socket.on("sendMessage", (message) => {
    if (!message?.receiverId || !message?._id) return;

    // ❌ sender ko mat bhejo (sender already UI me add kar chuka hota hai)
    io.to(message.receiverId).emit("receiveMessage", message);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

/* ---------- SERVER ---------- */
const PORT = process.env.PORT || 5000;

server.listen(PORT,"0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
