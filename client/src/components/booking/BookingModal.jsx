import { useState } from 'react';

// Booking modal component
const BookingModal = ({ isOpen, onClose, room, onConfirm, booking = false }) => {
    const [participants, setParticipants] = useState(1);

    if (!isOpen || !room) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onConfirm(room.id, participants);
        setParticipants(1);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border-2 border-blue-100">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-1">Book Room</h2>
                    <p className="text-sm text-gray-500">Reserve this room for your meeting</p>
                </div>
                
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-blue-600 font-semibold">Room:</span>
                            <span className="text-gray-800 font-medium">{room.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-blue-600 font-semibold">Type:</span>
                            <span className="text-gray-800">{room.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-blue-600 font-semibold">Capacity:</span>
                            <span className="text-gray-800 font-medium">{room.capacity} people</span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Number of Participants
                        </label>
                        <input
                            type="number"
                            value={participants}
                            onChange={(e) => setParticipants(parseInt(e.target.value) || 1)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            min="1"
                            max={room.capacity}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Maximum capacity: <span className="font-semibold">{room.capacity} people</span>
                        </p>
                    </div>

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
                            disabled={booking}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                            {booking && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                            {booking ? 'Booking...' : 'Book Room'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BookingModal;

