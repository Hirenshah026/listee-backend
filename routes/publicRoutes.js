import express from "express";
import {register,login} from "../controllers/authController.js";
import {loginStaff,forgotPasswordStaff,ResetPasswordStaff} from "../controllers/staffController.js";
import User from "../models/User.js";

const router=express.Router();
router.post("/auth/register",register);
router.post("/admin/doctor-register",register);
router.post("/auth/login",login);
router.post("/auth/staff/login",loginStaff);
router.post("/auth/staff/forgot-password",forgotPasswordStaff);
router.post("/auth/staff/reset-password",ResetPasswordStaff);
router.get("/doctors",async(req,res)=>{
 const d=await User.find().select("name email phone whatsapp_no address show active city_name createdAt");
 res.json({success:true,doctors:d});
});
export default router;