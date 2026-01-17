import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: false,
      default: ""
    },
    senderId: {
      type: String,
      required: true
    },
    receiverId: {
      type: String,
      required: true
    },
    image: { type: String, sparse: true, default: null},
    read: { type: Boolean, default: false },
  },
  { timestamps: true } // createdAt, updatedAt auto add
);

export default mongoose.model("Message", messageSchema);
