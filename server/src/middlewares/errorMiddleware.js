import { AppError } from '../utils/AppError.js';

// Global error handling middleware
export const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || 'Internal Server Error';

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message
        });
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired'
        });
    }

    // Handle Prisma errors
    if (err.code === 'P2002') {
        return res.status(400).json({
            success: false,
            message: 'Duplicate entry. This record already exists'
        });
    }

    console.error('Error:', err);
    
    return res.status(err.statusCode).json({
        success: false,
        message: err.message
    });
};

