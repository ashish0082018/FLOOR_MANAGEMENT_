import { addToQueue } from '../utils/offlineQueue.js';
import api from './axios.js';

// Check if browser is online
const isOnline = () => {
    return navigator.onLine;
};

// Setup offline interceptor for axios
export const setupOfflineInterceptor = () => {
    // Request interceptor to queue requests when offline
    api.interceptors.request.use(
        (config) => {
            // Skip queueing for GET requests (read operations)
            if (config.method === 'get' || config.method === 'GET') {
                return config;
            }

            // If offline, queue the request
            if (!isOnline()) {
                const action = {
                    type: config.method.toUpperCase(),
                    endpoint: config.url,
                    payload: config.data || {},
                    headers: config.headers
                };

                const actionId = addToQueue(action);
                
                // Reject the request to prevent it from being sent
                return Promise.reject({
                    isOffline: true,
                    actionId,
                    message: 'Request queued for offline processing'
                });
            }

            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );
};

// Check if error is from offline queue
export const isOfflineError = (error) => {
    return error?.isOffline === true;
};

