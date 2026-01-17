import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
    name: { type: String, default: null},
    email: { type: String, default: 'user@gmail.com'},
    password: { type: String, default: null},
    role: { type: String, default: "chatuser" },
    
    mobile: { type: String, unique: true ,sparse: true, default: null},
    
    profile: {type: String ,sparse: true, default: null},
    
    active: { type: Boolean, default: true },
    show: { type: Boolean, default: true },
    isPlanActive: { type: Boolean, default: false },
    freeChatTime: { type: Number, default: 12000 },
}, { timestamps: true });
export default mongoose.model("ChatUser", userSchema);