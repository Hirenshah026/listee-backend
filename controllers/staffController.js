
import Staff from "../models/staffModel.js";
import jwt from "jsonwebtoken"

export const loginStaff = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Staff.findOne({ email });
    if (!user)
      return res.json({ success: false, message: "User not found" });

    const ok = password == user.password; // For production: use bcrypt.compare
    if (!ok)
      return res.json({ success: false, message: "Wrong password" });

    if (!user.active)
      return res.json({ success: false, message: "Blocked UserID Contact admin" });
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login Error:", err); // 🔹 Log full error
    res.status(500).json({
      success: false,
      message: err.message || "Server error", // 🔹 Return actual error message
    });
  }
};
export const forgotPasswordStaff = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await Staff.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "Email not found" });
    }

    // Email exists
    return res.json({ success: true, message: "Email verified!" });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export const ResetPasswordStaff =async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await Staff.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    // Simple update (plain text password, for demo)
    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password changed successfully!" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create Staff
export const createStaff = async (req, res) => {
  try {
    const { name, email, phone, role, active, show } = req.body;

    const exist = await Staff.findOne({ email });
    if (exist)
      return res.status(400).json({
        success: false,
        message: "Staff with this email already exists",
      });

    const staff = await Staff.create({
      name,
      email,
      phone,
      role,
      active,
      password,
      show,
    });

    res.json({ success: true, message: "Staff created successfully", staff });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get All Staff
export const getStaff = async (req, res) => {
  try {
    const staff = await Staff.find().sort({ createdAt: -1 });
    res.json({ success: true, staff });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get Single Staff
export const getSingleStaff = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff)
      return res.status(404).json({ success: false, message: "Staff not found" });

    res.json({ success: true, staff });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update Staff
export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, active, show,password } = req.body;

    const updated = await Staff.findByIdAndUpdate(
      id,
      { name, email, phone, role, active, show,password },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ success: false, message: "Staff not found" });

    res.json({ success: true, message: "Staff updated", staff: updated });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete Staff
export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findByIdAndDelete(id);

    if (!staff)
      return res.status(404).json({ success: false, message: "Staff not found" });

    res.json({ success: true, message: "Staff deleted" });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Toggle Active
export const toggleActiveStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await Staff.findById(id);
    if (!staff)
      return res.status(404).json({ success: false, message: "Staff not found" });

    staff.active = !staff.active;
    staff.show = staff.active; // if inactive → hide
    await staff.save();

    res.json({ success: true, message: "Status updated", staff });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
