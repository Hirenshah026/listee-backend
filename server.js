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

io.on("connection", (socket) => {
  console.log("Socket Connected:", socket.id);

  // Sabse Important: User join karega tabhi message milega
  socket.on("join", (userId) => {
    if (!userId) return;
    socket.join(userId);
    console.log(`User/Astro ${userId} joined their room`);
  });

  // Message bhejne ka sahi tareeka
  socket.on("sendMessage", (message) => {
    if (!message?.receiverId) return;
    // Receiver ko message bhejo
    io.to(message.receiverId).emit("receiveMessage", message);
    // console.log(`Message from ${message.senderId} sent to room ${message.receiverId}`);
  });

  // 1. Message Read logic (Add this inside io.on("connection"))
  socket.on("messages-read", ({ senderId, receiverId }) => {
    if (!senderId || !receiverId) return;

    // Jisne message bheja tha (senderId), usko batao ki receiver ne message padh liya hai
    io.to(senderId).emit("messages-read-update", {
      senderId: senderId,
      receiverId: receiverId,
      read: true
    });

    // console.log(`Read status updated: ${receiverId} read messages from ${senderId}`);
  });
  // Timer logic
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
    } else {
      socket.emit("timer-update", { timeLeft: chatSessions[roomId].timeLeft });
    }
  });

  // Call Signaling (WebRTC)
  socket.on("call-user", (data) => io.to(data.to).emit("call-made", data));
  socket.on("make-answer", (data) => io.to(data.to).emit("answer-made", data));
  socket.on("ice-candidate", (data) => io.to(data.to).emit("ice-candidate", data));
  socket.on("end-call", (data) => io.to(data.to).emit("call-ended"));

  socket.on("disconnect", () => console.log("Disconnected:", socket.id));
});

server.listen(5000, "0.0.0.0", () => console.log(`Server running on 5000`));