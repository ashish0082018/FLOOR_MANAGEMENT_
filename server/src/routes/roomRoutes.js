import express from 'express';
import { isAuthenticated, requireRole } from '../middlewares/authMiddleware.js';
import { getDashboard, syncVersion, createRoom, deleteRoom, updateRoom } from '../controllers/roomController.js';

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Dashboard route (all authenticated users)
router.get('/dashboard', getDashboard);

// Sync version route (all authenticated users)
router.post('/sync', syncVersion);

// Create room (Super Admin only)
router.post('/', requireRole('SUPER_ADMIN'), createRoom);

// Update room (Admin and Super Admin)
router.patch('/:roomId', requireRole('ADMIN', 'SUPER_ADMIN'), updateRoom);

// Delete room (Super Admin only)
router.delete('/:roomId', requireRole('SUPER_ADMIN'), deleteRoom);

export default router;
