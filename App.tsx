
import React, { useState, useEffect } from 'react';
import { AppState, DailyLog, Profile } from './types';
import { loadState, saveState, generateDemoData } from './services/storageService';
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
  const [state, setState] = useState<AppState>(loadState);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CALENDAR);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  
  // AI State
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const currentProfile = state.profiles.find(p => p.id === state.currentProfileId) || state.profiles[0];
  const currentLogs = state.logs[currentProfile.id] || ({} as Record<string, DailyLog>);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setShowLogSheet(true);
  };

  const handleSaveLog = (log: DailyLog) => {
    setState(prev => ({
      ...prev,
      logs: {
        ...prev.logs,
        [currentProfile.id]: {
          ...prev.logs[currentProfile.id],
          [log.date]: log
        }
      }
    }));
  };

  const handleDeleteLog = (date: string) => {
      setState(prev => {
          const newLogs = { ...prev.logs[currentProfile.id] };
          delete newLogs[date];
          return {
              ...prev,
              logs: {
                  ...prev.logs,
                  [currentProfile.id]: newLogs
              }
          }
      });
      setShowLogSheet(false);
  }

  const handleGenerateData = () => {
    const data = generateDemoData();
    setState(data);
    alert("Demo data loaded! Check the calendar and stats for correlations.");
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
     setState(prev => ({
         ...prev,
         profiles: [...prev.profiles, newProfile],
         currentProfileId: newId,
         logs: { ...prev.logs, [newId]: {} }
     }));
  }

  const handleUpdateProfile = (updated: Profile) => {
      setState(prev => ({
          ...prev,
          profiles: prev.profiles.map(p => p.id === updated.id ? updated : p)
      }));
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
             <h1 className="text-2xl font-black text-slate-800 tracking-tight">KidCare</h1>
             <div className="flex items-center gap-2" onClick={() => setShowProfileEditor(true)}>
                <p className="text-sm text-slate-500 font-bold">{currentProfile.name}</p>
                <PencilIcon className="w-3 h-3 text-slate-400" />
             </div>
           </div>
           
           {/* Profile Switcher */}
           <div className="flex -space-x-2 overflow-hidden items-center">
              {state.profiles.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => setState(s => ({ ...s, currentProfileId: p.id }))}
                    className={`h-10 w-10 rounded-full border-2 border-white ${p.avatarColor} flex items-center justify-center text-white font-bold text-xs relative ${state.currentProfileId === p.id ? 'ring-2 ring-indigo-500 ring-offset-2 z-10' : 'opacity-70 hover:opacity-100 transition-opacity'}`}
                  >
                      {p.name[0]}
                  </button>
              ))}
              <button onClick={handleAddProfile} className="h-8 w-8 ml-3 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200">
                  <PlusIcon className="w-5 h-5" />
              </button>
           </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto p-4 md:p-6 space-y-6">
        
        {/* Helper for empty state */}
        {Object.keys(currentLogs).length === 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                <p className="text-indigo-800 text-sm mb-2">Start by tapping a date on the calendar, or load example data.</p>
                <button onClick={handleGenerateData} className="text-xs font-bold bg-indigo-200 text-indigo-800 px-3 py-1.5 rounded-full hover:bg-indigo-300">
                    Load Demo Data
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
            <div className="mt-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Legend</h3>
                <div className="flex gap-4 px-1">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-xs text-slate-600 font-medium">Started</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-400" />
                        <span className="text-xs text-slate-600 font-medium">Ongoing</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-white border border-slate-300" />
                        <span className="text-xs text-slate-600 font-medium">Healthy</span>
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
