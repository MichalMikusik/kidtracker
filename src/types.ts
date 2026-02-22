export interface AppState {
  profiles: Profile[];
  currentProfileId: string;
  logs: Record<string, Record<string, DailyLog>>;
}

export interface Profile {
  id: string;
  name: string;
  avatarColor: string;
  dateOfBirth?: string;
  profilePicture?: string;
}

export interface DailyLog {
  date: string;
  symptoms: string[];
  medications: Medication[];
  temperatures: TemperatureReading[];
  notes: string;
}

export interface Medication {
  name: string;
  dosage: string;
}

export interface TemperatureReading {
  time: string;
  value: number;
}

export interface AccountProfile {
  email: string;
  isPremium: boolean;
  temperatureUnit: 'C' | 'F';
  currency: 'USD' | 'EUR' | 'GBP';
}
