import Follower from '../models/Follower.js';
import Astrologer from '../models/Astrologer.js';

export const toggleFollow = async (req, res) => {
    try {
        const { userId, astrologerId } = req.body;
        console.log("Toggle Request Received. User:", userId, "Astro:", astrologerId);

        if (!userId || !astrologerId) return res.status(400).json({ success: false, message: "Missing IDs" });

        const existingFollow = await Follower.findOne({ userId, astrologerId });

        if (existingFollow) {
            // UNFOLLOW Logic
            await Follower.findByIdAndDelete(existingFollow._id);
            const updatedAstro = await Astrologer.findByIdAndUpdate(
                astrologerId, 
                { $inc: { followers: -1 } },
                { new: true }
            );
            console.log("Unfollow Success. New Count:", updatedAstro?.followers);
            return res.status(200).json({ 
                success: true, 
                following: false, 
                newCount: Math.max(0, updatedAstro?.followers || 0) 
            });
        } else {
            // FOLLOW Logic
            const newFollow = new Follower({ userId, astrologerId });
            await newFollow.save();
            const updatedAstro = await Astrologer.findByIdAndUpdate(
                astrologerId, 
                { $inc: { followers: 1 } },
                { new: true }
            );
            console.log("Follow Success. New Count:", updatedAstro?.followers);
            return res.status(200).json({ 
                success: true, 
                following: true, 
                newCount: Math.max(0, updatedAstro?.followers || 0) 
            });
        }
    } catch (error) {
        console.error("Toggle Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

export const checkFollowStatus = async (req, res) => {
    try {
        const { userId, astrologerId } = req.params;
        const followRecord = await Follower.findOne({ userId, astrologerId });
        const astro = await Astrologer.findById(astrologerId);
        
        return res.status(200).json({ 
            success: true, 
            following: !!followRecord,
            totalFollowers: Math.max(0, astro?.followers || 0)
        });
    } catch (error) {
        return res.status(500).json({ success: false });
    }
};