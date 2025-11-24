import BookingService from '../services/BookingService.js';

// Get dashboard data (cached)
export const getDashboard = async (req, res, next) => {
    try {
        const floorData = await BookingService.getDashboard();
        return res.status(200).json({
            success: true,
            data: floorData
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch dashboard data'
        });
    }
};

// Get room recommendations
export const getRecommendations = async (req, res, next) => {
    try {
        const { requiredCapacity } = req.query;
        const capacity = parseInt(requiredCapacity) || 1;

        if (capacity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Required capacity must be at least 1'
            });
        }

        const recommendations = await BookingService.getRecommendations(req.user.id, capacity);
        
        return res.status(200).json({
            success: true,
            recommendations
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get recommendations'
        });
    }
};

// Book a room
export const bookRoom = async (req, res, next) => {
    try {
        const { roomId, participants } = req.body;

        if (!roomId) {
            return res.status(400).json({
                success: false,
                message: 'Room ID is required'
            });
        }

        // Validate participants
        const participantsNum = participants ? parseInt(participants, 10) : 1;
        if (isNaN(participantsNum) || participantsNum < 1) {
            return res.status(400).json({
                success: false,
                message: 'Participants must be a positive number'
            });
        }

        const result = await BookingService.bookRoom(
            req.user.id,
            roomId,
            participantsNum
        );

        return res.status(200).json({
            success: true,
            message: 'Room booked successfully',
            booking: result.booking,
            newFloorVersion: result.newFloorVersion
        });
    } catch (error) {
        if (error.statusCode === 409) {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to book room'
        });
    }
};

// Free a room
export const freeRoom = async (req, res, next) => {
    try {
        const { roomId } = req.body;

        if (!roomId) {
            return res.status(400).json({
                success: false,
                message: 'Room ID is required'
            });
        }

        const result = await BookingService.freeRoom(
            req.user.id,
            roomId,
            req.user.role
        );

        return res.status(200).json({
            success: true,
            message: 'Room freed successfully',
            newFloorVersion: result.newFloorVersion
        });
    } catch (error) {
        if (error.statusCode === 403) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to free room'
        });
    }
};

