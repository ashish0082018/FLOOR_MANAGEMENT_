// Recommendation card component
const RecommendationCard = ({ room, rank, onSelect, userId, onFreeRoom, freeing = false }) => {
    // Check if room is booked by current user
    const isBookedByUser = room.status === 'BOOKED' && room.bookings?.some(booking => booking.userId === userId);

    return (
        <div className={`bg-gradient-to-br from-blue-50 to-white border-2 rounded-xl p-5 hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 ${
            room.status === 'BOOKED' && !isBookedByUser 
                ? 'border-red-300 bg-red-50' 
                : 'border-blue-300 hover:border-blue-400'
        }`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-md">
                        #{rank}
                    </span>
                    <h3 className="text-lg font-bold text-gray-800">{room.name}</h3>
                </div>
            </div>
            
            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-blue-600 font-semibold">Type:</span>
                    <span className="text-gray-700">{room.type}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-blue-600 font-semibold">Capacity:</span>
                    <span className="text-gray-700 font-medium">{room.capacity} people</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-blue-600 font-semibold">Score:</span>
                    <span className="text-gray-700 font-medium">{room.totalScore}</span>
                </div>
                {room.status === 'BOOKED' && !isBookedByUser && (
                    <div className="mt-2 pt-2 border-t border-red-200">
                        <p className="text-xs text-red-600 font-semibold">
                            🔴 Booked by another user
                        </p>
                    </div>
                )}
                {room.pastBookingsCount > 0 && room.status !== 'BOOKED' && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                        <p className="text-xs text-blue-600 font-medium">
                            ⭐ You've booked this {room.pastBookingsCount} {room.pastBookingsCount === 1 ? 'time' : 'times'} before
                        </p>
                    </div>
                )}
            </div>

            {room.status === 'BOOKED' && isBookedByUser && onFreeRoom ? (
                <button
                    onClick={() => onFreeRoom(room.id)}
                    disabled={freeing}
                    className="w-full px-4 py-2.5 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {freeing && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>}
                    {freeing ? 'Freeing...' : 'Free Room'}
                </button>
            ) : room.status === 'ACTIVE' ? (
                <button
                    onClick={() => onSelect(room)}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
                >
                    Book This Room
                </button>
            ) : null}
        </div>
    );
};

export default RecommendationCard;

