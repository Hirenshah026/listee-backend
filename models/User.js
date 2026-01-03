
import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: "doctor" },
    address: String,
    phone: { type: String, unique: true ,sparse: true, default: null},
    phone2: { type: String, sparse: true, default: null},
    whatsapp_no: { type: String, unique: true ,sparse: true, default: null},
    profile: {type: String ,sparse: true, default: null},
    profile_clinic: {type: String ,sparse: true, default: null},
    city_id: {type: String ,sparse: true, default: null},
    city_name: {type: String ,sparse: true, default: null},
    active: { type: Boolean, default: true },
    show: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.model("User", userSchema);