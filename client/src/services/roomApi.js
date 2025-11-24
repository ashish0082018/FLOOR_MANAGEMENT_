import api from '../config/axios.js';

// Get dashboard data
export const getDashboard = async () => {
    const response = await api.get('/rooms/dashboard');
    return response.data;
};

// Sync version to latest
export const syncVersion = async () => {
    const response = await api.post('/rooms/sync');
    return response.data;
};

// Create room
export const createRoom = async (roomData) => {
    const response = await api.post('/rooms', roomData);
    return response.data;
};

// Update room
export const updateRoom = async (roomId, updates, adminLastSyncVersion = null, force = false) => {
    const response = await api.patch(`/rooms/${roomId}`, {
        updates,
        adminLastSyncVersion,
        force
    });
    return response.data;
};

// Delete room
export const deleteRoom = async (roomId, force = false) => {
    const response = await api.delete(`/rooms/${roomId}`, {
        data: { force }
    });
    return response.data;
};

