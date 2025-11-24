import prisma from '../config/db.js';
import { invalidateFloorCache } from '../utils/cacheUtils.js';

// Room service class with OOPS structure
class RoomService {
    // Archive current floor state to history
    async _archiveFloor(floorId, updatedById, tx = null) {
        const client = tx || prisma;
        
        const floor = await client.floor.findUnique({
            where: { id: floorId },
            include: {
                rooms: {
                    include: {
                        bookings: {
                            where: { endTime: null },
                            select: {
                                id: true,
                                userId: true,
                                startTime: true,
                                participants: true
                            }
                        }
                    }
                }
            }
        });

        const floorData = {
            id: floor.id,
            name: floor.name,
            currentVersion: floor.currentVersion,
            rooms: floor.rooms.map(room => ({
                id: room.id,
                name: room.name,
                type: room.type,
                capacity: room.capacity,
                status: room.status,
                bookings: room.bookings
            }))
        };

        await client.floorHistory.create({
            data: {
                floorId,
                version: floor.currentVersion,
                data: floorData,
                updatedById
            }
        });
    }

    // Increment floor version and update user's lastSyncedVersion
    async _incrementVersion(floorId, userId, tx = null) {
        const client = tx || prisma;
        
        const floor = await client.floor.update({
            where: { id: floorId },
            data: { currentVersion: { increment: 1 } }
        });

        await client.user.update({
            where: { id: userId },
            data: { lastSyncedVersion: floor.currentVersion }
        });

        // Only invalidate cache if not in transaction (cache invalidation should happen after commit)
        if (!tx) {
            await invalidateFloorCache();
        }
        return floor.currentVersion;
    }

    // Create room (Super Admin only)
    async createRoom(name, type, capacity, floorId, userId) {
        return await prisma.$transaction(async (tx) => {
            // Archive current state
            await this._archiveFloor(floorId, userId, tx);

            // Create room
            const room = await tx.room.create({
                data: {
                    id: `R-${Date.now()}`,
                    name,
                    type,
                    capacity,
                    status: 'ACTIVE',
                    floorId
                }
            });

            // Increment version
            await this._incrementVersion(floorId, userId, tx);

            return room;
        }, {
            maxWait: 10000, // Maximum time to wait for a transaction slot
            timeout: 20000  // Maximum time the transaction can run
        }).then(async (result) => {
            // Invalidate cache after transaction commits
            await invalidateFloorCache();
            return result;
        });
    }

    // Delete room (Super Admin only)
    async deleteRoom(roomId, force, userId) {
        // First check if room exists in the latest version
        const floor = await prisma.floor.findUnique({
            where: { id: 1 },
            include: {
                rooms: {
                    where: { id: roomId }
                }
            }
        });

        if (!floor) {
            throw new Error('Floor not found');
        }

        // Check if room exists in latest version
        if (!floor.rooms || floor.rooms.length === 0) {
            // Room doesn't exist in latest version - it was already deleted
            throw { 
                statusCode: 410, 
                message: 'Room has already been deleted in the latest version',
                roomDeleted: true,
                currentVersion: floor.currentVersion
            };
        }

        // Room exists, proceed with deletion
        return await prisma.$transaction(async (tx) => {
            const room = await tx.room.findUnique({
                where: { id: roomId },
                include: { floor: true }
            });

            if (!room) {
                throw new Error('Room not found');
            }

            // Check if room is booked
            if (room.status === 'BOOKED' && !force) {
                throw { statusCode: 409, message: 'Room is Booked', isBooked: true };
            }

            // Archive current state
            await this._archiveFloor(room.floorId, userId, tx);

            // Delete room (cascade will handle bookings)
            await tx.room.delete({
                where: { id: roomId }
            });

            // Increment version
            await this._incrementVersion(room.floorId, userId, tx);

            return { success: true };
        }, {
            maxWait: 10000,
            timeout: 20000
        }).then(async (result) => {
            await invalidateFloorCache();
            return result;
        });
    }

    // Update room (Super Admin)
    async updateRoomSuperAdmin(roomId, updates, force, userId) {
        // First check if room exists in the latest version
        const floor = await prisma.floor.findUnique({
            where: { id: 1 },
            include: {
                rooms: {
                    where: { id: roomId }
                }
            }
        });

        if (!floor) {
            throw new Error('Floor not found');
        }

        // Check if room exists in latest version
        if (!floor.rooms || floor.rooms.length === 0) {
            // Room doesn't exist in latest version - it was already deleted
            throw { 
                statusCode: 410, 
                message: 'Room has already been deleted in the latest version',
                roomDeleted: true,
                currentVersion: floor.currentVersion
            };
        }

        return await prisma.$transaction(async (tx) => {
            const room = await tx.room.findUnique({
                where: { id: roomId },
                include: { floor: true }
            });

            if (!room) {
                throw new Error('Room not found');
            }

            // Prevent Super Admin from setting status to BOOKED
            if (updates.status === 'BOOKED') {
                throw { statusCode: 400, message: 'Cannot set room status to BOOKED. Rooms are booked through the booking system only.' };
            }

            // Check if room is booked and trying to change status
            if (room.status === 'BOOKED' && updates.status && updates.status !== 'BOOKED') {
                // Update user's version to latest
                await tx.user.update({
                    where: { id: userId },
                    data: { lastSyncedVersion: room.floor.currentVersion }
                });
                throw { statusCode: 400, message: 'Room is booked. You cannot change the status.' };
            }

            // If room is booked and force is false, return conflict
            if (room.status === 'BOOKED' && !force) {
                throw { statusCode: 409, message: 'Room is occupied. Force Update?', isBooked: true };
            }

            // Archive current state
            await this._archiveFloor(room.floorId, userId, tx);

            // Update room
            const updatedRoom = await tx.room.update({
                where: { id: roomId },
                data: updates
            });

            // Increment version
            await this._incrementVersion(room.floorId, userId, tx);

            return updatedRoom;
        }, {
            maxWait: 10000,
            timeout: 20000
        }).then(async (result) => {
            // Invalidate cache after transaction commits
            await invalidateFloorCache();
            return result;
        });
    }

    // Update room (Admin) with conflict resolution
    async updateRoomAdmin(roomId, updates, adminLastSyncVersion, userId) {
        return await prisma.$transaction(async (tx) => {
            const room = await tx.room.findUnique({
                where: { id: roomId },
                include: { floor: true }
            });

            if (!room) {
                throw new Error('Room not found');
            }

            // Check if room is booked
            if (room.status === 'BOOKED') {
                throw { statusCode: 403, message: 'Room is occupied. You cannot edit it.' };
            }

            // Check version
            const currentVersion = room.floor.currentVersion;

            // Scenario A: Versions match (No conflict)
            if (adminLastSyncVersion === currentVersion) {
                await this._archiveFloor(room.floorId, userId, tx);

                const updatedRoom = await tx.room.update({
                    where: { id: roomId },
                    data: updates
                });

                await this._incrementVersion(room.floorId, userId, tx);
                return { room: updatedRoom, conflict: false };
            }

            // Scenario B: Versions mismatch (Conflict)
            // Get the original room data from history
            const historyEntry = await tx.floorHistory.findFirst({
                where: {
                    floorId: room.floorId,
                    version: adminLastSyncVersion
                },
                orderBy: { archivedAt: 'desc' }
            });

            const originalRoom = historyEntry?.data?.rooms?.find(r => r.id === roomId);

            // Compare fields for real conflicts
            const serverFields = {};
            const clientFields = {};
            let hasConflict = false;

            Object.keys(updates).forEach(key => {
                const serverValue = room[key];
                const clientValue = updates[key];
                const originalValue = originalRoom?.[key];

                // Real conflict: DB value != Admin's original view
                if (serverValue !== originalValue && serverValue !== clientValue) {
                    serverFields[key] = serverValue;
                    clientFields[key] = clientValue;
                    hasConflict = true;
                }
            });

            if (hasConflict) {
                throw {
                    statusCode: 409,
                    message: 'Conflict detected',
                    serverFields,
                    clientFields,
                    serverRoom: {
                        id: room.id,
                        name: room.name,
                        type: room.type,
                        capacity: room.capacity,
                        status: room.status
                    },
                    currentVersion: currentVersion
                };
            }

            // Merge safe: No real conflict, proceed with update
            await this._archiveFloor(room.floorId, userId, tx);

            const updatedRoom = await tx.room.update({
                where: { id: roomId },
                data: updates
            });

            await this._incrementVersion(room.floorId, userId, tx);
            return { room: updatedRoom, conflict: false };
        }, {
            maxWait: 10000, // Maximum time to wait for a transaction slot
            timeout: 20000  // Maximum time the transaction can run
        }).then(async (result) => {
            // Invalidate cache after transaction commits
            await invalidateFloorCache();
            return result;
        });
    }
}

export default new RoomService();

