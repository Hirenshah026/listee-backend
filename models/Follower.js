import mongoose from 'mongoose';

const FollowerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    astrologerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Astrologer', required: true }
}, { timestamps: true });

FollowerSchema.index({ userId: 1, astrologerId: 1 }, { unique: true });

const Follower = mongoose.model('Follower', FollowerSchema);

// YE LINE CHECK KARO - Isse 'export default' hona chahiye
export default Follower;