
import React, { useState, useEffect } from 'react';
import { XMarkIcon } from './Icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Update UI notify the user they can install the PWA
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setIsVisible(false);
    }
    
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 animate-in fade-in slide-in-from-bottom-10 duration-500">
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between gap-4 border border-slate-700">
        <div className="flex-1">
          <p className="font-bold text-sm">Install KidCare</p>
          <p className="text-xs text-slate-400 mt-0.5">Add to home screen for quick access and offline mode.</p>
        </div>
        <div className="flex items-center gap-2">
            <button 
            onClick={handleInstallClick}
            className="bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
            >
            Install
            </button>
            <button 
            onClick={() => setIsVisible(false)}
            className="text-slate-400 hover:text-white p-1"
            >
            <XMarkIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
