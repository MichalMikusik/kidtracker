# 3. Frontend Architecture

## Component Tree

```
App.tsx                          ← Root: auth, state management, routing
├── Top Bar                      ← (inline) Profile switcher, login button
├── Tab Content
│   ├── CalendarView.tsx         ← Monthly grid with sick-day indicators
│   ├── HistoryView.tsx          ← Reverse-chronological log list
│   ├── StatsView.tsx            ← Statistics cards + family correlations
│   └── AI Insights              ← (inline) Gemini report panel
├── Bottom Navigation            ← (inline) Mobile tab bar + desktop floating nav
├── LogSheet.tsx                 ← Modal: log symptoms, temps, meds, notes
├── ProfileEditor.tsx            ← Modal: edit name, avatar, DOB, picture
├── UserSettings.tsx             ← Modal: temp unit, backup/restore, logout
└── InstallPrompt.tsx            ← PWA install banner
```

## State Management

There is **no external state library** (no Redux, Zustand, etc.). All state lives in `App.tsx` via React `useState` hooks.

### State Categories

| State | Hook | Description |
|---|---|---|
| `user` | `useState<User \| null>` | Firebase Auth user object |
| `accountProfile` | `useState<AccountProfile \| null>` | Premium status, settings |
| `state` | `useState<AppState>` | All profiles and logs |
| `activeTab` | `useState<Tab>` | Current navigation tab |
| `selectedDate` | `useState<string \| null>` | Date selected on calendar |
| `showLogSheet` | `useState<boolean>` | Log sheet modal visibility |
| `showProfileEditor` | `useState<boolean>` | Profile editor modal visibility |
| `showUserSettings` | `useState<boolean>` | User settings modal visibility |
| `aiInsight` | `useState<string>` | Latest AI-generated report text |
| `loadingAi` | `useState<boolean>` | AI request in-flight indicator |

### The `updateState` Pattern

All mutations to `AppState` go through just one helper:

```typescript
const updateState = (newState: AppState) => {
    setState(newState);            // Update React state
    saveState(newState);           // Persist to localStorage
    if (user) {
        saveToFirebase(user, newState); // Push to Firestore (if logged in)
    }
};
```

This ensures **every state change** is immediately persisted both locally and to the cloud.

## Component Details

### CalendarView

- Renders a standard monthly calendar grid (Monday-start).
- Each day cell checks the logs to determine status: `NONE`, `STARTED` (first day of episode = red), or `ONGOING` (continuation = orange).
- Navigation arrows step through months.
- Tapping a day calls `onDateSelect(dateStr)` which opens `LogSheet`.

### LogSheet

- A bottom-sheet modal with sections for:
  - **Symptoms**: 8 common symptom chips + custom symptom input.
  - **Temperature**: Stepper control (±0.1°) with time picker; multiple readings per day.
  - **Medications**: Name + dosage pairs.
  - **Notes**: Free-text area.
- On save: if all fields are empty, the log is deleted (clears the day).
- Resets form when the selected date changes.

### HistoryView

- Filters logs to only days with symptoms, temperatures, medications, or notes.
- Sorts descending by date.
- Shows symptom chips, max temperature, medication count, and notes.
- Each entry has an edit (pencil) button that opens `LogSheet` for that date.

### StatsView

- Computes `Stats` from current profile's logs via `useMemo`.
- Displays: Episodes, Total Sick Days, Average Duration, Mean Time Between Illness, Most Common Symptom.
- **Family Link** section: cross-references episode start dates across all profiles to detect transmission patterns (1–7 day gap).

### ProfileEditor

- Modal to edit: name, avatar color (16 Tailwind colors), profile picture (base64 upload), date of birth (DD/MM/YYYY format with auto-formatting).
- Delete profile button (prevented if it's the last profile).

### UserSettings

- Displays email, premium status.
- Temperature unit toggle (°C / °F).
- Auto-sync status indicator.
- Backup (download JSON) and Restore (upload JSON) buttons.
- Premium upgrade placeholder.
- Log out button.

### InstallPrompt

- Listens for the browser's `beforeinstallprompt` event.
- Shows a floating banner with an "Install" button when the PWA is installable.
- Dismissible by the user.

## Navigation

- **Mobile** (< md): Fixed bottom tab bar with 4 tabs — Calendar, History, Stats, AI Helper.
- **Desktop** (≥ md): Floating pill-shaped navigation bar centered at the bottom.
- Tabs are managed by `activeTab` state using a simple `Tab` enum.

## Styling

- **Tailwind CSS** loaded via CDN (`<script src="https://cdn.tailwindcss.com">`).
- Additional global styles in [index.css](../index.css) — font smoothing, safe-area padding.
- Animations use Tailwind's `animate-in` classes for fade/slide transitions.
- SVG icons are inline React components in [Icons.tsx](../components/Icons.tsx).
