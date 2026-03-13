import Mantra from '../models/Mantra.js';
import fs from "fs";
import path from "path";

// 1. Naya Mantra Post karna
export const createMantra = async (req, res) => {
  try {
    let { title, content, category, astroId, astroName } = req.body;

    console.log("File:", req.file);
    // Multer ke saath content string ban jata hai, use parse karna padega
    const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;

    const newMantra = new Mantra({
      title,
      content: parsedContent,
      category,
      astroId: astroId || req.user?._id,
      astroName: astroName || req.user?.name,
      image: req.file ? `/uploads/${req.file.filename}` : ""
    });

    await newMantra.save();
    res.status(201).json({ success: true, message: "Mantra saved!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 2. Mantra Edit (Update) karna - Purani Image Remove karne ke saath
export const updateMantra = async (req, res) => {
  try {
    const { id } = req.params;
    let { title, content } = req.body;

    // 1. Pehle purana mantra dhoondo image path ke liye
    const oldMantra = await Mantra.findById(id);
    if (!oldMantra) return res.status(404).json({ success: false, message: "Mantra nahi mila" });

    // 2. Content Parse karo
    const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;

    let updateFields = {
      title,
      content: parsedContent
    };

    // 3. Agar Nayi Image aayi hai
    if (req.file) {
      updateFields.image = `/uploads/${req.file.filename}`;

      // --- PURANI IMAGE DELETE LOGIC ---
      if (oldMantra.image) {
        const oldPath = path.join(process.cwd(), oldMantra.image);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath); // Purani file server se uda di
        }
      }
    }

    const updatedMantra = await Mantra.findByIdAndUpdate(id, updateFields, { new: true });
    res.status(200).json({ success: true, data: updatedMantra });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Update fail ho gaya" });
  }
};

// 3. Mantra Delete karna - Image bhi remove hogi
export const deleteMantra = async (req, res) => {
  try {
    const { id } = req.params;
    const mantra = await Mantra.findById(id);

    if (mantra && mantra.image) {
      const imagePath = path.join(process.cwd(), mantra.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath); // Server se image delete
      }
    }

    await Mantra.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Mantra deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Delete fail ho gaya" });
  }
};

// --- Baaki Functions (GetMantras, Like, etc.) same rahenge ---

export const getMantrasByAstro = async (req, res) => {
  try {
    const { astroId } = req.params;
    const mantras = await Mantra.find({ astroId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: mantras });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching data" });
  }
};

export const getMantraById = async (req, res) => {
  try {
    const { id } = req.params;
    const mantra = await Mantra.findById(id);
    if (!mantra) return res.status(404).json({ success: false, message: "Mantra nahi mila" });
    res.status(200).json({ success: true, data: mantra });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllMantras = async (req, res) => {
  try {
    const mantras = await Mantra.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: mantras });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleLike = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  try {
    const mantra = await Mantra.findById(id);
    if (!mantra) return res.status(404).json({ success: false, message: "Mantra not found" });
    const isLiked = mantra.likes.includes(userId);
    const updateQuery = isLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } };
    const updatedMantra = await Mantra.findByIdAndUpdate(id, updateQuery, { new: true });
    res.json({ success: true, isLiked: !isLiked, count: updatedMantra.likes.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};