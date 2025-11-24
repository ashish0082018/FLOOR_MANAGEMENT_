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

1. **Implement transactions to maintain data integrity** - All write operations (create, update, delete, book, free) use database transactions to ensure atomicity and prevent data inconsistencies.

2. **For speed use caching, to access the floor plan instantly without hitting the database** - Redis caching with 1-hour TTL provides fast access to floor data for users with matching versions, reducing database load.

3. **Archive complete floor state on every update for conflict resolution** - The system stores complete floor snapshots (JSON blobs) in `FloorHistory` on every operation. This trades database storage and write performance for the ability to resolve conflicts by comparing original data with current state.

---

## 🏗️ Architecture

- **Role-Based Access**: SUPER_ADMIN, ADMIN, EMPLOYEE
- **Version Control**: Floor versioning with history tracking
- **Caching**: Redis for floor data caching (1-hour TTL)
- **Offline Support**: Local storage queue for write operations
- **Conflict Resolution**: Optimistic concurrency control with field-level detection

