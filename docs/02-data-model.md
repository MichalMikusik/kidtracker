# 2. Data Model

## TypeScript Types

All canonical type definitions live in the root [types.ts](../types.ts). The file at `src/types.ts` re-exports them for backwards compatibility.

### Core Types

```typescript
// A single temperature reading recorded during a sick day
interface TemperatureReading {
  time: string;   // "HH:MM"
  value: number;  // e.g. 38.5
}

// A medication entry
interface Medication {
  name: string;   // e.g. "Ibuprofen"
  dosage: string; // e.g. "5ml"
}

// Everything recorded for one day
interface DailyLog {
  date: string;                   // "YYYY-MM-DD"
  symptoms?: string[];            // ["Fever", "Cough", ...]
  medications?: Medication[];
  notes?: string;
  temperatures?: TemperatureReading[];
}
```

### Profile & State

```typescript
// A tracked person (child or family member)
interface Profile {
  id: string;              // e.g. "p1", "p1708901234567"
  name: string;
  avatarColor: string;     // Tailwind class like "bg-blue-400"
  dateOfBirth?: string;    // "YYYY-MM-DD"
  profilePicture?: string; // Base64-encoded image data URL
}

// Root application state — persisted as a single unit
interface AppState {
  profiles: Profile[];
  logs: Record<string, Record<string, DailyLog>>;
  // First key  = profileId
  // Second key = date string "YYYY-MM-DD"
  currentProfileId: string;
}
```

### Account & Stats

```typescript
// Per-user account metadata (stored separately in Firestore)
interface AccountProfile {
  status: 'pending' | 'approved';
  isPremium: boolean;
  email: string | null;
  temperatureUnit: 'C' | 'F';
  currency: 'USD' | 'EUR' | 'GBP';
}

// Computed statistics (not persisted — derived at render time)
interface Stats {
  totalSickDays: number;
  episodesCount: number;
  averageDuration: number;          // days
  meanTimeBetweenIllness: number;   // days
  commonSymptoms: Record<string, number>;
}
```

## Firestore Document Structure

The app uses a **named Firestore database** called `kidcare` (not the default `(default)` database).

```
firestore: kidcare
└── users/
    └── {uid}/
        ├── data/
        │   └── trackerState          ← Full AppState document
        │       { profiles, logs, currentProfileId }
        └── account/
            └── profile               ← AccountProfile document
                { status, isPremium, email, temperatureUnit, currency }
```

### Design Decisions

- **Single-document state**: The entire `AppState` (all profiles + all logs) is stored in one Firestore document per user (`users/{uid}/data/trackerState`). This simplifies sync — the app subscribes to a single `onSnapshot` listener and receives the full state on every change.
- **Account profile separation**: `AccountProfile` is stored in a separate sub-collection so Firestore security rules can independently protect the `isPremium` field from client-side escalation.

## Computed Data

The **Stats** object and **family correlation data** are never persisted. They are computed on the fly inside the `StatsView` component using `useMemo`.

### Episode Detection Algorithm

1. Sort all `DailyLog` entries by date.
2. A log is "sick" if it has symptoms or temperature readings.
3. Consecutive sick days (gap ≤ 1 day) belong to the same episode.
4. A gap > 1 day starts a new episode.

### Family Transmission Detection

For each pair of profiles, the app compares episode start dates. If profile A's episode starts 1–7 days before profile B's episode, a "likely passed to" / "likely caught from" correlation is reported.
