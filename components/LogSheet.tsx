
import React, { useState, useEffect } from 'react';
import { DailyLog, Medication, TemperatureReading } from '../types';
import { formatDateTitle } from '../utils';

interface LogSheetProps {
  date: string;
  existingLog?: DailyLog;
  onSave: (log: DailyLog) => void;
  onClose: () => void;
  onDelete: (date: string) => void;
}

const COMMON_SYMPTOMS = ['Fever', 'Cough', 'Runny Nose', 'Vomiting', 'Headache', 'Stomach Ache', 'Fatigue', 'Rash'];

const LogSheet: React.FC<LogSheetProps> = ({ date, existingLog, onSave, onClose, onDelete }) => {
  const [symptoms, setSymptoms] = useState<string[]>(existingLog?.symptoms || []);
  const [notes, setNotes] = useState(existingLog?.notes || '');
  const [meds, setMeds] = useState<Medication[]>(existingLog?.medications || []);
  const [temps, setTemps] = useState<TemperatureReading[]>(existingLog?.temperatures || []);
  
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('');
  
  const [newTempVal, setNewTempVal] = useState('37.0');
  const [newTempTime, setNewTempTime] = useState('');

  const [customSymptom, setCustomSymptom] = useState('');

  // Reset when date changes
  useEffect(() => {
    setSymptoms(existingLog?.symptoms || []);
    setNotes(existingLog?.notes || '');
    setMeds(existingLog?.medications || []);
    setTemps(existingLog?.temperatures || []);
    setNewTempVal('37.0');
    
    // Default time for new temp to now
    const now = new Date();
    setNewTempTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  }, [date, existingLog]);

  const toggleSymptom = (sym: string) => {
    if (symptoms.includes(sym)) {
      setSymptoms(symptoms.filter(s => s !== sym));
    } else {
      setSymptoms([...symptoms, sym]);
    }
  };

  const addCustomSymptom = () => {
    if (customSymptom.trim()) {
        const val = customSymptom.trim();
        if(!symptoms.includes(val)) {
            setSymptoms([...symptoms, val]);
        }
        setCustomSymptom('');
    }
  };

  const addMed = () => {
    if (newMedName && newMedDose) {
      setMeds([...meds, { name: newMedName, dosage: newMedDose }]);
      setNewMedName('');
      setNewMedDose('');
    }
  };

  const removeMed = (index: number) => {
    setMeds(meds.filter((_, i) => i !== index));
  };

  const addTemp = () => {
      if(newTempVal && newTempTime) {
          setTemps([...temps, { value: parseFloat(newTempVal), time: newTempTime }].sort((a,b) => a.time.localeCompare(b.time)));
          // Reset slightly but keep time close
          setNewTempVal('37.0');
      }
  }

  const adjustTemp = (delta: number) => {
      const current = parseFloat(newTempVal) || 37.0;
      setNewTempVal((current + delta).toFixed(1));
  }

  const removeTemp = (index: number) => {
      setTemps(temps.filter((_, i) => i !== index));
  }

  const handleSave = () => {
    // If empty, we can just delete or save empty log. 
    // Logic: if all fields empty, it essentially deletes the day from being "sick" or tracked.
    if (symptoms.length === 0 && meds.length === 0 && temps.length === 0 && !notes.trim()) {
        onDelete(date);
    } else {
        onSave({
            date,
            symptoms,
            medications: meds,
            temperatures: temps,
            notes
        });
    }
    onClose();
  };

  // Format date for display using local parsing
  const displayDate = formatDateTitle(date);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto transition-opacity" onClick={onClose} />
      
      {/* Sheet */}
      <div className="bg-white w-full max-w-md rounded-t-3xl shadow-2xl pointer-events-auto transform transition-transform duration-300 max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Handle */}
        <div className="pt-3 pb-1 flex justify-center sticky top-0 bg-white z-10">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        <div className="p-6 pt-2 pb-10 space-y-8">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
             <h2 className="text-2xl font-bold text-slate-800">{displayDate}</h2>
             <button onClick={() => onDelete(date)} className="text-red-400 text-sm font-medium px-2 py-1 rounded hover:bg-red-50">Clear Day</button>
          </div>

          {/* Symptoms */}
          <div className="space-y-3">
              <label className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  Symptoms
                  <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full font-normal">{symptoms.length} selected</span>
              </label>
              
              <div className="flex flex-wrap gap-2">
                {COMMON_SYMPTOMS.map(sym => (
                  <button
                    key={sym}
                    onClick={() => toggleSymptom(sym)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
                      ${symptoms.includes(sym) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  >
                    {sym}
                  </button>
                ))}
                {/* Custom Symptoms Display */}
                {symptoms.filter(s => !COMMON_SYMPTOMS.includes(s)).map(sym => (
                   <button
                   key={sym}
                   onClick={() => toggleSymptom(sym)}
                   className="px-3 py-1.5 rounded-full text-sm font-medium border bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200"
                 >
                   {sym}
                 </button>
                ))}
              </div>

              {/* Add Custom Symptom */}
              <div className="flex gap-2 mt-2">
                  <input 
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Add other symptom..."
                    value={customSymptom}
                    onChange={e => setCustomSymptom(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomSymptom()}
                  />
                  <button onClick={addCustomSymptom} className="bg-slate-200 text-slate-600 px-3 rounded-lg font-bold hover:bg-slate-300">+</button>
              </div>
          </div>

          {/* Temperature */}
          <div className="space-y-3">
              <label className="text-sm font-bold text-slate-800 uppercase tracking-wider">Temperature</label>
              
              <div className="grid grid-cols-2 gap-2">
                 {temps.map((t, idx) => (
                     <div key={idx} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg p-2 px-3">
                         <div>
                            <span className="block text-lg font-bold text-red-700">{t.value.toFixed(1)}°</span>
                            <span className="block text-xs text-red-400">{t.time}</span>
                         </div>
                         <button onClick={() => removeTemp(idx)} className="text-red-300 hover:text-red-600">×</button>
                     </div>
                 ))}
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => adjustTemp(-0.1)} className="w-10 h-10 bg-white border border-slate-200 rounded-lg font-bold text-slate-500 hover:bg-slate-100 active:bg-slate-200">-</button>
                    <input 
                        type="number"
                        step="0.1"
                        className="flex-1 text-center bg-white border border-slate-200 rounded-lg h-10 font-bold text-lg focus:outline-none"
                        value={newTempVal}
                        onChange={e => setNewTempVal(e.target.value)}
                    />
                    <button onClick={() => adjustTemp(0.1)} className="w-10 h-10 bg-white border border-slate-200 rounded-lg font-bold text-slate-500 hover:bg-slate-100 active:bg-slate-200">+</button>
                  </div>
                  
                  <div className="flex gap-2">
                      <input 
                        type="time"
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none text-center"
                        value={newTempTime}
                        onChange={e => setNewTempTime(e.target.value)}
                      />
                      <button 
                        onClick={addTemp}
                        className="bg-red-500 text-white rounded-lg px-6 py-2 font-bold hover:bg-red-600"
                      >
                        Add
                      </button>
                  </div>
              </div>
          </div>

          {/* Meds */}
          <div className="space-y-3">
              <label className="text-sm font-bold text-slate-800 uppercase tracking-wider">Medications</label>
              <div className="space-y-2">
                {meds.map((m, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-blue-50 p-2 px-3 rounded-lg border border-blue-100">
                    <span className="text-blue-900 font-medium">{m.name} <span className="text-blue-500 text-sm">({m.dosage})</span></span>
                    <button onClick={() => removeMed(idx)} className="text-blue-300 hover:text-blue-600">×</button>
                  </div>
                ))}
                
                <div className="flex gap-2">
                  <input 
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Medicine"
                    value={newMedName}
                    onChange={e => setNewMedName(e.target.value)}
                  />
                  <input 
                    className="w-20 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Dose"
                    value={newMedDose}
                    onChange={e => setNewMedDose(e.target.value)}
                  />
                  <button 
                    onClick={addMed}
                    className="bg-blue-500 text-white rounded-lg px-4 font-bold text-lg hover:bg-blue-600"
                  >
                    +
                  </button>
                </div>
              </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
             <label className="text-sm font-bold text-slate-800 uppercase tracking-wider">Notes</label>
             <textarea 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Any specific observations..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
             />
          </div>

          <button 
            onClick={handleSave}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all"
          >
            Save Log
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogSheet;
