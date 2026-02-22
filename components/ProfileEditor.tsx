
import React, { useState, useRef } from 'react';
import { Profile, AccountProfile } from '../types';
import { auth } from '../services/firebase';
import { XMarkIcon } from './Icons';
import { exportStateToJSON, importStateFromJSON, loadState, saveState } from '../services/storageService';

interface ProfileEditorProps {
  profile: Profile;
  accountProfile: AccountProfile | null;
  onSave: (updatedProfile: Profile) => void;
  onClose: () => void;
  onDelete: (profileId: string) => void;
}

const AVATAR_COLORS = [
  'bg-blue-400', 'bg-blue-500', 'bg-indigo-500', 
  'bg-purple-500', 'bg-pink-400', 'bg-rose-500',
  'bg-red-400', 'bg-orange-400', 'bg-amber-400',
  'bg-yellow-400', 'bg-lime-500', 'bg-green-500',
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500',
  'bg-slate-500'
];

const ProfileEditor: React.FC<ProfileEditorProps> = ({ profile, accountProfile, onSave, onClose, onDelete }) => {
  const [name, setName] = useState(profile.name);
  const [color, setColor] = useState(profile.avatarColor);
  const [dob, setDob] = useState(() => {
    if (!profile.dateOfBirth) return '';
    const [year, month, day] = profile.dateOfBirth.split('-');
    return `${day}/${month}/${year}`;
  });
  const [profilePicture, setProfilePicture] = useState(profile.profilePicture);
  const [tempUnit, setTempUnit] = useState(accountProfile?.temperatureUnit || 'C');
  const [currency, setCurrency] = useState(accountProfile?.currency || 'USD');
  const pictureUploadRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!name.trim()) return;
    
    let isoDate = '';
    if (dob) {
      const [day, month, year] = dob.split('/');
      if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
        isoDate = `${year}-${month}-${day}`;
      }
    }

    onSave({
      ...profile,
      name: name.trim(),
      avatarColor: color,
      dateOfBirth: isoDate,
      profilePicture
    });
    onClose();
  };

  const handleDelete = () => {
    console.log("ProfileEditor: handleDelete called for profileId:", profile.id);
    onDelete(profile.id);
  }

  const handlePictureUploadClick = () => {
    pictureUploadRef.current?.click();
  };

  const handlePictureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setProfilePicture(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">Edit Profile</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Avatar Selection */}
          <div className="flex flex-col items-center">
            <button onClick={handlePictureUploadClick} className="relative">
              {profilePicture ? (
                <img src={profilePicture} className={`w-20 h-20 rounded-full object-cover bg-slate-100 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg ring-4 ring-white`} />
              ) : (
                <div className={`w-20 h-20 rounded-full ${color} flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg ring-4 ring-white`}>
                  {name.charAt(0) || '?'}
                </div>
              )}
              <div className="absolute bottom-4 right-0 bg-white p-1 rounded-full shadow">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                  <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                </svg>
              </div>
            </button>
            <input 
              type="file" 
              ref={pictureUploadRef}
              onChange={handlePictureFileChange}
              accept="image/*"
              className="hidden" 
            />

            <div className="grid grid-cols-8 gap-2 mt-4">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c);
                    setProfilePicture(undefined);
                  }}
                  className={`w-6 h-6 rounded-full ${c} ring-2 ring-offset-1 ${color === c && !profilePicture ? 'ring-slate-800' : 'ring-transparent'}`}
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
                type="text"
                placeholder="DD/MM/YYYY"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={dob}
                onChange={e => {
                    let input = e.target.value.replace(/[^0-9]/g, '');
                    if (input.length > 2) {
                        input = input.slice(0, 2) + '/' + input.slice(2);
                    }
                    if (input.length > 5) {
                        input = input.slice(0, 5) + '/' + input.slice(5, 9);
                    }
                    setDob(input);
                }}
              />
            </div>
          </div>

          <button 
            onClick={handleSave}
            className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-transform"
          >
            Save Changes
          </button>
          
          <div className="pt-6 mt-2 border-t border-slate-100">
             <button 
                onClick={handleDelete}
                className="w-full text-center text-sm text-red-500 font-bold py-2 hover:bg-red-50 rounded-lg"
              >
                Delete Profile
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditor;
