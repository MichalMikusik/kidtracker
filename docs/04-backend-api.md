# 4. Backend & API

## Overview

The backend is a lightweight **Express 5** server written in TypeScript, executed directly via `tsx` (no compile step). Its sole purpose is to proxy AI requests to the Gemini API while enforcing premium-account gating.

## Endpoints

### `GET /health`

Health check endpoint required by Cloud Run.

**Response**: `200 { "status": "ok" }`

### `POST /api/insights`

Generates AI-powered health insights for a child's sickness history.

**Request Body**:
```json
{
  "prompt": "You are a helpful family health assistant...",
  "token": "<Firebase ID token>"
}
```

**Flow**:

1. **Token Validation**: Verifies the Firebase ID token using Firebase Admin SDK.
2. **Premium Check**: Fetches the user's `AccountProfile` from Firestore via REST API using the user's token. Checks `isPremium === true`.
3. **AI Generation**: Sends the prompt to **Gemini 2.0 Flash** via the Google GenAI SDK.
4. **Response**: Returns `{ "text": "<AI generated analysis>" }`.

**Error Responses**:

| Status | Condition |
|---|---|
| 401 | Missing or invalid Firebase token |
| 403 | User is not a premium member |
| 500 | Missing `GEMINI_API_KEY` or Gemini API failure |

## Configuration

| Env Variable | Description | Default |
|---|---|---|
| `PORT` | Server listen port | `3001` (local) / `8080` (Cloud Run) |
| `ALLOWED_ORIGIN` | CORS allowed origin | `http://localhost:5173` |
| `GEMINI_API_KEY` | Google Gemini API key | (required) |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID | `kidcare-17eba` |

## Firebase Admin Initialization

The server initializes Firebase Admin using **Application Default Credentials (ADC)**:
- **Locally**: Requires `gcloud auth application-default login`.
- **Cloud Run**: The service account's ADC is used automatically.

## Client-Side Integration

The frontend's [geminiService.ts](../services/geminiService.ts) constructs the AI prompt from the current profile's sick logs and sends it to the backend:

```
Frontend (geminiService.ts)
    → POST /api/insights { prompt, token }
    → Backend verifies token + premium status
    → Backend calls Gemini API
    → Returns AI text to frontend
```

In development, Vite's dev-server proxy forwards `/api/*` requests to `localhost:3001`. In production, the `VITE_API_BASE_URL` environment variable points to the Cloud Run URL.

## Docker Container

The backend is containerised using a simple [Dockerfile](../Dockerfile):

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.ts tsconfig.json ./
ENV PORT=8080
CMD ["node_modules/.bin/tsx", "server.ts"]
```

Only the backend files (`server.ts`, `tsconfig.json`) are included — the frontend is deployed separately to Firebase Hosting.
