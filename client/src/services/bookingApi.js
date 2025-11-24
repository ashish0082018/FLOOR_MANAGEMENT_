import api from '../config/axios.js';

// Get dashboard data (cached)
export const getDashboard = async () => {
    const response = await api.get('/bookings/dashboard');
    return response.data;
};

// Get room recommendations
export const getRecommendations = async (requiredCapacity) => {
    const response = await api.get('/bookings/recommendations', {
        params: { requiredCapacity }
    });
    return response.data;
};

// Book a room
export const bookRoom = async (roomId, participants = 1) => {
    const response = await api.post('/bookings/book', {
        roomId,
        participants
    });
    return response.data;
};

// Free a room
export const freeRoom = async (roomId) => {
    const response = await api.post('/bookings/free', {
        roomId
    });
    return response.data;
};

