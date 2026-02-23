# 1. Overview

## What is KidCare Tracker?

KidCare Tracker is a **mobile-first Progressive Web App (PWA)** designed for parents to track their children's illnesses. It provides a visual calendar to log sick days, record symptoms, medications, and body temperatures, and then surfaces statistics, family transmission patterns, and AI-powered health insights.

## Key Features

| Feature | Description |
|---|---|
| **Calendar View** | Interactive monthly calendar highlighting sick days (red = first day, orange = ongoing) |
| **Daily Log Sheet** | Bottom-sheet modal to record symptoms, temperatures, medications, and notes for any date |
| **History View** | Reverse-chronological list of all logged days with quick-edit access |
| **Statistics** | Episode count, total sick days, average duration, mean time between illnesses, most common symptom, and **family transmission correlation** ("likely passed to…" / "likely caught from…") |
| **AI Insights (Premium)** | Gemini 2.0 Flash–powered analysis of sickness patterns with wellness advice (gated behind premium accounts) |
| **Multi-Profile** | Track multiple children (or family members) with profile switching, avatar colors, and optional profile pictures |
| **Guest Mode** | Full functionality without sign-in; data stored in `localStorage` |
| **Cloud Sync** | Google sign-in enables real-time Firestore sync across devices |
| **PWA / Installable** | Add-to-home-screen prompt, standalone display, offline-capable shell |
| **Backup / Restore** | Export data to JSON file and import it back |

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      User's Browser                       │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  React SPA (Vite + Tailwind CSS)                    │  │
│  │  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ │  │
│  │  │ Calendar  │ │ History  │ │  Stats   │ │  AI   │ │  │
│  │  │   View    │ │   View   │ │   View   │ │ View  │ │  │
│  │  └───────────┘ └──────────┘ └──────────┘ └───────┘ │  │
│  │         │              │            │         │     │  │
│  │         └──────────────┴────────────┴─────────┘     │  │
│  │                        │                            │  │
│  │               App.tsx (State Hub)                    │  │
│  │              ┌─────────┴─────────┐                  │  │
│  │      localStorage          Firebase SDK             │  │
│  └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     Firebase Auth    Firestore DB     Cloud Run API
     (Google SSO)     (Real-time)      (Express + Gemini)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS (CDN), Vite 6 |
| Backend API | Express 5, TypeScript (tsx runtime), Google Gemini AI SDK |
| Auth | Firebase Authentication (Google provider) |
| Database | Cloud Firestore (named database: `kidcare`) |
| Hosting | Firebase Hosting (static SPA) |
| API Hosting | Google Cloud Run (containerised Express server) |
| Container Registry | Google Artifact Registry |
| Infrastructure-as-Code | Terraform (GCP provider) |
| CI/CD | GitHub Actions (implied by Terraform IAM for `github-actions-sa`) |
