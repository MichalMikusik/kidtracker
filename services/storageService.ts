
import { AppState, Profile } from '../types';
import { toLocalISOString } from '../utils';

const STORAGE_KEY = 'kidcare_tracker_v2';

const DEFAULT_PROFILE: Profile = {
  id: 'p1',
  name: 'Alex',
  avatarColor: 'bg-blue-400',
};

const DEFAULT_STATE: AppState = {
  profiles: [DEFAULT_PROFILE],
  logs: {},
  currentProfileId: 'p1',
};

export { DEFAULT_STATE };

export const loadState = (): AppState => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return DEFAULT_STATE;
    const parsed = JSON.parse(serialized);
    
    // Validation: Ensure profiles exist
    if (!parsed.profiles || !Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
        console.warn("Corrupted state detected, resetting to default.");
        return DEFAULT_STATE;
    }

    return parsed as AppState;
  } catch (e) {
    console.error('Failed to load state', e);
    return DEFAULT_STATE;
  }
};

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state', e);
  }
};

// --- Backup & Restore Features ---

export const exportStateToJSON = (state: AppState): string => {
  return JSON.stringify(state, null, 2);
};

export const importStateFromJSON = (jsonString: string): AppState | null => {
  try {
    const parsed = JSON.parse(jsonString);
    // Basic validation
    if (!parsed.profiles || !parsed.logs) {
      throw new Error("Invalid backup file format");
    }
    return parsed as AppState;
  } catch (e) {
    console.error("Import failed", e);
    return null;
  }
};

// --- Demo Data Helper ---

export const generateDemoData = (): AppState => {
  const profiles: Profile[] = [
    { id: 'p1', name: 'Alex', avatarColor: 'bg-blue-400' },
    { id: 'p2', name: 'Sam', avatarColor: 'bg-green-400' },
    { id: 'p3', name: 'Dad', avatarColor: 'bg-slate-500' },
    { id: 'p4', name: 'Mom', avatarColor: 'bg-purple-500' },
  ];

  const logs: Record<string, Record<string, any>> = {};
  profiles.forEach(p => logs[p.id] = {});
  
  const today = new Date();
  
  const addEpisode = (pid: string, start: Date, duration: number, symptoms: string[]) => {
    for (let i = 0; i < duration; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateKey = toLocalISOString(d); // Use local date string
      
      logs[pid][dateKey] = {
        date: dateKey,
        symptoms: symptoms,
        medications: i < 3 ? [{ name: 'Ibuprofen', dosage: '5ml' }] : [],
        temperatures: i === 0 
          ? [{ time: '09:00', value: 38.5 }, { time: '14:00', value: 39.1 }] 
          : i === 1 ? [{ time: '10:00', value: 37.8 }] : [],
      };
    }
  };

  // Scenario 1: Transmission
  // Alex sick 14 days ago
  const d1 = new Date(today); d1.setDate(d1.getDate() - 14);
  addEpisode('p1', d1, 5, ['Fever', 'Cough']);

  // Sam sick 11 days ago (3 days after Alex started)
  const d2 = new Date(d1); d2.setDate(d2.getDate() + 3);
  addEpisode('p2', d2, 4, ['Runny Nose', 'Fever']);

  // Scenario 2: Mom recent
  const d3 = new Date(today); d3.setDate(d3.getDate() - 4);
  addEpisode('p4', d3, 3, ['Headache', 'Fatigue']);

  // Scenario 3: Alex separate episode 2 months ago
  const d4 = new Date(today); d4.setMonth(d4.getMonth() - 2);
  addEpisode('p1', d4, 3, ['Vomiting']);

  return {
    profiles,
    logs,
    currentProfileId: 'p1',
  };
};
