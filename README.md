# KidCare Tracker

A mobile-first PWA for parents to track their child's health — symptoms, temperature, medications, and AI-powered insights.

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS 4, TypeScript 5.9 |
| Backend | Express 5 on Cloud Run (Node 22) |
| Auth | Firebase Authentication (Google sign-in) |
| Database | Firestore (named database `kidcare`) |
| AI | Gemini 2.0 Flash (server-side, premium only) |
| Hosting | Firebase Hosting |
| Registry | Artifact Registry (auto-cleanup: 7 days) |
| IaC | Terraform with GCS backend |
| CI/CD | GitHub Actions with Workload Identity Federation |

## Local Development

**Prerequisites:** Node.js 22+

1. Install dependencies:
   ```
   npm install
   ```
2. Create `.env.local` with:
   ```
   GEMINI_API_KEY=your-key
   PORT=3001
   GOOGLE_CLOUD_PROJECT=kidcare-17eba
   ```
3. Run (starts both API server and Vite dev server):
   ```
   npm run dev
   ```


## Project Structure

```
├── App.tsx                 # Main app component (auth, state, routing)
├── server.ts               # Express API (Gemini AI insights)
├── index.html              # Entry HTML with PWA config
├── index.css               # Tailwind CSS entry
├── components/             # React UI components
│   ├── CalendarView.tsx    # Monthly calendar view
│   ├── HistoryView.tsx     # Timeline of past logs
│   ├── LogSheet.tsx        # Daily symptom/temp/med logging
│   ├── ProfileEditor.tsx   # Child profile editor
│   ├── StatsView.tsx       # Health statistics
│   └── UserSettings.tsx    # App settings
├── services/
│   ├── firebase.ts         # Firebase client (auth, Firestore CRUD)
│   ├── geminiService.ts    # AI insights client
│   └── storageService.ts   # localStorage persistence
├── terraform/
│   ├── main.tf             # Cloud Run, APIs, service account
│   ├── registry.tf         # Artifact Registry + cleanup policies
│   ├── iam.tf              # IAM roles for GitHub Actions SA
│   ├── variables.tf        # Input variables
│   └── outputs.tf          # Terraform outputs
├── .github/workflows/
│   ├── infra.yml           # Infrastructure (Terraform + Firestore rules)
│   └── deploy.yml          # App deploy (Docker + Cloud Run + Hosting)
├── public/sw.js            # Service worker (network-first)
├── manifest.json           # PWA manifest
├── firebase.json           # Hosting config + security headers
├── firestore.rules         # Firestore security rules
└── Dockerfile              # Multi-stage build (node:22-alpine)
```

## CI/CD

Two separate workflows:

- **Infrastructure** (`infra.yml`) — Triggered by changes to `terraform/`, `firestore.rules`, or `firebase.json`. Runs Terraform init → refresh → plan → apply, then deploys Firestore rules via REST API.
- **App Deploy** (`deploy.yml`) — Triggered by code changes. Builds Docker image → pushes to Artifact Registry → deploys to Cloud Run → builds frontend → deploys to Firebase Hosting.

Both use Workload Identity Federation (no service account keys).
