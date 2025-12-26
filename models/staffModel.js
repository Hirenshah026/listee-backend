import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password:{type : String},
    role: { type: String, default: "staff" },
    active: { type: Boolean, default: true },
    show: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Staff = mongoose.model("Staff", staffSchema);

export default Staff; 
