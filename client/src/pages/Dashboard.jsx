import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { toast } from 'sonner';
import { getDashboard, syncVersion, createRoom, updateRoom, deleteRoom } from '../services/roomApi.js';
import { freeRoom } from '../services/bookingApi.js';
import { getQueueLength, getQueue } from '../utils/offlineQueue.js';
import { processOfflineQueue, retryAction } from '../services/syncService.js';
import VersionIndicator from '../components/rooms/VersionIndicator.jsx';
import RoomCard from '../components/rooms/RoomCard.jsx';
import CreateRoomModal from '../components/rooms/CreateRoomModal.jsx';
import EditRoomModal from '../components/rooms/EditRoomModal.jsx';
import ConflictResolutionModal from '../components/rooms/ConflictResolutionModal.jsx';
import BookedRoomModal from '../components/rooms/BookedRoomModal.jsx';
import OfflineBanner from '../components/offline/OfflineBanner.jsx';
import { isOfflineError } from '../config/offlineInterceptor.js';

// Dashboard page with room management
const Dashboard = () => {
    const { user, logout } = useAuth();
    const [floorData, setFloorData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
    const [isBookedModalOpen, setIsBookedModalOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [conflictData, setConflictData] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [queueLength, setQueueLength] = useState(0);
    const [offlineConflict, setOfflineConflict] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [freeing, setFreeing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [overwriting, setOverwriting] = useState(false);
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
    const [roomToDelete, setRoomToDelete] = useState(null);

    // Fetch dashboard data
    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const response = await getDashboard();
            if (response.success) {
                setFloorData(response);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
        
        // Setup offline/online listeners
        const handleOnline = () => {
            setIsOnline(true);
            toast.info('Connection restored. Syncing changes...');
            handleSyncOfflineQueue();
        };

        const handleOffline = () => {
            setIsOnline(false);
            toast.warning('You are offline. Changes will be saved locally.');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check queue length periodically
        const interval = setInterval(() => {
            setQueueLength(getQueueLength());
        }, 1000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    // Sync offline queue when coming online
    const handleSyncOfflineQueue = async () => {
        if (!navigator.onLine) return;

        // Wait a bit to ensure connection is stable
        await new Promise(resolve => setTimeout(resolve, 500));

        const result = await processOfflineQueue((conflict) => {
            setOfflineConflict(conflict);
            setIsConflictModalOpen(true);
        });

        if (result.success && result.processed > 0) {
            toast.success(`Synced ${result.processed} ${result.processed === 1 ? 'change' : 'changes'}`);
            await fetchDashboard();
        }

        setQueueLength(getQueueLength());
    };

    // Handle version sync
    const handleSync = async () => {
        try {
            setSyncing(true);
            const response = await syncVersion();
            if (response.success) {
                toast.success('Version synced successfully');
                await fetchDashboard();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to sync version');
        } finally {
            setSyncing(false);
        }
    };

    // Handle create room
    const handleCreateRoom = async (roomData) => {
        try {
            setCreating(true);
            const response = await createRoom(roomData);
            if (response.success) {
                toast.success('Room created successfully!');
                await fetchDashboard();
            }
        } catch (error) {
            if (isOfflineError(error)) {
                toast.info('Room creation queued for sync when online');
                setQueueLength(getQueueLength());
            } else {
                toast.error(error.message || 'Failed to create room');
            }
        } finally {
            setCreating(false);
        }
    };

    // Handle edit room
    const handleEditRoom = (room) => {
        setSelectedRoom(room);
        setIsEditModalOpen(true);
    };

    // Handle update room
    const handleUpdateRoom = async (roomId, updates, userVersion) => {
        try {
            setCreating(true); // Reuse creating state for update
            const response = await updateRoom(roomId, updates, userVersion);
            if (response.success) {
                toast.success('Room updated successfully!');
                setIsEditModalOpen(false);
                setSelectedRoom(null);
                await fetchDashboard();
            }
        } catch (error) {
            if (isOfflineError(error)) {
                toast.info('Room update queued for sync when online');
                setIsEditModalOpen(false);
                setSelectedRoom(null);
                setQueueLength(getQueueLength());
            } else if (error.response?.status === 410) {
                // Room already deleted in latest version
                const errorData = error.response.data;
                toast.info('Room has already been deleted. Syncing to latest version...');
                
                // Sync version to latest
                try {
                    await syncVersion();
                    await fetchDashboard();
                    toast.success('Synced to latest version. The room has already been deleted.');
                } catch (syncError) {
                    toast.error('Failed to sync version');
                }
                setIsEditModalOpen(false);
                setSelectedRoom(null);
            } else if (error.response?.status === 409) {
                // Conflict detected
                const conflictData = error.response.data;
                setConflictData({
                    serverRoom: conflictData.serverRoom,
                    serverFields: conflictData.serverFields,
                    clientFields: conflictData.clientFields,
                    currentVersion: conflictData.currentVersion,
                    roomId,
                    updates
                });
                setIsConflictModalOpen(true);
                setIsEditModalOpen(false);
            } else if (error.response?.status === 400 && error.response.data.message.includes('status')) {
                toast.error('Cannot change status of a booked room!');
                await fetchDashboard();
            } else if (error.response?.data?.isBooked) {
                // Room is booked
                setPendingAction({ type: 'update', roomId, updates, force: false });
                setIsBookedModalOpen(true);
                setIsEditModalOpen(false);
            } else {
                toast.error(error.message || 'Failed to update room');
            }
        } finally {
            setCreating(false);
        }
    };

    // Handle free room (Super Admin only)
    const handleFreeRoom = async (roomId) => {
        try {
            setFreeing(true);
            const response = await freeRoom(roomId);
            if (response.success) {
                toast.success('Room freed successfully!');
                await fetchDashboard();
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

    // Handle delete room
    const handleDeleteRoom = async (room) => {
        // Show confirmation popup first
        setRoomToDelete(room);
        setIsDeleteConfirmModalOpen(true);
    };

    // Confirm delete after popup
    const confirmDelete = async () => {
        if (!roomToDelete) return;
        
        setIsDeleteConfirmModalOpen(false);
        
        if (roomToDelete.status === 'BOOKED') {
            setPendingAction({ type: 'delete', roomId: roomToDelete.id, force: false });
            setIsBookedModalOpen(true);
        } else {
            await performDelete(roomToDelete.id, false);
        }
        setRoomToDelete(null);
    };

    // Perform delete operation
    const performDelete = async (roomId, force) => {
        try {
            setDeleting(true);
            const response = await deleteRoom(roomId, force);
            if (response.success) {
                toast.success('Room deleted successfully!');
                await fetchDashboard();
            }
        } catch (error) {
            if (error.response?.status === 410) {
                // Room already deleted in latest version
                const errorData = error.response.data;
                toast.info('Room has already been deleted. Syncing to latest version...');
                
                // Sync version to latest
                try {
                    await syncVersion();
                    await fetchDashboard();
                    toast.success('Synced to latest version. The room has already been deleted.');
                } catch (syncError) {
                    toast.error('Failed to sync version');
                }
            } else if (error.response?.status === 409) {
                setPendingAction({ type: 'delete', roomId, force: false });
                setIsBookedModalOpen(true);
            } else {
                toast.error(error.message || 'Failed to delete room');
            }
        } finally {
            setDeleting(false);
        }
    };

    // Handle conflict resolution - accept server
    const handleAcceptServer = async () => {
        try {
            setSyncing(true);
            // Sync user version to latest to accept server changes
            await syncVersion();
            setIsConflictModalOpen(false);
            setConflictData(null);
            await fetchDashboard();
            toast.success('Accepted server changes');
        } catch (error) {
            toast.error(error.message || 'Failed to sync version');
        } finally {
            setSyncing(false);
        }
    };

    // Handle conflict resolution - overwrite server
    const handleOverwriteServer = async () => {
        if (!conflictData && !offlineConflict) return;
        
        try {
            setOverwriting(true);
            // Handle offline conflict
            if (offlineConflict) {
                const result = await retryAction(offlineConflict.action, true);
                if (result.success) {
                    toast.success('Action synced successfully!');
                    await fetchDashboard();
                    setQueueLength(getQueueLength());
                } else {
                    toast.error(result.message || 'Failed to sync action');
                }
                setIsConflictModalOpen(false);
                setOfflineConflict(null);
                return;
            }

            // Handle online conflict
            if (user.role === 'SUPER_ADMIN') {
                // Super Admin can force overwrite
                const response = await updateRoom(conflictData.roomId, conflictData.updates, null, true);
                if (response.success) {
                    toast.success('Room updated successfully!');
                    await fetchDashboard();
                }
            } else if (user.role === 'ADMIN') {
                // Admin overwrites by using current server version to bypass conflict check
                // This allows the update to proceed since versions will match
                const response = await updateRoom(
                    conflictData.roomId, 
                    conflictData.updates, 
                    conflictData.currentVersion
                );
                if (response.success) {
                    toast.success('Room updated successfully!');
                    await fetchDashboard();
                }
            } else {
                toast.error('Only Admin and Super Admin can overwrite server changes');
            }
        } catch (error) {
            if (error.response?.status === 409) {
                // Still a conflict - this shouldn't happen but handle it
                toast.error('Conflict still exists. Please try again.');
                await fetchDashboard();
            } else {
                toast.error(error.message || 'Failed to update room');
            }
        } finally {
            setOverwriting(false);
            setIsConflictModalOpen(false);
            setConflictData(null);
            setOfflineConflict(null);
        }
    };

    // Handle booked room modal confirm
    const handleBookedConfirm = async () => {
        if (!pendingAction) return;

        if (pendingAction.type === 'delete') {
            await performDelete(pendingAction.roomId, true);
        } else if (pendingAction.type === 'update') {
            if (user.role === 'SUPER_ADMIN') {
                try {
                    const response = await updateRoom(pendingAction.roomId, pendingAction.updates, null, true);
                    if (response.success) {
                        toast.success('Room updated successfully!');
                        await fetchDashboard();
                    }
                } catch (error) {
                    toast.error(error.message || 'Failed to update room');
                }
            }
        }

        setIsBookedModalOpen(false);
        setPendingAction(null);
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
            {/* Offline Banner */}
            <OfflineBanner isOnline={isOnline} queueLength={queueLength} />

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1">Floor Management</h1>
                            <p className="text-blue-100 text-sm">Manage your office floor plan</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-white font-medium">Welcome, {user?.name}</p>
                                <p className="text-blue-100 text-xs">({user?.role})</p>
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
                    
                    {floorData && (
                        <VersionIndicator
                            isLive={floorData.isLive}
                            currentVersion={floorData.currentVersion}
                            userVersion={floorData.userVersion}
                            onSync={handleSync}
                            syncing={syncing}
                        />
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Rooms</h2>
                        <p className="text-gray-500 text-sm mt-1">Manage and organize your office rooms</p>
                    </div>
                    {user?.role === 'SUPER_ADMIN' && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            disabled={creating}
                            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {creating ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <span>+</span> Create Room
                                </>
                            )}
                        </button>
                    )}
                </div>

                {floorData?.data?.rooms && floorData.data.rooms.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {floorData.data.rooms.map((room) => (
                            <RoomCard
                                key={room.id}
                                room={room}
                                onEdit={handleEditRoom}
                                onDelete={handleDeleteRoom}
                                onFree={handleFreeRoom}
                                userRole={user?.role}
                                freeing={freeing}
                                deleting={deleting}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-blue-100">
                        <div className="text-6xl mb-4">🏢</div>
                        <p className="text-gray-600 text-lg font-medium">No rooms found</p>
                        <p className="text-gray-500 text-sm mt-1">Create your first room to get started!</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            <CreateRoomModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateRoom}
                creating={creating}
            />

            {selectedRoom && (
                <EditRoomModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedRoom(null);
                    }}
                    room={selectedRoom}
                    onSubmit={handleUpdateRoom}
                    userRole={user?.role}
                    userVersion={floorData?.userVersion}
                    updating={creating}
                />
            )}

            {(conflictData || offlineConflict) && (
                <ConflictResolutionModal
                    isOpen={isConflictModalOpen}
                    serverRoom={conflictData?.serverRoom || offlineConflict?.serverRoom}
                    serverFields={conflictData?.serverFields || offlineConflict?.serverFields}
                    clientFields={conflictData?.clientFields || offlineConflict?.clientFields}
                    onAcceptServer={handleAcceptServer}
                    onOverwriteServer={handleOverwriteServer}
                />
            )}

            {/* Delete Confirmation Modal */}
            {roomToDelete && (
                <BookedRoomModal
                    isOpen={isDeleteConfirmModalOpen}
                    onClose={() => {
                        setIsDeleteConfirmModalOpen(false);
                        setRoomToDelete(null);
                    }}
                    onConfirm={confirmDelete}
                    title="⚠️ Confirm Deletion"
                    message={`Are you sure you want to delete room "${roomToDelete.name}"? This action cannot be undone.`}
                    confirmText="Delete Room"
                    loading={false}
                />
            )}

            <BookedRoomModal
                isOpen={isBookedModalOpen}
                onClose={() => {
                    setIsBookedModalOpen(false);
                    setPendingAction(null);
                }}
                onConfirm={handleBookedConfirm}
                title="⚠️ Room Occupied"
                message="This room is currently booked. Deleting or modifying it will cancel the active meeting."
                confirmText="Force Delete & Free Room"
                loading={deleting || overwriting}
            />
        </div>
    );
};

export default Dashboard;
