import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import * as admin from "firebase-admin";

// Initialize Firebase Admin without credentials (only works for token verification and public data,
// but actually we need to read Firestore. Without credentials, we might get permission denied.
// Let's try to initialize it. If it fails, we'll fall back to just token verification).
try {
  admin.initializeApp({
    projectId: "kidcare-17eba",
  });
} catch (e) {
  console.log("Firebase Admin already initialized");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.post("/api/insights", async (req, res) => {
    try {
      const { prompt, token } = req.body;
      
      if (!token) {
        return res.status(401).json({ error: "Unauthorized: No token provided" });
      }

      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(token);
      } catch (e) {
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
      }

      // Check if user is premium in Firestore using REST API and their token
      try {
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/kidcare-17eba/databases/(default)/documents/users/${decodedToken.uid}/account/profile`;
        const profileRes = await fetch(firestoreUrl, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!profileRes.ok) {
          return res.status(403).json({ error: "Forbidden: Could not fetch account profile" });
        }

        const profileData = await profileRes.json();
        
        // Firestore REST API returns fields in a specific format: { fields: { status: { stringValue: "approved" }, isPremium: { booleanValue: true } } }
        const status = profileData.fields?.status?.stringValue;
        const isPremium = profileData.fields?.isPremium?.booleanValue;

        if (status !== 'approved' || isPremium !== true) {
          return res.status(403).json({ error: "Forbidden: Premium account required" });
        }
      } catch (e: any) {
        console.error("Firestore REST Error:", e);
        return res.status(500).json({ error: "Server Error: Could not verify account status" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "API Key missing" });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
