import express from "express";
import Message from "../models/Message.js";
import User from "../models/ChatUser.js";
import Astrologer from "../models/Astrologer.js";
import multer from "multer"; // Multer ko sirf aise import karein

const router = express.Router();

/* ================= MULTER SETUP ================= */
// Storage setup (Ek baar declare karein)
const storage = multer.diskStorage({
  destination: "uploads_mess/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* ================= USERS LIST FOR ASTRO ================= */
router.get("/users/:astroId", getAstroChatUsers);
router.get("/usersby/:astroId", getAstroByChatUsers);

/* ================= LAST MESSAGE ================= */
router.get("/last/:senderId/:receiverId", async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;

    // 1. Sabse aakhiri message nikaalein
    const lastMessage = await Message.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    })
    .sort({ createdAt: -1 })
    .lean();

    // 2. Unread messages count karein 
    // (Wo messages jo 'senderId' ne bheje hain aur 'receiverId' ne abhi nahi padhe)
    const unreadCount = await Message.countDocuments({
      senderId: receiverId, // Saamne wala user
      receiverId: senderId, // Aap (Astro)
      read: false,
    });

    if (!lastMessage) {
      return res.status(200).json({ text: "No messages", unreadCount: 0 });
    }

    // Dono ko milakar bhejein
    return res.status(200).json({
      ...lastMessage,
      unreadCount: unreadCount,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});
router.post("/mark-read", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    // Saamne wale ke bheje gaye saare messages ko read: true kar do
    await Message.updateMany(
      { senderId: senderId, receiverId: receiverId, read: false },
      { $set: { read: true } }
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not mark as read" });
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

    res.json({ success: true, messages });
  } catch (err) {
    console.error("❌ Get Messages Error:", err);
    res.status(500).json({ success: false });
  }
});

/* ================= SAVE MESSAGE (Text + Optional Image) ================= */
router.post("/", upload.single("image"), async (req, res) => {
  const { text, senderId, receiverId } = req.body;

  if (!senderId || !receiverId) {
    return res.status(400).json({
      success: false,
      message: "senderId and receiverId are required",
    });
  }

  if (!text && !req.file) {
    return res.status(400).json({
      success: false,
      message: "Please provide either text or an image",
    });
  }

  try {
    // Check karo agar file aayi hai toh path banao
    const filePath = req.file ? `http://10.93.65.180:5000/uploads_mess/${req.file.filename}` : null;

    const message = await Message.create({
      text: text || "",
      senderId,
      receiverId,
      image: filePath,
    });

    res.json({ success: true, message });
  } catch (err) {
    console.error("❌ Save Message Error:", err);
    res.status(500).json({ success: false, message: err});
  }
});

/* ================= CONTROLLER FUNCTION ================= */
async function getAstroChatUsers(req, res) {
  try {
    const { astroId } = req.params;
    
    // 1. Astro se related saare messages nikaalein
    const messages = await Message.find({
      $or: [{ senderId: astroId }, { receiverId: astroId }],
    }).select("senderId receiverId");

    const userIds = new Set();
    messages.forEach((msg) => {
      if (msg.senderId.toString() !== astroId) userIds.add(msg.senderId.toString());
      if (msg.receiverId.toString() !== astroId) userIds.add(msg.receiverId.toString());
    });

    // 2. FIXED: Yahan "mobile" field ko bhi select mein add kiya hai
    // Agar aapke Model mein field ka naam "phone" hai, toh "name image phone" likhein
    const users = await User.find({
      _id: { $in: [...userIds] },
    }).select("name image mobile"); 

    return res.status(200).json({ users });
  } catch (error) {
    console.error("getAstroChatUsers error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
async function getAstroByChatUsers(req, res) {
  try {
    const { astroId } = req.params;
    
    // 1. Astro se related saare messages nikaalein
    const messages = await Message.find({
      $or: [{ senderId: astroId }, { receiverId: astroId }],
    }).select("senderId receiverId");

    const userIds = new Set();
    messages.forEach((msg) => {
      if (msg.senderId.toString() !== astroId) userIds.add(msg.senderId.toString());
      if (msg.receiverId.toString() !== astroId) userIds.add(msg.receiverId.toString());
    });

    // 2. FIXED: Yahan "mobile" field ko bhi select mein add kiya hai
    // Agar aapke Model mein field ka naam "phone" hai, toh "name image phone" likhein
    const users = await Astrologer.find({
      _id: { $in: [...userIds] },
    }).select("name image mobile"); 

    return res.status(200).json({ users });
  } catch (error) {
    console.error("getAstroChatUsers error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
export default router;
