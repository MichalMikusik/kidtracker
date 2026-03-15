/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User,
  signOut
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  getDoc 
} from "firebase/firestore";
import { AppState, AccountProfile } from "../types";

// --- CONFIGURATION START ---
// Values are read from .env.local (development) or the build-time env (CI/CD)
// See .env.example for required variable names
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};
// --- CONFIGURATION END ---

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app, "kidcare");

const GOOGLE_PROVIDER = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    await signInWithPopup(auth, GOOGLE_PROVIDER);
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      console.log("Login canceled by user");
      return; // Exit gracefully
    }
    
    console.error("Login failed", error);
    if (error.code === 'auth/unauthorized-domain') {
      alert("Login failed: This domain is not authorized. Please add it to your Firebase Console > Authentication > Settings > Authorized Domains.");
    } else if (error.code === 'auth/api-key-not-valid') {
      alert("Login failed: The Firebase API key is invalid. Please check your configuration.");
    } else if (error.message.includes("The requested action is invalid")) {
       alert("Login failed: The Firebase project configuration appears to be invalid or the project has been deleted. Please update services/firebase.ts with your own valid Firebase configuration.");
    } else {
      // Re-throw other errors to be handled by the caller (e.g. popup closed)
      throw error;
    }
  }
};

export const logout = async () => {
  await signOut(auth);
};

// --- Database Operations ---

// We store the entire AppState in one document per user for simplicity
// Path: users/{uid}/data/trackerState

export const subscribeToData = (
  user: User, 
  onData: (data: AppState | null) => void,
  onError: (error: any) => void
) => {
  const docRef = doc(db, "users", user.uid, "data", "trackerState");
  
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      onData(snapshot.data() as AppState);
    } else {
      onData(null); // Document doesn't exist yet
    }
  }, onError);
};

// Recursively strip undefined values (Firestore rejects undefined)
const stripUndefined = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)])
    );
  }
  return obj;
};

export const saveToFirebase = async (user: User, state: AppState) => {
  if (!user) return;
  const docRef = doc(db, "users", user.uid, "data", "trackerState");
  try {
    await setDoc(docRef, stripUndefined(state));
  } catch (e) {
    console.error("Error saving to Firebase", e);
  }
};

export const migrateLocalToFirebase = async (user: User, localState: AppState) => {
  const docRef = doc(db, "users", user.uid, "data", "trackerState");
  const snap = await getDoc(docRef);
  
  // Only migrate if remote is empty
  if (!snap.exists()) {
    console.log("Migrating local data to Firebase...");
    await setDoc(docRef, localState);
    return true;
  }
  return false;
};

export const getUserAccountProfile = async (user: User): Promise<AccountProfile> => {
  const docRef = doc(db, "users", user.uid, "account", "profile");
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    return snap.data() as AccountProfile;
  } else {
    const newProfile: AccountProfile = {
      status: 'pending',
      isPremium: false,
      email: user.email,
      temperatureUnit: 'C',
      currency: 'EUR',
    };
    await setDoc(docRef, newProfile);
    return newProfile;
  }
};
export const saveUserAccountProfile = async (user: User, profile: AccountProfile): Promise<void> => {
  const docRef = doc(db, "users", user.uid, "account", "profile");
  try {
    await setDoc(docRef, profile, { merge: true });
  } catch (e) {
    console.error("Error saving account profile", e);
  }
};
