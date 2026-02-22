import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import * as admin from "firebase-admin";

// Initialize Firebase Admin using Application Default Credentials.
// In Cloud Run the service account's ADC is used automatically.
// Locally, run: gcloud auth application-default login
try {
  admin.initializeApp({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || "kidcare-17eba",
  });
} catch (e) {
  // Already initialized (e.g. hot-reload)
  console.log("Firebase Admin already initialized");
}

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));
app.use(express.json());

// Health check — required by Cloud Run
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// POST /api/insights  — Gemini AI, gated on isPremium
app.post("/api/insights", async (req, res) => {
  try {
    const { prompt, token } = req.body;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    // Fetch account profile via Firestore REST (user's own token — allowed by security rules)
    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || "kidcare-17eba";
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/kidcare/documents/users/${decodedToken.uid}/account/profile`;
      const profileRes = await fetch(firestoreUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!profileRes.ok) {
        return res.status(403).json({ error: "Forbidden: Could not fetch account profile" });
      }

      const profileData = await profileRes.json();
      const isPremium = profileData.fields?.isPremium?.booleanValue;

      if (isPremium !== true) {
        return res.status(403).json({ error: "Forbidden: Premium account required" });
      }
    } catch (e) {
      console.error("Firestore REST Error:", e);
      return res.status(500).json({ error: "Server Error: Could not verify account status" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server Error: GEMINI_API_KEY not configured" });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    return res.json({ text: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: "Failed to generate insights" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API server running on http://0.0.0.0:${PORT}`);
});

