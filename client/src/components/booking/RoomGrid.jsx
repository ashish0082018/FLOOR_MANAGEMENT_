// Room grid component for visual floor plan
const RoomGrid = ({ rooms, onRoomClick, userRole, userId, onFreeRoom, freeing = false }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300';
            case 'BOOKED':
                return 'bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-300';
            case 'UNDER_MAINTENANCE':
                return 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'ACTIVE':
                return 'Available';
            case 'BOOKED':
                return 'Booked';
            case 'UNDER_MAINTENANCE':
                return 'Maintenance';
            default:
                return status;
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'ACTIVE':
                return '✓';
            case 'BOOKED':
                return '🔴';
            case 'UNDER_MAINTENANCE':
                return '⚠';
            default:
                return '•';
        }
    };

    // Check if room is booked by current user
    const isBookedByUser = (room) => {
        if (room.status !== 'BOOKED') return false;
        return room.bookings?.some(booking => booking.userId === userId);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {rooms.map((room) => {
                const bookedByUser = isBookedByUser(room);
                const isClickable = room.status !== 'UNDER_MAINTENANCE' && 
                                   (room.status === 'ACTIVE' || (room.status === 'BOOKED' && bookedByUser));

                return (
                    <div
                        key={room.id}
                        className={`border-2 rounded-xl p-5 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg ${
                            room.status === 'BOOKED' && !bookedByUser 
                                ? 'bg-red-100 border-red-300 cursor-not-allowed' 
                                : getStatusColor(room.status)
                        } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                        onClick={() => isClickable && onRoomClick(room)}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="text-lg font-bold text-gray-800">{room.name}</h3>
                            <span className="text-lg">{getStatusIcon(room.status)}</span>
                        </div>
                        
                        <div className="space-y-2 mb-3">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-blue-600 font-semibold">Type:</span>
                                <span className="text-gray-700">{room.type}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-blue-600 font-semibold">Capacity:</span>
                                <span className="text-gray-700 font-medium">{room.capacity} people</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-blue-600 font-semibold">Status:</span>
                                <span className={`font-semibold ${
                                    room.status === 'BOOKED' && !bookedByUser 
                                        ? 'text-red-600' 
                                        : 'text-gray-700'
                                }`}>
                                    {getStatusText(room.status)}
                                </span>
                            </div>
                        </div>

                        {room.status === 'BOOKED' && bookedByUser && onFreeRoom && (
                            <div className="mt-4 pt-3 border-t border-gray-200">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onFreeRoom(room.id);
                                    }}
                                    disabled={freeing}
                                    className="w-full px-4 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {freeing && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>}
                                    {freeing ? 'Freeing...' : 'Free Room'}
                                </button>
                            </div>
                        )}

                        {room.status === 'BOOKED' && !bookedByUser && (
                            <div className="mt-3 pt-3 border-t border-red-200">
                                <p className="text-xs text-red-600 font-semibold text-center">
                                    Booked by another user
                                </p>
                            </div>
                        )}

                        {room.bookings && room.bookings.length > 0 && room.status !== 'BOOKED' && (
                            <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
                                {room.bookings.length} active {room.bookings.length === 1 ? 'booking' : 'bookings'}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default RoomGrid;

