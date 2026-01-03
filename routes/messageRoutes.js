import express from "express";
import Message from "../models/Message.js";
import User from "../models/ChatUser.js";

const router = express.Router();

/* ================= USERS LIST FOR ASTRO ================= */
router.get("/users/:astroId", getAstroChatUsers);

/* ================= LAST MESSAGE ================= */
router.get("/last/:senderId/:receiverId", async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;

    const lastMessage = await Message.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(lastMessage || null);
  } catch (err) {
    console.error(err);
    return res.status(500).json(null);
  }
});

/* ================= GET MESSAGES BETWEEN TWO USERS ================= */
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
    res.status(500).json({ success: false });
  }
});

/* ================= SAVE MESSAGE ================= */
router.post("/", async (req, res) => {
  const { text, senderId, receiverId } = req.body;

  if (!text || !senderId || !receiverId) {
    return res.status(400).json({
      success: false,
      message: "text, senderId and receiverId are required",
    });
  }

  try {
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
    res.status(500).json({ success: false });
  }
});

/* ================= CONTROLLER ================= */
async function getAstroChatUsers(req, res) {
  try {
    const { astroId } = req.params;

    const messages = await Message.find({
      $or: [{ senderId: astroId }, { receiverId: astroId }],
    }).select("senderId receiverId");

    const userIds = new Set();

    messages.forEach((msg) => {
      if (msg.senderId.toString() !== astroId)
        userIds.add(msg.senderId.toString());
      if (msg.receiverId.toString() !== astroId)
        userIds.add(msg.receiverId.toString());
    });

    const users = await User.find({
      _id: { $in: [...userIds] },
    }).select("name image");

    return res.status(200).json({ users });
  } catch (error) {
    console.error("getAstroChatUsers error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export default router;
