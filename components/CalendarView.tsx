import React, { useState, useMemo } from 'react';
import { DailyLog } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { toLocalISOString } from '../utils';

interface CalendarViewProps {
  logs: Record<string, DailyLog>;
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
}

const CalendarView: React.FC<CalendarViewProps> = ({ logs, onDateSelect, selectedDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => (new Date(date.getFullYear(), date.getMonth(), 1).getDay() + 6) % 7;

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Helper to determine if a day counts as "Sick"
  const isSickDay = (dateStr: string) => {
    const log = logs[dateStr];
    if (!log) return false;
    // Considered sick if symptoms recorded or temperature recorded or simple note
    return (log.symptoms && log.symptoms.length > 0) || (log.temperatures && log.temperatures.length > 0) || log.notes;
  };

  const days = useMemo(() => {
    const totalDays = daysInMonth(currentDate);
    const startDay = firstDayOfMonth(currentDate);
    const daysArray = [];

    // Empty cells for days before the 1st
    for (let i = 0; i < startDay; i++) {
      daysArray.push(null);
    }

    // Days of the month
    for (let i = 1; i <= totalDays; i++) {
      daysArray.push(i);
    }
    return daysArray;
  }, [currentDate]);

  const getStatus = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    
    // Check if today is sick
    if (!isSickDay(dateStr)) return 'NONE';

    // Check previous day
    const prevDateObj = new Date(year, currentDate.getMonth(), day - 1);
    const prevDateStr = toLocalISOString(prevDateObj);

    const wasSickYesterday = isSickDay(prevDateStr);

    if (wasSickYesterday) {
        return 'ONGOING';
    } else {
        return 'STARTED';
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold text-slate-800">{monthName} <span className="text-slate-400 font-normal">{year}</span></h2>
        <div className="flex gap-1 bg-slate-50 rounded-full p-1">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-full text-slate-500 transition-all shadow-sm">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-full text-slate-500 transition-all shadow-sm">
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 mb-4">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-y-3 gap-x-1">
        {days.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} />;
          
          const m = String(currentDate.getMonth() + 1).padStart(2, '0');
          const d = String(day).padStart(2, '0');
          const dateStr = `${currentDate.getFullYear()}-${m}-${d}`;
          
          const isSelected = selectedDate === dateStr;
          const status = getStatus(day);
          
          let baseClasses = "h-11 w-11 md:h-12 md:w-12 mx-auto flex items-center justify-center rounded-2xl text-sm font-semibold transition-all duration-200 relative";
          
          if (status === 'STARTED') {
              baseClasses += " bg-red-500 text-white shadow-lg shadow-red-200 z-10 scale-105";
          } else if (status === 'ONGOING') {
              baseClasses += " bg-orange-400 text-white shadow-md shadow-orange-100";
          } else {
              baseClasses += " bg-transparent text-slate-600 hover:bg-slate-50";
          }

          if (isSelected) {
              baseClasses += " ring-2 ring-indigo-500 ring-offset-2";
          }

          return (
            <button
              key={day}
              onClick={() => onDateSelect(dateStr)}
              className={baseClasses}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;