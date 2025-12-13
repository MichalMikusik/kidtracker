
import React, { useMemo } from 'react';
import { DailyLog, Stats, Profile } from '../types';

interface StatsViewProps {
  currentProfileId: string;
  profiles: Profile[];
  allLogs: Record<string, Record<string, DailyLog>>;
}

interface Correlation {
    otherProfileName: string;
    gapDays: number;
    type: 'GAVE_TO' | 'GOT_FROM';
    date: string;
}

const StatsView: React.FC<StatsViewProps> = ({ currentProfileId, profiles, allLogs }) => {
  const currentLogs = allLogs[currentProfileId] || {};

  const stats: Stats = useMemo(() => {
    // Sort logs by date
    const logArray = (Object.values(currentLogs) as DailyLog[]).sort((a, b) => a.date.localeCompare(b.date));
    
    // Helper to check if a log is "Sick"
    const isSick = (log: DailyLog) => (log.symptoms && log.symptoms.length > 0) || (log.temperatures && log.temperatures.length > 0);

    let totalSickDays = 0;
    let episodesCount = 0;
    const commonSymptoms: Record<string, number> = {};
    const episodeDurations: number[] = [];
    const episodeStartDates: string[] = [];

    let currentEpisodeDuration = 0;
    let inEpisode = false;
    let lastSickDate: Date | null = null;

    for (let i = 0; i < logArray.length; i++) {
        const log = logArray[i];
        if (!isSick(log)) continue;

        totalSickDays++;
        if (log.symptoms) {
            log.symptoms.forEach(s => {
                commonSymptoms[s] = (commonSymptoms[s] || 0) + 1;
            });
        }

        const currentDate = new Date(log.date);

        if (!inEpisode) {
            inEpisode = true;
            episodesCount++;
            currentEpisodeDuration = 1;
            episodeStartDates.push(log.date);
        } else {
            if (lastSickDate) {
                const diffTime = Math.abs(currentDate.getTime() - lastSickDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                if (diffDays <= 1) {
                    currentEpisodeDuration++;
                } else {
                    episodeDurations.push(currentEpisodeDuration);
                    inEpisode = true;
                    episodesCount++;
                    currentEpisodeDuration = 1;
                    episodeStartDates.push(log.date);
                }
            }
        }
        lastSickDate = currentDate;
    }

    if (inEpisode) {
        episodeDurations.push(currentEpisodeDuration);
    }

    const avgDuration = episodeDurations.length > 0 
      ? episodeDurations.reduce((a, b) => a + b, 0) / episodeDurations.length 
      : 0;

    let sumGaps = 0;
    let gapCount = 0;
    if (episodeStartDates.length > 1) {
        for(let i = 0; i < episodeStartDates.length - 1; i++) {
            const d1 = new Date(episodeStartDates[i]);
            const d2 = new Date(episodeStartDates[i+1]);
            const diffTime = Math.abs(d2.getTime() - d1.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            sumGaps += diffDays;
            gapCount++;
        }
    }
    const mtbf = gapCount > 0 ? sumGaps / gapCount : 0;

    return {
      totalSickDays,
      episodesCount,
      averageDuration: Math.round(avgDuration * 10) / 10,
      meanTimeBetweenIllness: Math.round(mtbf),
      commonSymptoms
    };
  }, [currentLogs]);

  // Family Correlations Logic
  const correlations: Correlation[] = useMemo(() => {
      const results: Correlation[] = [];
      if(profiles.length < 2) return results;

      // Extract start dates for all profiles
      const getStartDates = (pid: string) => {
          const logs = (Object.values(allLogs[pid] || {}) as DailyLog[]).sort((a,b) => a.date.localeCompare(b.date));
          const starts: string[] = [];
          let inEp = false;
          let lastDate: Date | null = null;
          
          logs.forEach(log => {
             const isSick = (log.symptoms && log.symptoms.length > 0) || (log.temperatures && log.temperatures.length > 0);
             if(!isSick) return;
             
             const d = new Date(log.date);
             if(!inEp) {
                 starts.push(log.date);
                 inEp = true;
             } else if (lastDate) {
                 const diff = (d.getTime() - lastDate.getTime()) / (1000 * 3600 * 24);
                 if(diff > 1) {
                     starts.push(log.date);
                 }
             }
             lastDate = d;
          });
          return starts;
      };

      const myStarts = getStartDates(currentProfileId);

      profiles.forEach(other => {
          if(other.id === currentProfileId) return;
          const otherStarts = getStartDates(other.id);

          // Check if I gave it to Other (My start -> Other start within 1-7 days)
          myStarts.forEach(myDate => {
              const mDate = new Date(myDate);
              otherStarts.forEach(otherDate => {
                  const oDate = new Date(otherDate);
                  const diff = (oDate.getTime() - mDate.getTime()) / (1000 * 3600 * 24);
                  if(diff >= 1 && diff <= 7) {
                      results.push({
                          otherProfileName: other.name,
                          gapDays: Math.round(diff),
                          type: 'GAVE_TO',
                          date: myDate
                      });
                  }
              });
          });

          // Check if I got it from Other (Other start -> My start within 1-7 days)
          otherStarts.forEach(otherDate => {
            const oDate = new Date(otherDate);
            myStarts.forEach(myDate => {
                const mDate = new Date(myDate);
                const diff = (mDate.getTime() - oDate.getTime()) / (1000 * 3600 * 24);
                if(diff >= 1 && diff <= 7) {
                    results.push({
                        otherProfileName: other.name,
                        gapDays: Math.round(diff),
                        type: 'GOT_FROM',
                        date: myDate
                    });
                }
            });
        });
      });

      return results.sort((a,b) => b.date.localeCompare(a.date));
  }, [allLogs, currentProfileId, profiles]);

  const topSymptom = Object.entries(stats.commonSymptoms).sort((a,b) => b[1] - a[1])[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
          <p className="text-orange-600 text-xs font-semibold uppercase tracking-wider">Episodes</p>
          <p className="text-3xl font-bold text-orange-900 mt-1">{stats.episodesCount}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
          <p className="text-red-600 text-xs font-semibold uppercase tracking-wider">Total Sick Days</p>
          <p className="text-3xl font-bold text-red-900 mt-1">{stats.totalSickDays}</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-slate-800 font-semibold mb-4 flex items-center gap-2">
           Detailed Stats
        </h3>
        
        <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-slate-500 text-sm">Avg. Duration</span>
                <span className="font-medium text-slate-800">{stats.averageDuration} days</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-slate-500 text-sm">Mean Time Between Illness</span>
                <span className="font-medium text-slate-800">{stats.meanTimeBetweenIllness > 0 ? `${stats.meanTimeBetweenIllness} days` : '-'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 text-sm">Most Common Symptom</span>
                <span className="font-medium text-slate-800 capitalize">{topSymptom ? topSymptom[0] : '-'}</span>
            </div>
        </div>
      </div>

      {correlations.length > 0 && (
          <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
             <h3 className="text-indigo-900 font-bold mb-3 flex items-center gap-2">
                 🔗 Family Link
             </h3>
             <div className="space-y-3">
                 {correlations.map((c, i) => (
                     <div key={i} className="bg-white p-3 rounded-lg shadow-sm border border-indigo-50 text-sm">
                         {c.type === 'GAVE_TO' ? (
                             <p className="text-slate-700">
                                 Likely passed to <span className="font-bold text-indigo-600">{c.otherProfileName}</span> (+{c.gapDays} days)
                             </p>
                         ) : (
                             <p className="text-slate-700">
                                 Likely caught from <span className="font-bold text-indigo-600">{c.otherProfileName}</span> ({c.gapDays} days prior)
                             </p>
                         )}
                         <p className="text-xs text-slate-400 mt-1">Episode starting {c.date}</p>
                     </div>
                 ))}
             </div>
          </div>
      )}
    </div>
  );
};

export default StatsView;
