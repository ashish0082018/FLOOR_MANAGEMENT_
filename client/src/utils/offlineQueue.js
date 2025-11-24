const QUEUE_KEY = 'offline_action_queue';

// Add action to offline queue
export const addToQueue = (action) => {
    try {
        const queue = getQueue();
        const newAction = {
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...action,
            timestamp: Date.now()
        };
        queue.push(newAction);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        return newAction.id;
    } catch (error) {
        console.error('Error adding to queue:', error);
        return null;
    }
};

// Get all pending actions from queue
export const getQueue = () => {
    try {
        const queueStr = localStorage.getItem(QUEUE_KEY);
        return queueStr ? JSON.parse(queueStr) : [];
    } catch (error) {
        console.error('Error getting queue:', error);
        return [];
    }
};

// Remove action from queue
export const removeFromQueue = (actionId) => {
    try {
        const queue = getQueue();
        const filtered = queue.filter(action => action.id !== actionId);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
        return true;
    } catch (error) {
        console.error('Error removing from queue:', error);
        return false;
    }
};

// Clear entire queue
export const clearQueue = () => {
    try {
        localStorage.removeItem(QUEUE_KEY);
        return true;
    } catch (error) {
        console.error('Error clearing queue:', error);
        return false;
    }
};

// Get queue length
export const getQueueLength = () => {
    return getQueue().length;
};

