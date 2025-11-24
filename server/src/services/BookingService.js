import prisma from '../config/db.js';
import { getFloorData, setFloorData, invalidateFloorCache } from '../utils/cacheUtils.js';

// Booking service class with OOPS structure
class BookingService {
    // Get dashboard data (cached)
    async getDashboard() {
        let floorData = await getFloorData();

        if (!floorData) {
            // Cache miss - fetch from DB
            const floor = await prisma.floor.findUnique({
                where: { id: 1 },
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

            if (!floor) {
                throw new Error('Floor not found');
            }

            floorData = {
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

            await setFloorData(floorData);
        }

        return floorData;
    }

    // Get room recommendations based on capacity and history
    async getRecommendations(userId, requiredCapacity) {
        // Fetch all active rooms from DB (to ensure latest data for history calculation)
        const rooms = await prisma.room.findMany({
            where: {
                status: 'ACTIVE'
            },
            include: {
                bookings: {
                    where: {
                        userId,
                        endTime: { not: null } // Only past bookings for history
                    }
                }
            }
        });

        // Filter by capacity
        const suitableRooms = rooms.filter(room => room.capacity >= requiredCapacity);

        // Calculate scores
        const scoredRooms = suitableRooms.map(room => {
            // Capacity score: 100 - (RoomCapacity - RequiredCapacity)
            const capacityScore = 100 - (room.capacity - requiredCapacity);
            
            // History score: PastBookingsCount * 5
            const pastBookingsCount = room.bookings.length;
            const historyScore = pastBookingsCount * 5;
            
            // Total score
            const totalScore = capacityScore + historyScore;

            return {
                id: room.id,
                name: room.name,
                type: room.type,
                capacity: room.capacity,
                status: room.status,
                capacityScore,
                historyScore,
                totalScore,
                pastBookingsCount
            };
        });

        // Sort by highest score
        scoredRooms.sort((a, b) => b.totalScore - a.totalScore);

        return scoredRooms;
    }

    // Book a room (with concurrency handling)
    async bookRoom(userId, roomId, participants = 1) {
        return await prisma.$transaction(async (tx) => {
            // Check room status (the guard)
            const room = await tx.room.findUnique({
                where: { id: roomId },
                include: { floor: true }
            });

            if (!room) {
                throw new Error('Room not found');
            }

            if (room.status === 'BOOKED' || room.status === 'UNDER_MAINTENANCE') {
                throw { statusCode: 409, message: 'Room is no longer available. Please refresh.' };
            }

            // Archive current state
            await this._archiveFloor(room.floorId, userId, tx);

            // Update room status to BOOKED
            await tx.room.update({
                where: { id: roomId },
                data: { status: 'BOOKED' }
            });

            // Create booking
            const booking = await tx.booking.create({
                data: {
                    userId,
                    roomId,
                    participants,
                    startTime: new Date()
                }
            });

            // Increment version
            await this._incrementVersion(room.floorId, userId, tx);

            return { booking, newFloorVersion: room.floor.currentVersion + 1 };
        }, {
            maxWait: 10000,
            timeout: 20000
        }).then(async (result) => {
            // Invalidate cache after transaction commits
            await invalidateFloorCache();
            return result;
        });
    }

    // Free/unbook a room
    async freeRoom(userId, roomId, userRole) {
        return await prisma.$transaction(async (tx) => {
            // Find active booking
            const booking = await tx.booking.findFirst({
                where: {
                    roomId,
                    endTime: null
                },
                include: {
                    room: {
                        include: { floor: true }
                    }
                }
            });

            if (!booking) {
                throw new Error('No active booking found for this room');
            }

            // Permission check
            if (userRole !== 'SUPER_ADMIN' && booking.userId !== userId) {
                throw { statusCode: 403, message: 'You can only free rooms you booked' };
            }

            // Archive current state
            await this._archiveFloor(booking.room.floorId, userId, tx);

            // Update booking endTime
            await tx.booking.update({
                where: { id: booking.id },
                data: { endTime: new Date() }
            });

            // Update room status to ACTIVE
            await tx.room.update({
                where: { id: roomId },
                data: { status: 'ACTIVE' }
            });

            // Increment version
            await this._incrementVersion(booking.room.floorId, userId, tx);

            return { success: true, newFloorVersion: booking.room.floor.currentVersion + 1 };
        }, {
            maxWait: 10000,
            timeout: 20000
        }).then(async (result) => {
            // Invalidate cache after transaction commits
            await invalidateFloorCache();
            return result;
        });
    }

    // Archive floor state to history
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

    // Increment floor version and invalidate cache
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
}

export default new BookingService();

