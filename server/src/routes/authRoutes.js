import express from 'express';
import { register, login, logout, getProfile } from '../controllers/authController.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.post('/logout', isAuthenticated, logout);
router.get('/profile', isAuthenticated, getProfile);

export default router;

