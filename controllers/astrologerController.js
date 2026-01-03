import Astrologer from "../models/Astrologer.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/* ======================
   REGISTER ASTROLOGER
====================== */
export const registerAstrologer = async (req, res) => {
  try {
    const { name, mobile, city, state, password } = req.body;

    if (!name || !mobile || !city || !state || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // 🔹 Check if mobile already exists
    const existing = await Astrologer.findOne({ mobile });
    if (existing) {
      return res.status(400).json({ success: false, message: "Mobile already registered" });
    }

    // 🔹 Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 🔹 Create astrologer
    const astrologer = await Astrologer.create({
      name,
      mobile,
      city,
      state,
      password: hashedPassword,
    });

    // 🔹 Create JWT token
    const token = jwt.sign(
      { id: astrologer._id, mobile: astrologer.mobile },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Astrologer registered successfully",
      astrologer: {
        id: astrologer._id,
        name: astrologer.name,
        mobile: astrologer.mobile,
        city: astrologer.city,
        state: astrologer.state,
      },
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================
   LOGIN ASTROLOGER
====================== */
export const loginAstrologer = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ success: false, message: "Mobile and Password are required" });
    }

    const astrologer = await Astrologer.findOne({ mobile });
    if (!astrologer) {
      return res.status(400).json({ success: false, message: "Invalid mobile or password" });
    }

    const isMatch = await bcrypt.compare(password, astrologer.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid mobile or password" });
    }

    const token = jwt.sign(
      { id: astrologer._id },
      process.env.JWT_SECRET ,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      astrologer: {
        id: astrologer._id,
        name: astrologer.name,
        mobile: astrologer.mobile,
        city: astrologer.city,
        state: astrologer.state,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const astrolist = async (req, res) => {
 const d=await Astrologer.find().select("name email  createdAt");
 res.json({success:true,astro:d});
};