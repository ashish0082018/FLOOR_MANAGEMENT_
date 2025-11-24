import { useState, useEffect } from 'react';

// Edit room modal component
const EditRoomModal = ({ isOpen, onClose, room, onSubmit, userRole, userVersion, updating = false }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: '',
        capacity: '',
        status: 'ACTIVE'
    });

    useEffect(() => {
        if (room) {
            setFormData({
                name: room.name || '',
                type: room.type || '',
                capacity: room.capacity || '',
                status: room.status || 'ACTIVE'
            });
        }
    }, [room]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Remove capacity and status from updates if user is ADMIN (they can only edit name and type)
        let updates = userRole === 'ADMIN' 
            ? { name: formData.name, type: formData.type }
            : formData;
        
        // Convert capacity to integer if it exists
        if (updates.capacity !== undefined && updates.capacity !== null) {
            updates = {
                ...updates,
                capacity: parseInt(updates.capacity, 10)
            };
        }
        
        await onSubmit(room.id, updates, userVersion);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border-2 border-blue-100">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-1">Edit Room</h2>
                    <p className="text-sm text-gray-500">Update room information</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Room Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Type
                        </label>
                        <input
                            type="text"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            required
                        />
                    </div>

                    {userRole === 'SUPER_ADMIN' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Capacity
                            </label>
                            <input
                                type="number"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                min="1"
                                required
                            />
                        </div>
                    )}

                    {userRole === 'SUPER_ADMIN' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Status
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                            </select>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={updating}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                            {updating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                            {updating ? 'Updating...' : 'Update Room'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditRoomModal;

