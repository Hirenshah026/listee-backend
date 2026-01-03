import User from "../models/ChatUser.js";
import jwt from "jsonwebtoken";

const generateToken = (id) => {
  return jwt.sign(
    { id : id},
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export const mobileAuth = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile || mobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number",
      });
    }

    let user = await User.findOne({ mobile });

    // 👉 LOGIN
    if (user) {
      const token = generateToken(user._id);
      return res.status(200).json({
        success: true,
        exists: true,
        token,
        role: 'chatuser',
      });
    }

    // 👉 REGISTER
    user = await User.create({ mobile });
    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      exists: false,
      token,
      role: 'chatuser',
    });
  } catch (error) {
    console.error("Mobile Auth Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};
