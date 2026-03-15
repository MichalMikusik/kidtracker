import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

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
    const { profileName, logs, token } = req.body;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    // Verify premium status via Admin SDK (bypasses security rules — authoritative read)
    try {
      const db = getFirestore(admin.app(), "kidcare");
      const profileDoc = await db.collection("users").doc(decodedToken.uid)
        .collection("account").doc("profile").get();

      if (!profileDoc.exists || profileDoc.data()?.isPremium !== true) {
        return res.status(403).json({ error: "Forbidden: Premium account required" });
      }
    } catch (e) {
      console.error("Admin Firestore Error:", e);
      return res.status(500).json({ error: "Server Error: Could not verify account status" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server Error: GEMINI_API_KEY not configured" });
    }

    // Construct prompt server-side from raw log data (never trust client-supplied prompts)
    const prompt = `
You are a helpful family health assistant.
Analyze the following sickness history for a child named ${String(profileName || 'Child').replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 50)}.

The data provided are days where symptoms or fever were recorded.

Data:
${JSON.stringify(Array.isArray(logs) ? logs.slice(0, 200) : [], null, 2)}

Please provide:
1. A brief summary of recent illnesses (look for consecutive days to identify episodes).
2. Any patterns noticed (e.g., frequency, common symptoms).
3. General wellness advice based on these patterns (disclaimer: not medical advice).

Keep the tone supportive, encouraging and concise. Return the response in plain text with nice formatting (bullet points).
`;

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

