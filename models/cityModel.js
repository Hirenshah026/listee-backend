import mongoose from "mongoose";

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    state: { type: String, default: "" },
    country: { type: String, default: "India" },
    active: { type: Boolean, default: true },
    show: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("City", citySchema);
