import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { toast } from 'sonner';
import { getDashboard, getRecommendations, bookRoom, freeRoom } from '../services/bookingApi.js';
import RoomGrid from '../components/booking/RoomGrid.jsx';
import RecommendationCard from '../components/booking/RecommendationCard.jsx';
import BookingModal from '../components/booking/BookingModal.jsx';

// Employee dashboard for booking rooms
const EmployeeDashboard = () => {
    const { user, logout } = useAuth();
    const [floorData, setFloorData] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [requiredCapacity, setRequiredCapacity] = useState(1);
    const [booking, setBooking] = useState(false);
    const [freeing, setFreeing] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    // Fetch dashboard data
    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const response = await getDashboard();
            if (response.success) {
                setFloorData(response.data);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    // Fetch recommendations
    const fetchRecommendations = async (capacity) => {
        try {
            const response = await getRecommendations(capacity);
            if (response.success) {
                setRecommendations(response.recommendations.slice(0, 3)); // Top 3
            }
        } catch (error) {
            console.error('Failed to fetch recommendations:', error);
        }
    };

    useEffect(() => {
        fetchDashboard();
        fetchRecommendations(requiredCapacity);
    }, []);

    // Handle room click
    const handleRoomClick = (room) => {
        if (room.status === 'ACTIVE') {
            setSelectedRoom(room);
            setIsBookingModalOpen(true);
        }
        // For booked rooms, the Free button is handled directly in RoomGrid
    };

    // Handle book room
    const handleBookRoom = async (roomId, participants) => {
        try {
            setBooking(true);
            const response = await bookRoom(roomId, participants);
            if (response.success) {
                toast.success('Room booked successfully!');
                setIsBookingModalOpen(false);
                setSelectedRoom(null);
                await fetchDashboard();
                await fetchRecommendations(requiredCapacity);
            }
        } catch (error) {
            if (error.response?.status === 409) {
                toast.error('Room is no longer available. Please refresh.');
                await fetchDashboard();
            } else {
                toast.error(error.message || 'Failed to book room');
            }
        } finally {
            setBooking(false);
        }
    };

    // Handle free room
    const handleFreeRoom = async (roomId) => {
        try {
            setFreeing(true);
            const response = await freeRoom(roomId);
            if (response.success) {
                toast.success('Room freed successfully!');
                await fetchDashboard();
                await fetchRecommendations(requiredCapacity);
            }
        } catch (error) {
            if (error.response?.status === 403) {
                toast.error('You can only free rooms you booked');
            } else {
                toast.error(error.message || 'Failed to free room');
            }
        } finally {
            setFreeing(false);
        }
    };

    // Handle recommendation select
    const handleRecommendationSelect = (room) => {
        setSelectedRoom(room);
        setIsBookingModalOpen(true);
    };

    // Handle capacity change
    const handleCapacityChange = (e) => {
        const capacity = parseInt(e.target.value) || 1;
        setRequiredCapacity(capacity);
        fetchRecommendations(capacity);
    };

    // Handle logout
    const handleLogout = async () => {
        try {
            setLoggingOut(true);
            await logout();
            toast.success('Logged out successfully');
        } catch (error) {
            toast.error('Failed to logout');
        } finally {
            setLoggingOut(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-blue-600 font-semibold">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-blue-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Book a Room</h1>
                        <p className="text-blue-100 text-sm">Find and reserve meeting rooms</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-white font-medium">Welcome, {user?.name}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="px-5 py-2.5 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loggingOut && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>}
                            {loggingOut ? 'Logging out...' : 'Logout'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Recommendations Section */}
                {recommendations.length > 0 && (
                    <div className="mb-10">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Recommended Rooms</h2>
                                <p className="text-gray-500 text-sm mt-1">Top picks based on your preferences</p>
                            </div>
                            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border-2 border-blue-200">
                                <label className="text-sm font-semibold text-gray-700">Capacity:</label>
                                <input
                                    type="number"
                                    value={requiredCapacity}
                                    onChange={handleCapacityChange}
                                    className="w-20 px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    min="1"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {recommendations.map((room, index) => (
                                <RecommendationCard
                                    key={room.id}
                                    room={room}
                                    rank={index + 1}
                                    onSelect={handleRecommendationSelect}
                                    userId={user?.id}
                                    onFreeRoom={handleFreeRoom}
                                    freeing={freeing}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Room Grid */}
                <div>
                    <div className="mb-5">
                        <h2 className="text-2xl font-bold text-gray-800">All Rooms</h2>
                        <p className="text-gray-500 text-sm mt-1">Browse all available rooms</p>
                    </div>
                    {floorData?.rooms && floorData.rooms.length > 0 ? (
                        <RoomGrid
                            rooms={floorData.rooms}
                            onRoomClick={handleRoomClick}
                            userRole={user?.role}
                            userId={user?.id}
                            onFreeRoom={handleFreeRoom}
                            freeing={freeing}
                        />
                    ) : (
                        <div className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-blue-100">
                            <div className="text-6xl mb-4">🚪</div>
                            <p className="text-gray-600 text-lg font-medium">No rooms available</p>
                            <p className="text-gray-500 text-sm mt-1">Check back later for available rooms</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Booking Modal */}
            {selectedRoom && (
                <BookingModal
                    isOpen={isBookingModalOpen}
                    onClose={() => {
                        setIsBookingModalOpen(false);
                        setSelectedRoom(null);
                    }}
                    room={selectedRoom}
                    onConfirm={handleBookRoom}
                />
            )}
        </div>
    );
};

export default EmployeeDashboard;

