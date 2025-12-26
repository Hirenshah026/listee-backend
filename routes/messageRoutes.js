import express from "express";
import Message from "../models/Message.js";

const router = express.Router();

/* ---------- Get messages between two users ---------- */
router.get("/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;

  try {
    const messages = await Message.find({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 },
      ],
    }).sort({ createdAt: 1 });

    res.json({
      success: true,
      messages,
    });
  } catch (err) {
    console.error("❌ Get Messages Error:", err);

    res.status(500).json({
      success: false,
      message: "Server error while fetching messages",
      error: err?.message || err,
      stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
    });
  }
});

/* ---------- Save a new message ---------- */
router.post("/", async (req, res) => {
  const { text, senderId, receiverId } = req.body;

  try {
    if (!text || !senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: "text, senderId and receiverId are required",
      });
    }

    const message = await Message.create({
      text,
      senderId,
      receiverId,
    });

    res.json({
      success: true,
      message,
    });
  } catch (err) {
    console.error("❌ Save Message Error:", err);

    res.status(500).json({
      success: false,
      message: "Server error while saving message",
      error: err?.message || err,
      stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
    });
  }
});


router.get("/last/:senderId/:receiverId", async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;

    const lastMessage = await Message.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    // ⚠️ IMPORTANT: empty chat → 200 + null (NOT 404)
    if (!lastMessage) {
      return res.status(200).json(null);
    }

    // ✅ frontend ko direct object mile
    res.status(200).json(lastMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json(null);
  }
});

export default router;
