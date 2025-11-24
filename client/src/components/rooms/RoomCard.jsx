// Room card component displaying room information
const RoomCard = ({ room, onEdit, onDelete, onFree, userRole, freeing = false, deleting = false }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'BOOKED':
                return 'bg-red-50 text-red-700 border-red-200';
            case 'UNDER_MAINTENANCE':
                return 'bg-gray-50 text-gray-600 border-gray-200';
            default:
                return 'bg-gray-50 text-gray-600 border-gray-200';
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

    return (
        <div className="bg-white border-2 border-blue-100 rounded-xl p-5 hover:shadow-lg hover:border-blue-300 transition-all duration-200 transform hover:-translate-y-1">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{room.name}</h3>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(room.status)}`}>
                        <span>{getStatusIcon(room.status)}</span>
                        {room.status.replace('_', ' ')}
                    </span>
                </div>
            </div>
            
            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-blue-600 font-semibold">Type:</span>
                    <span className="text-gray-800">{room.type}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-blue-600 font-semibold">Capacity:</span>
                    <span className="text-gray-800 font-medium">{room.capacity} people</span>
                </div>
            </div>

            {(userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    {userRole === 'SUPER_ADMIN' && room.status === 'BOOKED' ? (
                        <button
                            onClick={() => onFree(room.id)}
                            disabled={freeing}
                            className="flex-1 px-4 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {freeing && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>}
                            {freeing ? 'Freeing...' : 'Free Room'}
                        </button>
                    ) : (
                        <button
                            onClick={() => onEdit(room)}
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            Edit
                        </button>
                    )}
                    {userRole === 'SUPER_ADMIN' && (
                        <button
                            onClick={() => onDelete(room)}
                            disabled={deleting}
                            className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {deleting && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>}
                            {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default RoomCard;

