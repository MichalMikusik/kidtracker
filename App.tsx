import React, { useState, useEffect } from 'react';
import { AppState, DailyLog, Profile } from './types';
import { loadState, saveState, generateDemoData } from './services/storageService';
import { auth, loginWithGoogle, logout, subscribeToData, saveToFirebase } from './services/firebase';
import { User } from 'firebase/auth';
import CalendarView from './components/CalendarView';
import StatsView from './components/StatsView';
import HistoryView from './components/HistoryView';
import LogSheet from './components/LogSheet';
import ProfileEditor from './components/ProfileEditor';
import InstallPrompt from './components/InstallPrompt';
import { CalendarIcon, ChartBarIcon, SparklesIcon, PlusIcon, PencilIcon, ClockIcon } from './components/Icons';
import { getHealthInsights } from './services/geminiService';

enum Tab {
  CALENDAR = 'CALENDAR',
  HISTORY = 'HISTORY',
  STATS = 'STATS',
  AI = 'AI'
}

function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App Data State
  const [state, setState] = useState<AppState | null>(null);
  
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CALENDAR);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  
  // AI State
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  // 1. Handle Authentication & Data Sync
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // STRATEGY: Offline First.
        // 1. Load local data immediately so the user sees the app INSTANTLY.
        const localData = loadState();
        setState(localData);

        // 2. Subscribe to Firebase in the background.
        subscribeToData(
            currentUser, 
            (cloudData) => {
                if (cloudData) {
                    // Cloud has data, update state
                    setState(cloudData);
                    // Update local storage to match cloud
                    saveState(cloudData);
                } else {
                    // Cloud is empty (New User). 
                    // Save our local default state to cloud to initialize it.
                    saveToFirebase(currentUser, localData);
                }
            },
            (error) => {
                console.error("Sync error:", error);
                // On error, we just keep using the localData we already loaded
            }
        );
      } else {
        // User logged out: Reset state
        setState(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Helper to save state (updates local state immediately, then pushes to Firebase)
  const updateState = (newState: AppState) => {
      setState(newState);
      saveState(newState); // Local backup
      if (user) {
          saveToFirebase(user, newState); // Cloud sync
      }
  };

  // --- Views ---

  if (authLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
      );
  }

  if (!user) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
              <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm space-y-6">
                  <div className="w-20 h-20 bg-indigo-100 rounded-full mx-auto flex items-center justify-center text-4xl mb-4">
                      👶
                  </div>
                  <div>
                      <h1 className="text-3xl font-black text-slate-800 mb-2">KidCare</h1>
                      <p className="text-slate-500">Track sickness duration and symptoms simply.</p>
                  </div>
                  
                  <div className="pt-4 space-y-3">
                    <button 
                        onClick={loginWithGoogle}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-indigo-200"
                    >
                        <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Sign in with Google
                    </button>
                    <p className="text-xs text-slate-400">
                        Please configure your Firebase keys if login fails.
                    </p>
                  </div>
              </div>
          </div>
      );
  }

  // --- Main App ---

  // Safety fallback if state is completely missing (rare due to loadState)
  if (!state) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      );
  }

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
     if(state.profiles.length >= 6) {
         alert("Max profiles reached.");
         return;
     }
     const newId = `p${state.profiles.length + 1}`;
     const newProfile: Profile = {
         id: newId,
         name: `Child ${state.profiles.length + 1}`,
         avatarColor: ['bg-blue-400', 'bg-pink-400', 'bg-green-400', 'bg-yellow-400', 'bg-purple-400', 'bg-orange-400'][state.profiles.length]
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

  const handleFetchInsights = async () => {
      setLoadingAi(true);
      const logs = Object.values(currentLogs) as DailyLog[];
      const text = await getHealthInsights(currentProfile, logs);
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
             <div className="flex items-center gap-2" onClick={() => setShowProfileEditor(true)}>
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
                        className={`h-10 w-10 rounded-full border-2 border-white ${p.avatarColor} flex items-center justify-center text-white font-bold text-xs relative ${state.currentProfileId === p.id ? 'ring-2 ring-indigo-500 ring-offset-2 z-10' : 'opacity-70 hover:opacity-100 transition-opacity'}`}
                      >
                          {p.name[0]}
                      </button>
                  ))}
                  <button onClick={handleAddProfile} className="h-8 w-8 ml-3 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200">
                      <PlusIcon className="w-5 h-5" />
                  </button>
               </div>
               
               <button onClick={logout} className="text-xs font-bold text-slate-400 hover:text-slate-600">
                   Log Out
               </button>
           </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto p-4 md:p-6 space-y-6">
        
        {/* Helper for empty state */}
        {Object.keys(currentLogs).length === 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                <p className="text-indigo-800 text-sm mb-2">Welcome! Tap a date to track sickness.</p>
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
                        <span className="text-xs text-slate-600 font-bold">Start</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-400 shadow-sm shadow-orange-200" />
                        <span className="text-xs text-slate-600 font-bold">Sick</span>
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
          />
      )}

    </div>
  );
}

export default App;