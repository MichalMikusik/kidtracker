
import React from 'react';
import { DailyLog } from '../types';
import { formatDateTitle } from '../utils';
import { PencilIcon } from './Icons';

interface HistoryViewProps {
  logs: Record<string, DailyLog>;
  onEditDate: (date: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ logs, onEditDate }) => {
  const sortedLogs = (Object.values(logs) as DailyLog[])
    .sort((a, b) => b.date.localeCompare(a.date));

  // Filter out days that are just notes/healthy if desired, but we keep everything for history
  const historyItems = sortedLogs.filter(log => 
     (log.symptoms && log.symptoms.length > 0) || 
     (log.temperatures && log.temperatures.length > 0) ||
     (log.medications && log.medications.length > 0) ||
     log.notes
  );

  if (historyItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-3xl">📅</span>
        </div>
        <h3 className="text-lg font-bold text-slate-700">No History Yet</h3>
        <p className="text-slate-400 text-sm mt-1 max-w-xs">
          When you log symptoms or medications on the calendar, they will appear here as a list.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {historyItems.map((log) => {
        const maxTemp = log.temperatures && log.temperatures.length > 0
            ? Math.max(...log.temperatures.map(t => t.value))
            : null;

        return (
          <div key={log.date} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative group">
             <button 
                onClick={() => onEditDate(log.date)}
                className="absolute top-4 right-4 text-slate-300 hover:text-slate-600 p-1"
             >
                <PencilIcon className="w-4 h-4" />
             </button>

             <div className="mb-2">
                 <h3 className="font-bold text-slate-800">{formatDateTitle(log.date)}</h3>
             </div>

             <div className="space-y-3">
                 {/* Symptoms */}
                 {log.symptoms && log.symptoms.length > 0 && (
                     <div className="flex flex-wrap gap-2">
                         {log.symptoms.map(s => (
                             <span key={s} className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded-md border border-indigo-100">
                                 {s}
                             </span>
                         ))}
                     </div>
                 )}

                 {/* Vitals & Meds Row */}
                 <div className="flex flex-wrap items-center gap-4 text-sm">
                     {maxTemp && (
                         <div className={`flex items-center gap-1 font-bold ${maxTemp >= 38 ? 'text-red-500' : 'text-orange-500'}`}>
                             <span>🌡️ {maxTemp.toFixed(1)}°</span>
                         </div>
                     )}
                     
                     {log.medications && log.medications.length > 0 && (
                         <div className="text-blue-600 flex items-center gap-1">
                             <span>💊 {log.medications.length} med{log.medications.length > 1 ? 's' : ''}</span>
                         </div>
                     )}
                 </div>

                 {/* Notes */}
                 {log.notes && (
                     <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 italic border border-slate-100">
                         "{log.notes}"
                     </div>
                 )}
             </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoryView;
