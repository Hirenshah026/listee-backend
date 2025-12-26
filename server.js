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
    origin: "*", // frontend URL later yahan daal dena
    methods: ["GET", "POST"]
  }
});

/* ---------- SOCKET LOGIC ---------- */
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // user joins with userId
  socket.on("join", (userId) => {
    socket.join(userId); // room = userId
    console.log(`User ${userId} joined room`);
  });

  // send message
  socket.on("sendMessage", ({ senderId, receiverId, text }) => {
    io.to(receiverId).emit("receiveMessage", {
      senderId,
      receiverId,
      text,
      createdAt: new Date()
    });
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

/* ---------- SERVER ---------- */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
