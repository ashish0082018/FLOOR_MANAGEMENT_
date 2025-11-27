import api from '../config/axios.js';
import { getQueue, removeFromQueue } from '../utils/offlineQueue.js';
import { toast } from 'sonner';

// Process offline queue - replay actions
export const processOfflineQueue = async (onConflict) => {
    const queue = getQueue();
    
    if (queue.length === 0) {
        return { success: true, processed: 0 };
    }

    let processed = 0;
    let stopped = false;

    for (const action of queue) {
        if (stopped) break;

        try {
            // Add small delay between requests to avoid overwhelming the server
            if (processed > 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Reconstruct the request with proper config
            const config = {
                method: action.type.toLowerCase(),
                url: action.endpoint,
                data: action.payload,
                headers: {
                    'Content-Type': 'application/json',
                    ...(action.headers || {})
                },
                withCredentials: true
            };

            // Send the request
            console.log('Syncing offline action:', { method: config.method, url: config.url, payload: config.data });
            const response = await api.request(config);

            // Success - remove from queue
            removeFromQueue(action.id);
            processed++;

            
            if (response.data?.success) {
                toast.success('Synced: ' + (action.endpoint || 'action'));
            }
        } catch (error) {
            console.error('Error syncing action:', {
                actionId: action.id,
                endpoint: action.endpoint,
                errorCode: error.code,
                errorMessage: error.message,
                responseStatus: error.response?.status,
                responseData: error.response?.data
            });

           
            if (!error.response && (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_RESET' || error.message?.includes('ERR_CONNECTION_RESET'))) {
                // Network error - keep in queue and stop processing
                console.error('Network error during sync - keeping action in queue:', action.id);
                stopped = true;
                toast.error('Network error. Please check your connection and try again.');
                break;
            }
            
            // Handle 409 conflict
            if (error.response?.status === 409) {
                // Stop processing and show conflict modal
                stopped = true;
                
                if (onConflict) {
                    const conflictData = error.response.data;
                    onConflict({
                        action,
                        serverFields: conflictData.serverFields,
                        clientFields: conflictData.clientFields,
                        serverRoom: conflictData.serverRoom
                    });
                } else {
                    toast.error('Conflict detected. Please resolve manually.');
                }
                break;
            } else {
                // Other errors - remove from queue and continue
                console.error('Error syncing action:', error);
                removeFromQueue(action.id);
                toast.error('Failed to sync: ' + (action.endpoint || 'action'));
            }
        }
    }

    return { success: !stopped, processed, stopped };
};

// Retry a specific action after conflict resolution
export const retryAction = async (action, overwrite = false) => {
    try {
        const config = {
            method: action.type.toLowerCase(),
            url: action.endpoint,
            data: {
                ...action.payload,
                force: overwrite
            },
            headers: {
                'Content-Type': 'application/json',
                ...(action.headers || {})
            },
            withCredentials: true
        };

        const response = await api.request(config);

        if (response.data?.success) {
            removeFromQueue(action.id);
            return { success: true };
        }

        return { success: false, message: 'Action failed' };
    } catch (error) {
        return { success: false, message: error.message || 'Retry failed' };
    }
};

