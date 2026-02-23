# 6. Data Persistence & Sync

## Storage Layers

KidCare uses a **dual-write** strategy: every state change is saved both locally and (if signed-in) to the cloud.

```
User Action
    │
    ▼
updateState(newState)
    ├── setState(newState)         ← React re-render
    ├── saveState(newState)        ← localStorage write
    └── saveToFirebase(user, newState)  ← Firestore write (if logged in)
```

## Local Storage

Managed by [storageService.ts](../services/storageService.ts).

- **Storage Key**: `kidcare_tracker_v2`
- **Format**: JSON-serialized `AppState`
- **Default State**: One profile named "Alex" with `bg-blue-400` color, no logs.
- **Validation**: On load, checks that `profiles` array exists and is non-empty. Falls back to default if corrupted.

### Backup & Restore

- **Export**: `exportStateToJSON()` → serialized JSON string → downloaded as `.json` file.
- **Import**: `importStateFromJSON()` → parses JSON, validates `profiles` and `logs` keys exist → saves to localStorage and reloads page.

## Cloud Sync (Firestore)

Managed by [firebase.ts](../services/firebase.ts).

### Named Database

The app uses a **named Firestore database** called `kidcare` (not the default):

```typescript
export const db = getFirestore(app, "kidcare");
```

### Real-Time Subscription

On login, the app subscribes to the user's state document:

```typescript
subscribeToData(user, (cloudData) => {
    if (cloudData) {
        // Cloud → Local (overwrite)
        setState(cloudData);
        saveState(cloudData);
    } else {
        // Local → Cloud (first-time migration)
        saveToFirebase(user, loadState());
    }
});
```

This uses Firestore's `onSnapshot` for real-time updates. If the user modifies data on another device, changes appear instantly.

### Write Strategy

```typescript
await setDoc(docRef, state, { merge: true });
```

The entire `AppState` is written as one document with `merge: true`. This ensures atomic, consistent state across sessions.

### Migration: Guest → Signed-In

When a user signs in for the first time:
1. The Firestore document doesn't exist yet.
2. `subscribeToData` receives `null`.
3. The current localStorage data is uploaded to Firestore.
4. Subsequent changes sync bidirectionally.

## Data Flow Diagram

```
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│  localStorage│◄──────│  App State  │──────►│  Firestore   │
│  (always)    │        │  (React)    │        │  (if auth'd) │
└─────────────┘        └─────────────┘        └─────────────┘
       ▲                                              │
       │                                              │
       └──────────── onSnapshot (real-time) ──────────┘
```

## Account Profile

The `AccountProfile` (premium status, settings) is stored and synced separately:

- **Read**: `getUserAccountProfile()` — fetches on login, creates with defaults if missing.
- **Write**: `saveUserAccountProfile()` — called when user changes settings (temperature unit, etc.).
- **Path**: `users/{uid}/account/profile`
