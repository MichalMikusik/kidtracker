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

  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    const response = await fetch(`${apiBase}/api/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ profileName: profile.name, logs: sickLogs, token })
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