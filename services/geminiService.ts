import { GoogleGenAI } from "@google/genai";
import { DailyLog, Profile } from "../types";

// Safely access process.env.API_KEY
const getApiKey = () => {
  try {
    // @ts-ignore
    return (typeof process !== 'undefined' && process.env?.API_KEY) || '';
  } catch {
    return '';
  }
};

export const getHealthInsights = async (profile: Profile, logs: DailyLog[]) => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.warn("API Key missing for Gemini");
    return "Please configure your API Key to get AI insights.";
  }

  const ai = new GoogleGenAI({ apiKey });

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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate insights at this time.";
  }
};