# Floor Management System

A comprehensive room and booking management system with offline support, conflict resolution, and intelligent room recommendations.

## 🚀 Tech Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Router** - Routing
- **Sonner** - Toast notifications

### Backend
- **Node.js** - Runtime
- **Express 5** - Web framework
- **Prisma** - ORM
- **PostgreSQL** - Database
- **Redis** - Caching
- **JWT** - Authentication
- **bcrypt** - Password hashing

---

## ✨ Main Features

### 1. Conflict Resolution System

The system uses **Optimistic Concurrency Control** with version tracking to handle concurrent updates by Admin users.

#### How It Works

1. **Version Tracking**: Each floor has a `currentVersion` that increments on every update. Users maintain `lastSyncedVersion`.

2. **Conflict Detection**: When an Admin updates a room:
   - Compares `adminLastSyncVersion` with `floor.currentVersion`
   - If versions match → Update proceeds
   - If versions mismatch → Conflict check begins

3. **Smart Conflict Detection**: 
   - Fetches original room data from `FloorHistory` at the Admin's sync version
   - Compares only the fields being updated
   - **Real Conflict**: Server value ≠ Admin's original view AND ≠ Admin's new value
   - **Merge Safe**: Server value = Admin's original view (safe to merge)

4. **Resolution Options**:
   - **Accept Server**: Sync to latest version, discard local changes
   - **Accept My Response**: Force update with local changes

#### Code Snippet

```javascript
// Server-side conflict detection (RoomService.js)
async updateRoomAdmin(roomId, updates, adminLastSyncVersion, userId) {
    // Check version
    if (adminLastSyncVersion === currentVersion) {
        // No conflict - proceed with update
        return await tx.room.update({ where: { id: roomId }, data: updates });
    }
    
    // Version mismatch - check for real conflicts
    const originalRoom = historyEntry?.data?.rooms?.find(r => r.id === roomId);
    
    Object.keys(updates).forEach(key => {
        const serverValue = room[key];
        const originalValue = originalRoom?.[key];
        
        // Real conflict: DB changed AND different from client's new value
        if (serverValue !== originalValue && serverValue !== clientValue) {
            serverFields[key] = serverValue;
            clientFields[key] = clientValue;
            hasConflict = true;
        }
    });
    
    if (hasConflict) {
        throw { statusCode: 409, serverFields, clientFields };
    }
    
    // Merge safe - proceed with update
}
```

**Flow Diagram:**
```
Admin Updates Room
    ↓
Check Version Match?
    ├─ Yes → Update Room → Increment Version → Update User's lastSyncedVersion
    └─ No → Fetch Original Data from History
            ↓
        Compare Fields
            ├─ Real Conflict → Return 409 → Show Conflict Modal
            └─ Merge Safe → Update Room → Increment Version
```

---

### 2. Offline Sync Mechanism

The system supports **offline-first architecture** for Admin and Super Admin roles, allowing room management operations to work without internet connectivity.

#### How It Works

1. **Request Interception**: Axios interceptor detects offline status and queues write operations (POST, PATCH, DELETE).

2. **Local Storage Queue**: Offline actions are stored in `localStorage` with metadata:
   - Action type (POST, PATCH, DELETE)
   - Endpoint URL
   - Payload data
   - Timestamp

3. **Automatic Sync**: When connection is restored:
   - Processes queue sequentially
   - Reconstructs requests with proper headers and credentials
   - Handles conflicts if detected
   - Removes successful actions from queue

4. **Conflict Handling**: If a conflict is detected during sync:
   - Stops queue processing
   - Shows conflict resolution modal
   - Allows user to resolve before continuing

#### Code Snippet

```javascript
// Offline Interceptor (offlineInterceptor.js)
api.interceptors.request.use((config) => {
    // Skip queueing for GET requests
    if (config.method === 'get') return config;
    
    // If offline, queue the request
    if (!navigator.onLine) {
        const action = {
            type: config.method.toUpperCase(),
            endpoint: config.url,
            payload: config.data || {},
            headers: config.headers
        };
        
        addToQueue(action);
        return Promise.reject({ isOffline: true });
    }
    
    return config;
});

// Sync Service (syncService.js)
export const processOfflineQueue = async (onConflict) => {
    const queue = getQueue();
    
    for (const action of queue) {
        try {
            // Reconstruct request with proper config
            const config = {
                method: action.type.toLowerCase(),
                url: action.endpoint,
                data: action.payload,
                headers: { 'Content-Type': 'application/json', ...action.headers },
                withCredentials: true
            };
            
            const response = await api.request(config);
            removeFromQueue(action.id); // Success
            
            // Handle 409 conflict
            if (error.response?.status === 409) {
                onConflict({ action, ...error.response.data });
                break; // Stop processing
            }
        } catch (error) {
            // Handle errors...
        }
    }
};
```

**Flow Diagram:**
```
User Action (Offline)
    ↓
Axios Interceptor Detects Offline
    ↓
Queue Action in localStorage
    ↓
Connection Restored
    ↓
Process Queue Sequentially
    ├─ Success → Remove from Queue
    ├─ Conflict → Show Modal → Resolve
    └─ Error → Keep in Queue / Remove
```

---

### 3. Booking Recommendation & Booking System

An intelligent system that recommends rooms based on capacity requirements and booking history.

#### How It Works

1. **Recommendation Algorithm**:
   - **Capacity Score**: `100 - (RoomCapacity - RequiredCapacity)`
     - Closer capacity match = higher score
   - **History Score**: `PastBookingsCount × 5`
     - More past bookings = higher preference
   - **Total Score**: `Capacity Score + History Score`
   - Rooms sorted by highest score

2. **Booking Process**:
   - Checks room availability (status must be ACTIVE)
   - Uses database transactions for atomicity
   - Archives floor state before booking
   - Updates room status to BOOKED
   - Creates booking record
   - Increments floor version
   - Invalidates cache

3. **Concurrency Protection**:
   - Transaction-based booking prevents double-booking
   - Status check happens within transaction
   - If room becomes unavailable, returns 409 Conflict

#### Code Snippet

```javascript
// Recommendation Algorithm (BookingService.js)
async getRecommendations(userId, requiredCapacity) {
    const rooms = await prisma.room.findMany({
        where: { status: 'ACTIVE' },
        include: {
            bookings: {
                where: { userId, endTime: { not: null } } // Past bookings
            }
        }
    });
    
    // Filter by capacity
    const suitableRooms = rooms.filter(room => 
        room.capacity >= requiredCapacity
    );
    
    // Calculate scores
    const scoredRooms = suitableRooms.map(room => {
        const capacityScore = 100 - (room.capacity - requiredCapacity);
        const historyScore = room.bookings.length * 5;
        const totalScore = capacityScore + historyScore;
        
        return { ...room, capacityScore, historyScore, totalScore };
    });
    
    // Sort by highest score
    return scoredRooms.sort((a, b) => b.totalScore - a.totalScore);
}

// Booking with Transaction (BookingService.js)
async bookRoom(userId, roomId, participants = 1) {
    return await prisma.$transaction(async (tx) => {
        // Check room status within transaction
        const room = await tx.room.findUnique({
            where: { id: roomId },
            include: { floor: true }
        });
        
        if (room.status === 'BOOKED' || room.status === 'UNDER_MAINTENANCE') {
            throw { statusCode: 409, message: 'Room is no longer available' };
        }
        
        // Archive floor state
        await this._archiveFloor(room.floorId, userId, tx);
        
        // Update room status
        await tx.room.update({
            where: { id: roomId },
            data: { status: 'BOOKED' }
        });
        
        // Create booking
        await tx.booking.create({
            data: { userId, roomId, participants, startTime: new Date() }
        });
        
        // Increment version
        await this._incrementVersion(room.floorId, userId, tx);
    });
}
```

**Flow Diagram:**
```
Employee Requests Recommendations
    ↓
Filter Rooms (Capacity >= Required)
    ↓
Calculate Scores (Capacity + History)
    ↓
Sort by Total Score
    ↓
Display Top Recommendations
    ↓
User Selects Room
    ↓
Transaction: Check Status → Book → Archive → Increment Version
```

---

## 📋 Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis

### Backend Setup
```bash
cd server
npm install
cp .env.example .env  # Configure database and Redis
npx prisma migrate dev
npm run dev
```

### Frontend Setup
```bash
cd client
npm install
npm run dev
```

---

## 🏗️ Architecture

- **Role-Based Access**: SUPER_ADMIN, ADMIN, EMPLOYEE
- **Version Control**: Floor versioning with history tracking
- **Caching**: Redis for floor data caching
- **Offline Support**: Local storage queue for write operations
- **Conflict Resolution**: Optimistic concurrency control

---

## 📝 Notes

- Super Admins can create, update, and delete rooms
- Admins can update rooms (name, type only) with conflict resolution
- Employees can book and free rooms
- All room updates increment floor version and archive previous state
- Cache invalidation ensures data consistency

