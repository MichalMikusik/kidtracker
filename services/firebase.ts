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
import { AppState } from "../types";

// --- CONFIGURATION START ---
const firebaseConfig = {
  apiKey: "AIzaSyBFPcFwprFO5Zzc9RAP_9emzQc6B9YvNtY",
  authDomain: "kidcare-17eba.firebaseapp.com",
  projectId: "kidcare-17eba",
  storageBucket: "kidcare-17eba.appspot.com",
  messagingSenderId: "394493467840",
  appId: "1:394493467840:web:b6168bc40343d397c12125",
  measurementId: "G-V53NX3V0FS"
};
// --- CONFIGURATION END ---

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

const GOOGLE_PROVIDER = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    await signInWithPopup(auth, GOOGLE_PROVIDER);
  } catch (error) {
    console.error("Login failed", error);
    alert("Login failed. Please try again.");
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

export const saveToFirebase = async (user: User, state: AppState) => {
  if (!user) return;
  const docRef = doc(db, "users", user.uid, "data", "trackerState");
  try {
    // Merge true allows us to update partial fields if we wanted, 
    // but here we sync the whole state to ensure consistency.
    await setDoc(docRef, state, { merge: true });
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