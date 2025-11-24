import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

// Authentication service class with OOPS structure
class AuthService {
    // Register a new user
    async register(name, email, password, role = 'EMPLOYEE') {
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            throw new Error('User already exists with this email');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Initialize lastSyncedVersion based on role
        let lastSyncedVersion = 0;
        
        // For ADMIN and SUPER_ADMIN, initialize with current floor version
        if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
            const floor = await prisma.floor.findUnique({
                where: { id: 1 },
                select: { currentVersion: true }
            });
            
            if (floor) {
                lastSyncedVersion = floor.currentVersion;
            }
        }
        
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                lastSyncedVersion
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                lastSyncedVersion: true
            }
        });

        return user;
    }

    // Login user and generate token
    async login(email, password) {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            throw new Error('Incorrect email or password');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Incorrect email or password');
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                lastSyncedVersion: user.lastSyncedVersion
            },
            token
        };
    }

    // Get user profile
    async getProfile(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                lastSyncedVersion: true,
                createdAt: true
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }
}

export default new AuthService();

