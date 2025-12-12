
import React, { useState } from 'react';
import { Profile } from '../types';
import { XMarkIcon } from './Icons';

interface ProfileEditorProps {
  profile: Profile;
  onSave: (updatedProfile: Profile) => void;
  onClose: () => void;
}

const AVATAR_COLORS = [
  'bg-blue-400', 'bg-blue-500', 'bg-indigo-500', 
  'bg-purple-500', 'bg-pink-400', 'bg-rose-500',
  'bg-red-400', 'bg-orange-400', 'bg-amber-400',
  'bg-yellow-400', 'bg-lime-500', 'bg-green-500',
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500',
  'bg-slate-500'
];

const ProfileEditor: React.FC<ProfileEditorProps> = ({ profile, onSave, onClose }) => {
  const [name, setName] = useState(profile.name);
  const [color, setColor] = useState(profile.avatarColor);
  const [dob, setDob] = useState(profile.dateOfBirth || '');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      ...profile,
      name: name.trim(),
      avatarColor: color,
      dateOfBirth: dob
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">Edit Profile</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar Selection */}
          <div className="flex flex-col items-center">
            <div className={`w-20 h-20 rounded-full ${color} flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg ring-4 ring-white`}>
              {name.charAt(0) || '?'}
            </div>
            <div className="grid grid-cols-8 gap-2">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full ${c} ring-2 ring-offset-1 ${color === c ? 'ring-slate-800' : 'ring-transparent'}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Child's Name"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date of Birth (Optional)</label>
              <input 
                type="date"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={dob}
                onChange={e => setDob(e.target.value)}
              />
            </div>
          </div>

          <button 
            onClick={handleSave}
            className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-transform"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditor;
