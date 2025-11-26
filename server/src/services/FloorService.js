import prisma from '../config/db.js';
import { getFloorData, setFloorData } from '../utils/cacheUtils.js';

// Floor service class for version management
class FloorService {
    // Get dashboard data based on user's(super_admin and admin) last synced version
    async getDashboardData(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { lastSyncedVersion: true }
        });

        const floor = await prisma.floor.findUnique({
            where: { id: 1 },
            select: { currentVersion: true }
        });

        if (!floor) {
            throw new Error('Floor not found');
        }

        const userVersion = user.lastSyncedVersion || 0;
        const currentVersion = floor.currentVersion;

        // Case A: Versions match - use cache or DB
        if (userVersion === currentVersion) {
            let floorData = await getFloorData();
            
            if (!floorData) {
                // Cache miss - fetch from DB
                floorData = await this._fetchFloorFromDB();
                await setFloorData(floorData);
            }

            return {
                data: floorData,
                isLive: true,
                currentVersion,
                userVersion
            };
        }

        // Case B: User version is outdated - fetch from FloorHistory
        const historyEntry = await prisma.floorHistory.findFirst({
            where: {
                floorId: 1,
                version: userVersion
            },
            orderBy: { archivedAt: 'desc' }
        });

        if (historyEntry) {
            return {
                data: historyEntry.data,
                isLive: false,
                currentVersion,
                userVersion
            };
        }

        // Fallback: fetch current data
        const floorData = await this._fetchFloorFromDB();
        return {
            data: floorData,
            isLive: false,
            currentVersion,
            userVersion
        };
    }

    // Sync user version to latest
    async syncVersion(userId) {
        const floor = await prisma.floor.findUnique({
            where: { id: 1 },
            select: { currentVersion: true }
        });

        if (!floor) {
            throw new Error('Floor not found');
        }

        await prisma.user.update({
            where: { id: userId },
            data: { lastSyncedVersion: floor.currentVersion }
        });

        // Fetch latest data
        const floorData = await this._fetchFloorFromDB();
        await setFloorData(floorData);

        return {
            data: floorData,
            currentVersion: floor.currentVersion
        };
    }

    // Fetch floor data from database
    async _fetchFloorFromDB() {
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

        return {
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
    }
}

export default new FloorService();

