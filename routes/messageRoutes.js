import mongoose from "mongoose";
import express from "express";
import Message from "../models/Message.js";
import User from "../models/ChatUser.js";
import Astrologer from "../models/Astrologer.js";
import multer from "multer";

const router = express.Router();

/* ================= MULTER SETUP ================= */
const storage = multer.diskStorage({
  destination: "uploads_mess/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

/* ================= CONTROLLER FUNCTIONS (Upar Define Karein) ================= */

// 1. Astrologer List nikalne ke liye (User side se Rajesh Kumar dikhega)
async function getAstroByChatUsers(req, res) {
  try {
    const { astroId } = req.params; // Ye login user ki ID hai

    // Messages dhoondo
    const messages = await Message.find({
      $or: [{ senderId: astroId }, { receiverId: astroId }],
    }).sort({ createdAt: -1 }).lean();

    if (!messages || messages.length === 0) {
      return res.status(200).json({ success: true, users: [] });
    }

    // Saamne wale ki IDs nikalo
    const participantIds = [...new Set(messages.map(msg => 
      msg.senderId.toString() === astroId ? msg.receiverId.toString() : msg.senderId.toString()
    ))];

    // String IDs ko ObjectId mein convert karo (Rajesh Kumar ko dhoondne ke liye)
    const objectIds = participantIds.map(id => new mongoose.Types.ObjectId(id));

    // Astrologer table mein search karo
    const astros = await Astrologer.find({ 
      _id: { $in: objectIds } 
    }).select("name image specialty mobile").lean();

    // Last message aur Time attach karo
    const finalData = await Promise.all(astros.map(async (astro) => {
      const aId = astro._id.toString();
      const lastMsg = await Message.findOne({
        $or: [
          { senderId: astroId, receiverId: aId },
          { senderId: aId, receiverId: astroId }
        ]
      }).sort({ createdAt: -1 }).lean();

      return {
        ...astro,
        lastMessage: lastMsg ? (lastMsg.text || "📷 Photo") : "",
        lastMessageTime: lastMsg ? lastMsg.createdAt : "0",
      };
    }));

    // Latest chat upar rakho
    finalData.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

    return res.status(200).json({ success: true, users: finalData });
  } catch (error) {
    console.error("Astro Fetch Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// 2. Customers nikalne ke liye (Astro side se)
async function getAstroChatUsers(req, res) {
  try {
    const { astroId } = req.params;
    const messages = await Message.find({
      $or: [{ senderId: astroId }, { receiverId: astroId }],
    }).select("senderId receiverId");

    const userIds = new Set();
    messages.forEach((msg) => {
      if (msg.senderId.toString() !== astroId) userIds.add(msg.senderId.toString());
      if (msg.receiverId.toString() !== astroId) userIds.add(msg.receiverId.toString());
    });

    const users = await User.find({
      _id: { $in: [...userIds] },
    }).select("name image mobile"); 

    return res.status(200).json({ users });
  } catch (error) {
    console.error("getAstroChatUsers error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

/* ================= ROUTES DEFINITION (Sequence Matters!) ================= */

// 1. Sabse pehle static/specific routes
router.get("/usersby/find/:astroId", getAstroByChatUsers);
router.get("/users/:astroId", getAstroChatUsers);

// 2. Last Message aur Mark Read
router.get("/last/:senderId/:receiverId", async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;
    const lastMessage = await Message.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    }).sort({ createdAt: -1 }).lean();

    const unreadCount = await Message.countDocuments({
      senderId: receiverId,
      receiverId: senderId,
      read: false,
    });

    if (!lastMessage) return res.status(200).json({ text: "No messages", unreadCount: 0 });

    return res.status(200).json({ ...lastMessage, unreadCount });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/mark-read", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    await Message.updateMany(
      { senderId, receiverId, read: false },
      { $set: { read: true } }
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Error" });
  }
});

// 3. Save Message
router.post("/", upload.single("image"), async (req, res) => {
  const { text, senderId, receiverId } = req.body;
  try {
    const filePath = req.file ? `http://10.93.65.180:5000/uploads_mess/${req.file.filename}` : null;
    const message = await Message.create({ text: text || "", senderId, receiverId, image: filePath });
    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

// 4. Sabse niche Dynamic Route (Taki /find wale ko ye catch na kare)
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
    res.status(500).json({ success: false });
  }
});

export default router;
