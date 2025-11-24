import redis from '../config/redis.js';

const FLOOR_CACHE_KEY = 'FLOOR_DATA_LATEST';
const CACHE_TTL = 3600; // 1 hour in seconds

// Get floor data from Redis cache
export const getFloorData = async () => {
    try {
        const cached = await redis.get(FLOOR_CACHE_KEY);
        if (cached) {
            return JSON.parse(cached);
        }
        return null;
    } catch (error) {
        console.error('Redis get error:', error);
        return null;
    }
};

// Set floor data in Redis cache
export const setFloorData = async (data) => {
    try {
        await redis.setex(FLOOR_CACHE_KEY, CACHE_TTL, JSON.stringify(data));
    } catch (error) {
        console.error('Redis set error:', error);
    }
};

// Invalidate floor cache
export const invalidateFloorCache = async () => {
    try {
        await redis.del(FLOOR_CACHE_KEY);
    } catch (error) {
        console.error('Redis delete error:', error);
    }
};

