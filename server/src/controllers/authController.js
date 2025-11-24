import jwt from 'jsonwebtoken';
import AuthService from '../services/AuthService.js';

// Register new user
export const register = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please fill all fields'
            });
        }

        const user = await AuthService.register(name, email, password, role || 'EMPLOYEE');
        
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || 'Registration failed'
        });
    }
};

// Login user
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        const { user, token } = await AuthService.login(email, password);

        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            user
        });
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: error.message || 'Login failed'
        });
    }
};

// Logout user
export const logout = async (req, res, next) => {
    try {
        res.clearCookie('token');
        return res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
};

// Get user profile
export const getProfile = async (req, res, next) => {
    try {
        const user = await AuthService.getProfile(req.user.id);
        return res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        return res.status(404).json({
            success: false,
            message: error.message || 'User not found'
        });
    }
};

