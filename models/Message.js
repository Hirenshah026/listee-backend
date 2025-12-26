import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true
    },
    senderId: {
      type: String,
      required: true
    },
    receiverId: {
      type: String,
      required: true
    }
  },
  { timestamps: true } // createdAt, updatedAt auto add
);

export default mongoose.model("Message", messageSchema);
