import { GoogleGenAI } from "@google/genai";
import { DailyLog, Profile } from "../types";

export const getHealthInsights = async (profile: Profile, logs: DailyLog[], token: string | undefined) => {
  // Filter for days with symptoms or high temperatures
  const sickLogs = logs.filter(l => 
    (l.symptoms && l.symptoms.length > 0) || 
    (l.temperatures && l.temperatures.length > 0)
  ).sort((a, b) => a.date.localeCompare(b.date));
  
  if (sickLogs.length === 0) {
    return "No significant sickness records found recently. Great job keeping healthy!";
  }

  const prompt = `
    You are a helpful family health assistant. 
    Analyze the following sickness history for a child named ${profile.name}.
    
    The data provided are days where symptoms or fever were recorded.
    
    Data:
    ${JSON.stringify(sickLogs, null, 2)}

    Please provide:
    1. A brief summary of recent illnesses (look for consecutive days to identify episodes).
    2. Any patterns noticed (e.g., frequency, common symptoms).
    3. General wellness advice based on these patterns (disclaimer: not medical advice).
    
    Keep the tone supportive, encouraging and concise. Return the response in plain text with nice formatting (bullet points).
  `;

  try {
    // In dev, Vite proxies /api to localhost:3001.
    // In production, VITE_API_BASE_URL is set to the Cloud Run URL.
    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    const response = await fetch(`${apiBase}/api/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, token })
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch insights');
    }
    
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("API Error:", error);
    return "Unable to generate insights at this time.";
  }
};