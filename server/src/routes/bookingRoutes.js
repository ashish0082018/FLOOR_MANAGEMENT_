import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import { getDashboard, getRecommendations, bookRoom, freeRoom } from '../controllers/bookingController.js';

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Get dashboard (cached floor data)
router.get('/dashboard', getDashboard);

// Get room recommendations
router.get('/recommendations', getRecommendations);

// Book a room
router.post('/book', bookRoom);

// Free a room
router.post('/free', freeRoom);

export default router;
