import React, { useState, useRef } from 'react';
import { AccountProfile } from '../types';
import { XMarkIcon } from './Icons';
import { auth, logout } from '../services/firebase';
import { exportStateToJSON, importStateFromJSON, loadState, saveState } from '../services/storageService';

interface UserSettingsProps {
  accountProfile: AccountProfile | null;
  onClose: () => void;
  onUpdateSettings: (settings: Partial<AccountProfile>) => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({ accountProfile, onClose, onUpdateSettings }) => {
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>(accountProfile?.temperatureUnit || 'C');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = () => {
    const currentState = loadState();
    const jsonString = exportStateToJSON(currentState);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `kidcare-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const newState = importStateFromJSON(content);
        if (newState) {
          if(confirm('This will overwrite all current data with the backup. Are you sure?')) {
             saveState(newState);
             window.location.reload(); // Reload to reflect changes
          }
        } else {
          alert('Invalid backup file.');
        }
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => {
    onUpdateSettings({ temperatureUnit: tempUnit });
    onClose();
  };

  const isPremium = accountProfile?.isPremium === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">User Profile</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Account Info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
              {auth.currentUser?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{auth.currentUser?.email}</p>
              <p className="text-xs text-slate-500">{isPremium ? 'Premium Member' : 'Free Member'}</p>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase">Settings</h4>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Temperature Unit</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setTempUnit('C')} 
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${tempUnit === 'C' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Celsius (°C)
                </button>
                <button 
                  onClick={() => setTempUnit('F')} 
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${tempUnit === 'F' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Fahrenheit (°F)
                </button>
              </div>
            </div>
          </div>

          {/* Auto-sync indicator */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-green-800">Auto-Sync Active</p>
                <p className="text-[10px] text-green-600">Your data is automatically saved to the cloud in real-time.</p>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="pt-4 border-t border-slate-100">
             <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Data Management</h4>
             <div className="grid grid-cols-2 gap-3">
                 <button 
                    onClick={handleBackup}
                    className="flex flex-col items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-3 text-slate-600 transition-colors"
                 >
                     <span className="text-xl">📥</span>
                     <span className="text-xs font-bold">Backup Data</span>
                 </button>
                 <button 
                    onClick={handleRestoreClick}
                    className="flex flex-col items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-3 text-slate-600 transition-colors"
                 >
                     <span className="text-xl">📤</span>
                     <span className="text-xs font-bold">Restore Data</span>
                 </button>
             </div>
             {/* Hidden File Input */}
             <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden" 
             />
             <p className="text-[10px] text-slate-400 text-center mt-3 leading-tight">
               Export your data as a JSON file, or import a previous backup.
             </p>
          </div>

          {/* Premium Upgrade Placeholder */}
          {!isPremium && (
            <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-4 rounded-xl border border-amber-200">
              <h4 className="font-bold text-amber-800 mb-1">Upgrade to Premium</h4>
              <p className="text-xs text-amber-700 mb-3">Get unlimited profiles, advanced AI insights, and more.</p>
              <button className="w-full bg-amber-500 text-white font-bold py-2 rounded-lg shadow-sm hover:bg-amber-600 transition-colors text-sm">
                Upgrade Now
              </button>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100">
            <button 
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full text-red-500 font-bold py-2 hover:bg-red-50 rounded-lg transition-colors"
            >
              Log Out
            </button>
          </div>

          <button 
            onClick={handleSave}
            className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-transform"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
