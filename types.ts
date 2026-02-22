export interface Medication {
  name: string;
  dosage: string;
}

export interface TemperatureReading {
  time: string; // HH:MM
  value: number;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  symptoms?: string[];
  medications?: Medication[];
  notes?: string;
  temperatures?: TemperatureReading[];
}

export interface Profile {
  id: string;
  name: string;
  avatarColor: string;
  dateOfBirth?: string;
  profilePicture?: string; // Base64 encoded image
}

export interface AppState {
  profiles: Profile[];
  logs: Record<string, Record<string, DailyLog>>; // profileId -> date -> log
  currentProfileId: string;
}

export interface Stats {
  totalSickDays: number;
  episodesCount: number;
  averageDuration: number; // in days
  meanTimeBetweenIllness: number; // in days
  commonSymptoms: Record<string, number>;
}

export interface AccountProfile {
  status: 'pending' | 'approved';
  isPremium: boolean;
  email: string | null;
  temperatureUnit: 'C' | 'F';
  currency: 'USD' | 'EUR' | 'GBP';
}
