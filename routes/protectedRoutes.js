import express from "express";
import multer from "multer";
import auth from "../middleware/auth.js";
import User from "../models/User.js";
import ChatUser from "../models/ChatUser.js";
import Staff from "../models/staffModel.js";
import Astrologer from "../models/Astrologer.js";
import {
  getCities,
  addCity,
  updateCity,
  deleteCity,
  toggleCityStatus,
} from "../controllers/cityController.js";
import {
  createRole,
  getRoles,
  updateRole,
  deleteRole,
  toggleActive,
} from "../controllers/roleController.js";
import { toggleActiveDoc,updateDoctor } from "../controllers/authController.js";
import {
  createStaff,
  getStaff,
  getSingleStaff,
  updateStaff,
  deleteStaff,
  toggleActiveStaff,
} from "../controllers/staffController.js";
import {
  createArea,
  getAreas,
  updateArea,
  deleteArea,
  toggleAreaStatus,
} from "../controllers/areaController.js";
import {
  createMarketingPerson,
  getMarketingPersons,
  updateMarketingPerson,
  deleteMarketingPerson,
  toggleMarketingPerson,
} from "../controllers/marketingPersonController.js";

import {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,getNextQuestion,
} from "../controllers/questionController.js";


const router = express.Router();

// Dashboard route (basic info)
router.get("/dashboard", auth, async (req, res) => {
  try {
    // req.user me middleware me decoded token ka id hoga
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Profile route (full profile)
router.get("/doctor-panel-profile", auth, async (req, res) => {
  try {
    const role = req.headers.role; // ✅ ALWAYS from auth middleware
    let profile = null;

    if (role == "staff") {
      profile = await Staff.findById(req.user.id).select("-password");
    } 
    else if (role == "astro") {
      profile = await Astrologer.findById(req.user.id).select("-password");
    } 
    else if (role == "chatuser") {
      profile = await ChatUser.findById(req.user.id).select("-password");
    } 
    else {
      profile = await User.findById(req.user.id).select("-password");
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    return res.json({
      success: true,
      user: profile,
    });

  } catch (error) {
    console.error("Doctor Panel Profile Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});



router.put("/doctor-panel-update-profile", auth, async (req, res) => {
  try {
    const role = req.headers.role; // Middleware se role pakda
    const { name, email, phone, address } = req.body;
    
    // Update karne ke liye data object
    const updateFields = { name, email, phone, address };
    const options = { new: true, runValidators: true };

    let updatedProfile = null;

    // Role ke basis par sahi Model choose karke update karna
    if (role === "staff") {
      updatedProfile = await Staff.findByIdAndUpdate(req.user.id, updateFields, options).select("-password");
    } 
    else if (role === "astro") {
      updatedProfile = await Astrologer.findByIdAndUpdate(req.user.id, updateFields, options).select("-password");
    } 
    else if (role === "chatuser") {
      updatedProfile = await ChatUser.findByIdAndUpdate(req.user.id, updateFields, options).select("-password");
    } 
    else {
      updatedProfile = await User.findByIdAndUpdate(req.user.id, updateFields, options).select("-password");
    }

    if (!updatedProfile) {
      return res.status(404).json({
        success: false,
        message: "Profile nahi mili",
      });
    }

    res.json({ 
      success: true, 
      message: "Profile successfully update ho gayi",
      user: updatedProfile 
    });

  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "Server error" 
    });
  }
});

// Multer Storage
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* ----------------- PROFILE PHOTO UPLOAD ----------------- */
router.post(
  "/doctor-panel-upload-photo",
  auth,
  upload.single("profile"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const filePath = `/uploads/${req.file.filename}`;

      await User.findByIdAndUpdate(req.user.id, { profile: filePath });

      res.json({
        message: "Profile uploaded successfully",
        profile: filePath,
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Upload failed!" });
    }
  }
);

router.get("/cities", getCities);
router.post("/cities", addCity);
router.put("/cities/:id", updateCity);
router.delete("/cities/:id", deleteCity);
router.patch("/cities/:id/toggle", toggleCityStatus);

router.post("/roles", createRole);
router.get("/roles", getRoles);
router.put("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);
router.patch("/roles/:id/active", toggleActive);

router.patch("/doctors/:id/active", toggleActiveDoc);
router.patch("/doctors/:id", updateDoctor);
router.get("/doctors/:id", async (req, res) => {
  try {
    const doctor = await User.findById(req.params.id).populate("city_name", "name");
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
    res.json({
      success: true,
      doctor: {
        ...doctor.toObject(),
        city_name: doctor.city_name ? doctor.city_name : null
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch doctor" });
  }
});

router.post("/staff/", createStaff);          // Add staff
router.get("/staff/", getStaff);              // List staff
router.get("/staff/:id", getSingleStaff);     // Single staff
router.patch("/staff/:id", updateStaff);      // Update staff
router.delete("/staff/:id", deleteStaff);     // Delete staff
router.patch("/staff/:id/active", toggleActiveStaff); // Toggle Active/Inactive

router.post("/areas", createArea);
router.get("/areas", getAreas);
router.put("/areas/:id", updateArea);
router.delete("/areas/:id", deleteArea);
router.patch("/areas/:id/toggle", toggleAreaStatus);

router.post("/marketing-persons", createMarketingPerson);
router.get("/marketing-persons", getMarketingPersons);
router.put("/marketing-persons/:id", updateMarketingPerson);
router.delete("/marketing-persons/:id", deleteMarketingPerson);
router.patch("/marketing-persons/:id/toggle", toggleMarketingPerson);

router.get("/questions", getQuestions);
router.post("/questions", createQuestion);
router.put("/questions/:id", updateQuestion);
router.delete("/questions/:id", deleteQuestion);
router.get("/questions/next", getNextQuestion);



export default router;
