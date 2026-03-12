import express from 'express';
import { toggleFollow, checkFollowStatus } from '../controllers/followController.js';

const router = express.Router();

// POST: /api/follow/toggle
router.post('/toggle', toggleFollow);

// GET: /api/follow/status/:userId/:astrologerId
router.get('/status/:userId/:astrologerId', checkFollowStatus);

export default router;