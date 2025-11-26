import RoomService from '../services/RoomService.js';
import FloorService from '../services/FloorService.js';

// Get dashboard data
export const getDashboard = async (req, res, next) => {
    try {
        const result = await FloorService.getDashboardData(req.user.id);
        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch dashboard data'
        });
    }
};

// Sync user version to latest
export const syncVersion = async (req, res, next) => {
    try {
        const result = await FloorService.syncVersion(req.user.id);
        return res.status(200).json({
            success: true,
            message: 'Version synced successfully',
            ...result
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to sync version'
        });
    }
};

// Create room (Super Admin only)
export const createRoom = async (req, res, next) => {
    try {
        const { name, type, capacity } = req.body;

        // Validate required fields
        if (!name || !type || capacity === undefined || capacity === null || capacity === '') {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, type, and capacity'
            });
        }

        // Convert capacity to number and validate
        const capacityNum = parseInt(capacity, 10);
        if (isNaN(capacityNum) || capacityNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Capacity must be a positive number'
            });
        }

        // Validate name and type are strings
        if (typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Name must be a non-empty string'
            });
        }

        if (typeof type !== 'string' || type.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Type must be a non-empty string'
            });
        }

        const room = await RoomService.createRoom(name.trim(), type.trim(), capacityNum, 1, req.user.id);
        
        return res.status(201).json({
            success: true,
            message: 'Room created successfully',
            room
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to create room'
        });
    }
};

// Delete room (Super Admin only)
export const deleteRoom = async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const { force } = req.body;

        const result = await RoomService.deleteRoom(roomId, force || false, req.user.id);
        
        return res.status(200).json({
            success: true,
            message: 'Room deleted successfully',
            ...result
        });

    } catch (error) {
       const statusCode = error.statusCode || 400;

        return res.status(statusCode).json({
            success: false,
            message: error.message || 'Failed to delete room',
            ...error 
        });
    }
};

// Update room (handles both Super Admin and Admin)
export const updateRoom = async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const { updates, force, adminLastSyncVersion } = req.body;
        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide updates'
            });
        }

        let result;

        if (req.user.role === 'SUPER_ADMIN') {
            result = await RoomService.updateRoomSuperAdmin(roomId, updates, force || false, req.user.id);
            return res.status(200).json({
                success: true,
                message: 'Room updated successfully',
                room: result
            });
        } 

        else if (req.user.role === 'ADMIN') {
            if (!adminLastSyncVersion) {
                return res.status(400).json({
                    success: false,
                    message: 'adminLastSyncVersion is required for Admin updates'
                });
            }

            result = await RoomService.updateRoomAdmin(roomId, updates, adminLastSyncVersion, req.user.id);

            return res.status(200).json({
                success: true,
                message: 'Room updated successfully',
                room: result.room
            });
        } 
        
        else {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only Admin and Super Admin can update rooms'
            });
        }
    } catch (error) {
       const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || 'Failed to update room',
            ...error 
        });
    }
};

