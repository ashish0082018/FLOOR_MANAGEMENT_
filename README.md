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

Uses **Optimistic Concurrency Control** with version tracking. When an Admin updates a room, the system compares their `lastSyncedVersion` with the floor's `currentVersion`. If versions match, the update proceeds. If not, it checks for real conflicts by comparing field values with the original data from `FloorHistory`. Only actual conflicts (where server and client values differ from the original) trigger a conflict modal. Safe merges proceed automatically.

```javascript
// Conflict detection logic
if (adminLastSyncVersion === currentVersion) {
    // No conflict - update proceeds
} else {
    // Check if server value changed from original
    if (serverValue !== originalValue && serverValue !== clientValue) {
        // Real conflict - show resolution modal
    } else {
        // Merge safe - proceed with update
    }
}
```

---

### 2. Offline Sync Mechanism

For Admin and Super Admin roles, write operations (POST, PATCH, DELETE) are automatically queued in `localStorage` when offline. When connection is restored, the queue is processed sequentially. If a conflict is detected during sync, processing stops and a conflict resolution modal is shown.

```javascript
// Offline interceptor queues requests
if (!navigator.onLine) {
    addToQueue({ type, endpoint, payload });
    return Promise.reject({ isOffline: true });
}

// Sync service processes queue when online
for (const action of queue) {
    await api.request(reconstructConfig(action));
    if (error.status === 409) {
        onConflict(); // Stop and show modal
        break;
    }
}
```

---

### 3. Booking Recommendation & Booking System

Rooms are recommended based on **capacity match** and **booking history**. The algorithm calculates: `Capacity Score (100 - capacity difference) + History Score (past bookings × 5)`. Rooms are sorted by total score. Booking uses database transactions to prevent double-booking and ensures atomicity.

```javascript
// Recommendation scoring
const capacityScore = 100 - (room.capacity - requiredCapacity);
const historyScore = pastBookingsCount * 5;
const totalScore = capacityScore + historyScore;

// Transaction-based booking
await prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({ where: { id: roomId } });
    if (room.status === 'BOOKED') throw { statusCode: 409 };
    await tx.room.update({ data: { status: 'BOOKED' } });
});
```

---

## 👥 Role Permissions

### Super Admin Role

| Action | Permission |
|--------|-----------|
| Create / Delete / Update Room | ✅ Allowed (Room can be deleted only if room is NOT booked) |
| Add / Reduce Seat Capacity | ✅ Allowed |
| Free the Room (force free) | ✅ Allowed |
| Booking a Seat | ❌ Not primary role, but can free room if needed |
| Offline Requests Support | ✅ Allowed (queued when offline) |

### Admin Role

| Action | Permission |
|--------|-----------|
| Change Room Name & Type | ✅ Allowed |
| Conflict Resolution | 🟡 Allowed (Admin can see conflict & select which version to keep) |
| Merge Process | 🟡 Allowed (Admin resolves merged fields if multiple edits occur) |
| Free Room | ❌ Not allowed |
| Booking a Seat | ❌ Not allowed |
| Offline Requests Support | ✅ Allowed (changes queued when offline) |

### Employee Role

| Action | Permission |
|--------|-----------|
| Book a Room / Seat | ✅ Allowed |
| Suggest Best Room | ⚙️ Based on required capacity and most frequently booked by employee |
| Free Room | ✅ Free the room of own (only super_admin can also do) |
| Change Room / Seat | ❌ Not allowed |
| Offline Requests Support | ❌ Not allowed |

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

## ⚖️ Trade-offs in the System

### 1. Floor History Archiving
**Decision**: Archive complete floor state to `FloorHistory` on every update operation.

**Trade-off**: 
- ✅ **Pros**: Complete audit trail, enables conflict resolution by fetching original data
- ❌ **Cons**: Increased database storage (JSON blobs), slower write operations

**Rationale**: Essential for conflict resolution - Admin needs to see what the room looked like at their sync version. Storage cost is acceptable for data integrity.

---

### 2. Redis Caching Strategy
**Decision**: Cache floor data with 1-hour TTL, invalidate on every write operation.

**Trade-off**:
- ✅ **Pros**: Fast reads for users with matching versions, reduces database load
- ❌ **Cons**: Cache invalidation on every write reduces hit rate, requires Redis infrastructure

**Rationale**: Most users will have matching versions (cached), providing significant performance gains. Invalidation ensures consistency at the cost of cache efficiency.

---

### 3. Transaction Timeouts
**Decision**: Set `maxWait: 10000ms` and `timeout: 20000ms` for all transactions.

**Trade-off**:
- ✅ **Pros**: Prevents indefinite locks, ensures system responsiveness
- ❌ **Cons**: Complex operations may timeout, requires retry logic

**Rationale**: Balances data consistency (via transactions) with system availability. Timeouts prevent deadlocks while allowing sufficient time for normal operations.

---

### 4. Offline Queue in localStorage
**Decision**: Store offline actions in browser's localStorage instead of IndexedDB.

**Trade-off**:
- ✅ **Pros**: Simple implementation, synchronous access, no async overhead
- ❌ **Cons**: Storage limit (~5-10MB), synchronous operations can block UI

**Rationale**: For typical use cases, localStorage capacity is sufficient. Simplicity outweighs storage limitations for this application scale.

---

### 5. Sequential Queue Processing
**Decision**: Process offline queue sequentially with 100ms delay between requests.

**Trade-off**:
- ✅ **Pros**: Prevents server overload, easier error handling, maintains request order
- ❌ **Cons**: Slower sync for large queues, not optimal for parallel-capable operations

**Rationale**: Reliability and server stability are prioritized over speed. Sequential processing ensures conflicts are detected in order and prevents overwhelming the server.

---

### 6. Version Tracking for All Users
**Decision**: Maintain `lastSyncedVersion` for all users, not just Admins.

**Trade-off**:
- ✅ **Pros**: Enables version-aware dashboard loading, shows outdated data warnings
- ❌ **Cons**: Additional database field, version sync overhead for all users

**Rationale**: Provides better UX by showing when data is outdated. Minimal overhead for significant user experience improvement.

---

### 7. Cache Invalidation on Every Write
**Decision**: Invalidate Redis cache after every room update/delete/booking.

**Trade-off**:
- ✅ **Pros**: Guarantees data consistency, prevents stale data issues
- ❌ **Cons**: Low cache hit rate for frequently updated floors, increased database queries

**Rationale**: Data consistency is critical for room availability. Better to have accurate data than fast but potentially incorrect cached data.

---

### 8. Conflict Resolution Complexity
**Decision**: Implement field-level conflict detection with history lookup.

**Trade-off**:
- ✅ **Pros**: Smart merging (only real conflicts trigger modal), better UX
- ❌ **Cons**: Complex logic, additional database queries, higher maintenance cost

**Rationale**: Reduces user friction by only showing conflicts when necessary. The complexity is justified by improved user experience and data integrity.

---

## 🏗️ Architecture

- **Role-Based Access**: SUPER_ADMIN, ADMIN, EMPLOYEE
- **Version Control**: Floor versioning with history tracking
- **Caching**: Redis for floor data caching (1-hour TTL)
- **Offline Support**: Local storage queue for write operations
- **Conflict Resolution**: Optimistic concurrency control with field-level detection

