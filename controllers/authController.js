import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            phone,
            whatsapp_no,
            address,
            city_id,
            city,
            profile,
            profile_clinic
        } = req.body;

        // Required field validation
        if (!name || !email || !password || !phone || !whatsapp_no || !city) {
            return res.status(400).json({ success: false, message: "All required fields must be filled" });
        }

        // Check if email exists
        const existEmail = await User.findOne({ email });
        if (existEmail) return res.status(400).json({ success: false, message: "Email already exists" });

        // Check if phone exists
        const existPhone = await User.findOne({ phone });
        if (existPhone) return res.status(400).json({ success: false, message: "Phone number already exists" });

        // Check if WhatsApp exists
        const existWhatsapp = await User.findOne({ whatsapp_no });
        if (existWhatsapp) return res.status(400).json({ success: false, message: "WhatsApp number already exists" });

        // Hash password
        const hash = await bcrypt.hash(password, 10);

        // Create doctor
        const doctor = await User.create({
            name,
            email,
            password: hash,
            role: "doctor",
            phone,
            whatsapp_no,
            address,
            city_id: city_id || null,
            city_name: city || null,
            profile: profile || null,
            profile_clinic: profile_clinic || null
        });

        res.status(201).json({ success: true, message: "Doctor registered successfully", doctor });
    } catch (error) {
        console.error("Error creating doctor:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.json({ success: false, message: "User not found" });
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.json({ success: false, message: "Wrong password" });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
        res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } });
    } catch { res.status(500).json({ success: false }); }
};

/// active doctors
export const toggleActiveDoc = async (req, res) => {
    try {
        const { id } = req.params;

        const role = await User.findById(id);
        if (!role) return res.status(404).json({ success: false, message: "Doctor not found" });

        role.active = !role.active;
        role.show = role.active;
        await role.save();

        res.json({ success: true, message: "Status updated", role });
    } catch {
        res.status(500).json({ success: false, message: "Server error" });
    }
};
export const updateDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const { name,email,phone,
            whatsapp_no,
            address,city, status, show } = req.body;
        const doc = await User.findById(id);
        if (!doc) return res.status(404).json({ success: false, message: "Doctor not found" });

        doc.name = name;
        doc.email = email;
        doc.city_name = city;
        doc.whatsapp_no = whatsapp_no;
        doc.phone = phone;
        doc.address = address;
        doc.active = status;
        doc.show = status;
        await doc.save();

        res.json({ success: true, message: "Status updated", doc });
    } catch {
        res.status(500).json({ success: false, message: "Server error" });
    }
};


