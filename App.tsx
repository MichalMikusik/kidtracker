import React, { useState, useEffect } from 'react';
import { AppState, DailyLog, Profile, AccountProfile } from './types';
import { loadState, saveState, generateDemoData } from './services/storageService';
import { auth, loginWithGoogle, logout, subscribeToData, saveToFirebase, getUserAccountProfile } from './services/firebase';
import { User } from 'firebase/auth';
import CalendarView from './components/CalendarView';
import StatsView from './components/StatsView';
import HistoryView from './components/HistoryView';
import LogSheet from './components/LogSheet';
import ProfileEditor from './components/ProfileEditor';
import UserSettings from './components/UserSettings';
import InstallPrompt from './components/InstallPrompt';
import { CalendarIcon, ChartBarIcon, SparklesIcon, PlusIcon, PencilIcon, ClockIcon, CloudIcon } from './components/Icons';

enum Tab {
  CALENDAR = 'CALENDAR',
  HISTORY = 'HISTORY',
  STATS = 'STATS',
  AI = 'AI'
}

function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  
  // App Data State - Initialize with local storage immediately for Guest Mode
  const [state, setState] = useState<AppState>(() => loadState());
  
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CALENDAR);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  
  // AI State
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  // 1. Handle Authentication & Data Sync
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const accProfile = await getUserAccountProfile(currentUser);
        setAccountProfile(accProfile);
      } else {
        setAccountProfile(null);
      }
      
      if (currentUser) {
        // User just logged in. 
        // 1. We have local data (state).
        // 2. We subscribe to cloud.
        // 3. Logic: If cloud is empty, upload local. If cloud has data, overwrite local (Sync Down).
        
        subscribeToData(
            currentUser, 
            (cloudData) => {
                if (cloudData) {
                    // Cloud has data, sync down
                    setState(cloudData);
                    saveState(cloudData);
                } else {
                    // Cloud is empty (New User or fresh login), upload current local guest data
                    // We use the 'state' from closure, but better to use current loadState() to be safe
                    const currentLocal = loadState();
                    saveToFirebase(currentUser, currentLocal);
                }
            },
            (error) => {
                console.error("Sync error:", error);
            }
        );
      } 
      // Note: If logged out (Guest), we simply rely on the useState initialization 
      // and updateState calls which write to localStorage.
    });
    return () => unsubscribe();
  }, []);

  // Helper to save state (updates local state immediately, then pushes to Firebase if logged in)
  const updateState = (newState: AppState) => {
      setState(newState);
      saveState(newState); // Local persistence (Cookie/LocalStorage)
      if (user) {
          saveToFirebase(user, newState); // Cloud sync
      }
  };

  const handleLogin = async () => {
      try {
          await loginWithGoogle();
      } catch (e: any) {
          if (e?.code !== 'auth/popup-closed-by-user') {
            alert("Could not sign in.");
          }
      }
  }

  // --- Main App Logic ---

  // Safety fallback if state is completely missing or corrupted
  if (!state || !state.profiles || state.profiles.length === 0) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <button 
                onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="text-xs text-slate-500 underline"
            >
                Reset App Data
            </button>
        </div>
      );
  }

  // Safe Access to Current Profile
  const currentProfile = state.profiles.find(p => p.id === state.currentProfileId) || state.profiles[0];
  
  const currentLogs = state.logs[currentProfile.id] || ({} as Record<string, DailyLog>);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setShowLogSheet(true);
  };

  const handleSaveLog = (log: DailyLog) => {
    updateState({
      ...state,
      logs: {
        ...state.logs,
        [currentProfile.id]: {
          ...state.logs[currentProfile.id],
          [log.date]: log
        }
      }
    });
  };

  const handleDeleteLog = (date: string) => {
      const newLogs = { ...state.logs[currentProfile.id] };
      delete newLogs[date];
      
      updateState({
          ...state,
          logs: {
              ...state.logs,
              [currentProfile.id]: newLogs
          }
      });
      setShowLogSheet(false);
  }

  const handleGenerateData = () => {
    const data = generateDemoData();
    updateState(data);
    alert("Demo data loaded.");
  };

  const handleAddProfile = () => {
    const isPremium = accountProfile?.isPremium === true;
    const limit = user ? (isPremium ? Infinity : 4) : 2;

     if(state.profiles.length >= limit) {
         alert(`Max profiles reached. ${user ? (isPremium ? '' : 'Upgrade to premium for unlimited profiles.') : 'Sign in to add more profiles.'}`);
         return;
     }
     const newId = `p${Date.now()}`;
     const newProfile: Profile = {
         id: newId,
         name: `Child ${state.profiles.length + 1}`,
         avatarColor: ['bg-blue-400', 'bg-pink-400', 'bg-green-400', 'bg-yellow-400', 'bg-purple-400', 'bg-orange-400'][state.profiles.length % 6]
     };
     updateState({
         ...state,
         profiles: [...state.profiles, newProfile],
         currentProfileId: newId,
         logs: { ...state.logs, [newId]: {} }
     });
  }

  const handleUpdateProfile = (updated: Profile) => {
      updateState({
          ...state,
          profiles: state.profiles.map(p => p.id === updated.id ? updated : p)
      });
  }

  const handleDeleteProfile = (profileId: string) => {
    console.log("App: handleDeleteProfile called for profileId:", profileId);
    if (state.profiles.length <= 1) {
      alert("You cannot delete the last profile.");
      return;
    }

    if (window.confirm(`Are you sure you want to delete this profile? This cannot be undone.`)) {
      const newProfiles = state.profiles.filter(p => p.id !== profileId);
      const newLogs = { ...state.logs };
      delete newLogs[profileId];

      setShowProfileEditor(false);

      updateState({
        ...state,
        profiles: newProfiles,
        logs: newLogs,
        currentProfileId: newProfiles[0].id // Switch to the first available profile
      });
    }
  }

  const handleUpdateSettings = (settings: Partial<AccountProfile>) => {
    if (accountProfile) {
      setAccountProfile({ ...accountProfile, ...settings });
      // In a real app, you'd save this to Firestore here
    }
  };

  const handleSync = async () => {
      if (user) {
          try {
            await saveToFirebase(user, state);
            alert("Sync complete! Your data is saved to the cloud.");
          } catch (error) {
            console.error("Sync failed:", error);
            alert("Sync failed. Please check your connection and try again.");
          }
      } else {
        alert("You must be logged in to sync data.");
      }
  };

  const handleFetchInsights = async () => {
      setLoadingAi(true);
      const logs = Object.values(currentLogs) as DailyLog[];
      const token = await user?.getIdToken();
      const text = await getHealthInsights(currentProfile, logs, token);
      setAiInsight(text);
      setLoadingAi(false);
  }

  // Effect to clear insight when profile changes
  useEffect(() => {
      setAiInsight('');
  }, [state.currentProfileId]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-0 font-sans">
      
      {/* Top Bar */}
      <div className="bg-white px-6 pt-12 pb-4 shadow-sm sticky top-0 z-30">
        <div className="flex justify-between items-center max-w-lg mx-auto">
           <div>
             <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                KidCare
             </h1>
             <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowProfileEditor(true)}>
                <p className="text-sm text-slate-500 font-bold">{currentProfile.name}</p>
                <PencilIcon className="w-3 h-3 text-slate-400" />
             </div>
           </div>
           
           {/* Profile Switcher & Settings */}
           <div className="flex items-center gap-3">
               <div className="flex -space-x-2 overflow-hidden items-center">
                  {state.profiles.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => updateState({ ...state, currentProfileId: p.id })}
                        className={`h-10 w-10 rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-xs relative ${currentProfile.id === p.id ? 'ring-2 ring-indigo-500 ring-offset-2 z-10' : 'opacity-70 hover:opacity-100 transition-opacity'} ${p.profilePicture ? '' : p.avatarColor}`}
                        style={p.profilePicture ? { backgroundImage: `url(${p.profilePicture})`, backgroundSize: 'cover' } : {}}
                      >
                        {!p.profilePicture && p.name[0]}
                      </button>
                  ))}
                  <button onClick={handleAddProfile} className="h-8 w-8 ml-3 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200">
                      <PlusIcon className="w-5 h-5" />
                  </button>
               </div>
               
               {user ? (
                   <button 
                        onClick={() => setShowUserSettings(true)} 
                        className="h-8 w-8 ml-2 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200"
                        title="User Settings"
                   >
                       <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                           {user.email?.charAt(0).toUpperCase()}
                       </div>
                   </button>
               ) : (
                   <button 
                        onClick={handleLogin} 
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition-colors ml-2 shadow-sm shadow-indigo-200"
                   >
                       <span className="text-xs font-bold">Log In</span>
                   </button>
               )}
           </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto p-4 md:p-6 space-y-6">
        
        {/* Helper for empty state - Only show if no logs AND on calendar tab */}
        {Object.keys(currentLogs).length === 0 && activeTab === Tab.CALENDAR && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                <p className="text-indigo-800 text-sm mb-2">Welcome! Tap a date to track sickness.</p>
                {!user && <p className="text-slate-500 text-xs mb-3">You are using Guest Mode. Sign in above to backup data.</p>}
                <button onClick={handleGenerateData} className="text-xs font-bold bg-indigo-200 text-indigo-800 px-3 py-1.5 rounded-full hover:bg-indigo-300">
                    Load Example Data
                </button>
            </div>
        )}

        {activeTab === Tab.CALENDAR && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CalendarView 
                logs={currentLogs} 
                onDateSelect={handleDateSelect} 
                selectedDate={selectedDate}
            />
            <div className="mt-6 flex justify-center">
                <div className="bg-white rounded-full px-4 py-2 shadow-sm border border-slate-100 flex gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-200" />
                        <span className="text-xs text-slate-600 font-bold">First Day</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-400 shadow-sm shadow-orange-200" />
                        <span className="text-xs text-slate-600 font-bold">Sick Day</span>
                    </div>
                </div>
            </div>
          </div>
        )}

        {activeTab === Tab.HISTORY && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <HistoryView logs={currentLogs} onEditDate={handleDateSelect} />
            </div>
        )}

        {activeTab === Tab.STATS && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <StatsView 
                currentProfileId={currentProfile.id}
                profiles={state.profiles}
                allLogs={state.logs}
             />
          </div>
        )}

        {activeTab === Tab.AI && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
                     <div className="flex items-start justify-between">
                        <div>
                             <h2 className="text-2xl font-bold mb-1">Dr. AI Insights</h2>
                             <p className="text-indigo-200 text-sm">Analysis based on {currentProfile.name}'s logs.</p>
                        </div>
                        <SparklesIcon className="w-8 h-8 text-yellow-300" />
                     </div>
                     
                     <div className="mt-6 bg-white/10 backdrop-blur-md rounded-xl p-4 min-h-[150px]">
                         {loadingAi ? (
                             <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
                                 <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                 <p className="text-sm text-indigo-100">Analyzing patterns...</p>
                             </div>
                         ) : aiInsight ? (
                             <div className="prose prose-invert prose-sm">
                                 <div className="whitespace-pre-wrap leading-relaxed">{aiInsight}</div>
                             </div>
                         ) : (
                             <div className="flex flex-col items-center justify-center h-full py-6">
                                 <p className="text-indigo-200 text-center mb-4 text-sm">
                                     Get a summary of recent illnesses, frequency analysis, and general wellness patterns.
                                 </p>
                                 <button 
                                    onClick={handleFetchInsights}
                                    className="bg-white text-indigo-600 font-bold px-6 py-2 rounded-full shadow-lg hover:bg-indigo-50 transition-colors"
                                 >
                                     Generate Report
                                 </button>
                             </div>
                         )}
                     </div>
                     <p className="text-[10px] text-indigo-300 mt-4 text-center opacity-70">
                         AI generated content. Not medical advice. Always consult a doctor.
                     </p>
                 </div>
             </div>
        )}

      </div>

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 pb-safe pt-2 md:hidden">
         <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
            <button 
                onClick={() => setActiveTab(Tab.CALENDAR)}
                className={`flex flex-col items-center gap-1 w-16 ${activeTab === Tab.CALENDAR ? 'text-indigo-600' : 'text-slate-400'}`}
            >
                <CalendarIcon className="w-6 h-6" />
                <span className="text-[10px] font-bold">Calendar</span>
            </button>
            <button 
                onClick={() => setActiveTab(Tab.HISTORY)}
                className={`flex flex-col items-center gap-1 w-16 ${activeTab === Tab.HISTORY ? 'text-indigo-600' : 'text-slate-400'}`}
            >
                <ClockIcon className="w-6 h-6" />
                <span className="text-[10px] font-bold">History</span>
            </button>
            <button 
                onClick={() => setActiveTab(Tab.STATS)}
                className={`flex flex-col items-center gap-1 w-16 ${activeTab === Tab.STATS ? 'text-indigo-600' : 'text-slate-400'}`}
            >
                <ChartBarIcon className="w-6 h-6" />
                <span className="text-[10px] font-bold">Stats</span>
            </button>
            <button 
                onClick={() => setActiveTab(Tab.AI)}
                className={`flex flex-col items-center gap-1 w-16 ${activeTab === Tab.AI ? 'text-indigo-600' : 'text-slate-400'}`}
            >
                <SparklesIcon className="w-6 h-6" />
                <span className="text-[10px] font-bold">AI Helper</span>
            </button>
         </div>
      </div>

      {/* Desktop/Tablet Nav (Floating) */}
      <div className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-xl border border-slate-100 p-2 gap-2 z-40">
            {[
                { id: Tab.CALENDAR, icon: CalendarIcon, label: 'Calendar' },
                { id: Tab.HISTORY, icon: ClockIcon, label: 'History' },
                { id: Tab.STATS, icon: ChartBarIcon, label: 'Stats' },
                { id: Tab.AI, icon: SparklesIcon, label: 'Insights' }
            ].map(item => (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`px-6 py-2 rounded-full flex items-center gap-2 font-bold text-sm transition-all
                        ${activeTab === item.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}
                    `}
                >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                </button>
            ))}
      </div>

      {/* Log Sheet Modal */}
      {showLogSheet && selectedDate && (
          <LogSheet 
            date={selectedDate}
            existingLog={currentLogs[selectedDate]}
            onSave={handleSaveLog}
            onClose={() => setShowLogSheet(false)}
            onDelete={handleDeleteLog}
          />
      )}

      {/* Profile Editor Modal */}
      {showProfileEditor && (
          <ProfileEditor 
            profile={currentProfile}
            onSave={handleUpdateProfile}
            onClose={() => setShowProfileEditor(false)}
            onDelete={handleDeleteProfile}
          />
      )}

      {showUserSettings && (
        <UserSettings 
            accountProfile={accountProfile}
            onClose={() => setShowUserSettings(false)}
            onUpdateSettings={handleUpdateSettings}
            onSync={handleSync}
        />
      )}

    </div>
  );
}

export default App;