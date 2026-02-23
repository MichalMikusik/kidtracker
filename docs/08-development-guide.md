# 8. Development Guide

## Prerequisites

- **Node.js** (v22+ recommended)
- **npm**
- A **Firebase project** with Authentication (Google provider) and Firestore enabled
- A **Gemini API key** (for AI insights)

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Firebase (client SDK — used by Vite, must be VITE_ prefixed)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Backend API (optional in dev — Vite proxies /api to localhost:3001)
# VITE_API_BASE_URL=https://your-cloud-run-url.run.app

# Server-side
GEMINI_API_KEY=your-gemini-api-key
PORT=3001
ALLOWED_ORIGIN=http://localhost:5173
GOOGLE_CLOUD_PROJECT=your-project-id
```

## Running Locally

```bash
# Install dependencies
npm install

# Start both client and server concurrently
npm run dev
```

This runs two processes:
- **Vite dev server** on `http://localhost:5173` (hot-reload React app)
- **Express API server** on `http://localhost:3001` (Gemini AI proxy)

Vite's dev-server proxy automatically forwards `/api/*` requests to the Express server.

### Individual Commands

```bash
npm run dev:client   # Vite only (port 5173)
npm run dev:server   # Express only (port 3001)
npm run build        # Production build (Vite)
npm run preview      # Preview production build
npm start            # Start server with tsx (production)
```

## Project Structure

```
kidtracker/
├── App.tsx                 # Root component — state management, routing, auth
├── index.tsx               # React entry point
├── index.html              # HTML shell with PWA meta tags
├── index.css               # Global styles (minimal — Tailwind via CDN)
├── types.ts                # All TypeScript interfaces
├── utils.ts                # Date formatting utilities
├── server.ts               # Express backend (Gemini proxy + auth)
├── Dockerfile              # API server container
├── vite.config.ts          # Vite configuration with proxy
├── firebase.json           # Firebase Hosting config
├── firestore.rules         # Firestore security rules
├── manifest.json           # PWA manifest
├── metadata.json           # App metadata (AI Studio)
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
│
├── components/
│   ├── CalendarView.tsx    # Monthly calendar with sick-day indicators
│   ├── HistoryView.tsx     # Reverse-chronological log list
│   ├── StatsView.tsx       # Statistics + family correlations
│   ├── LogSheet.tsx        # Bottom sheet for daily logging
│   ├── ProfileEditor.tsx   # Profile edit modal
│   ├── UserSettings.tsx    # User settings + backup/restore
│   ├── InstallPrompt.tsx   # PWA install banner
│   └── Icons.tsx           # Inline SVG icon components
│
├── services/
│   ├── firebase.ts         # Firebase init, auth, Firestore CRUD
│   ├── geminiService.ts    # AI insights API client
│   └── storageService.ts   # localStorage persistence + demo data
│
├── src/
│   └── types.ts            # Re-export of root types.ts
│
├── public/
│   └── icons/              # PWA icons (192px, 512px)
│
└── terraform/
    ├── main.tf             # Cloud Run, Artifact Registry, IAM
    ├── firebase.tf         # Firestore database
    ├── variables.tf        # Input variables
    └── outputs.tf          # Cloud Run URL, registry path
```

## Key Development Patterns

### Adding a New Symptom
Add the symptom name to the `COMMON_SYMPTOMS` array in [LogSheet.tsx](../components/LogSheet.tsx):

```typescript
const COMMON_SYMPTOMS = ['Fever', 'Cough', 'Runny Nose', ...];
```

Users can also add custom symptoms via the text input.

### Adding a New Profile Field
1. Add the field to the `Profile` interface in [types.ts](../types.ts).
2. Add the UI for editing it in [ProfileEditor.tsx](../components/ProfileEditor.tsx).
3. The field is automatically persisted (since the full `AppState` is saved).

### Testing Guest Mode
- Open the app without signing in, or sign out.
- Data is stored in `localStorage` under key `kidcare_tracker_v2`.
- Use the "Load Example Data" button (shown on empty calendar) to populate demo data.

### Inspecting State
- **localStorage**: Open browser DevTools → Application → Local Storage → look for `kidcare_tracker_v2`.
- **Firestore**: Firebase Console → Firestore → database: `kidcare` → `users/{uid}/data/trackerState`.

## Build & Deploy

```bash
# Build frontend
npm run build

# Deploy frontend to Firebase Hosting
firebase deploy --only hosting

# Build and push API container
docker build -t europe-west1-docker.pkg.dev/kidcare-17eba/kidtracker/api:latest .
docker push europe-west1-docker.pkg.dev/kidcare-17eba/kidtracker/api:latest

# Deploy infrastructure
cd terraform
terraform apply -var="image_tag=latest" -var="gemini_api_key=YOUR_KEY"
```
