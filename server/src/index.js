import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import prisma from './config/db.js';
import redis from './config/redis.js';
import { errorHandler } from './middlewares/errorMiddleware.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin:true,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
    res.json({ success: true, message: 'Server is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize Floor on startup
async function initializeFloor() {
    try {
        const existingFloor = await prisma.floor.findUnique({
            where: { id: 1 }
        });

        if (!existingFloor) {
            await prisma.floor.create({
                data: {
                    id: 1,
                    name: 'Main Floor',
                    currentVersion: 1
                }
            });
            console.log('✅ Floor initialized successfully');
        }
    } catch (error) {
        console.error('❌ Error initializing floor:', error);
    }
}

// Start server
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await initializeFloor();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
});

