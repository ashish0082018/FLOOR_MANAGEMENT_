import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    throw new Error(' REDIS_URL is not defined in .env file');
}

const redis = new Redis(redisUrl);

redis.on('connect', () => {
    console.log('Redis Cloud Connected Successfully');
});

redis.on('error', (err) => {
    console.error('Redis Connection Error:', err);
});

export default redis;