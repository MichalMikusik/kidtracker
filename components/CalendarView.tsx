
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
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

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
    // Considered sick if symptoms recorded or temperature recorded
    return (log.symptoms && log.symptoms.length > 0) || (log.temperatures && log.temperatures.length > 0);
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

  const getStatusColor = (day: number) => {
    // Construct local date string manually to avoid UTC shifts
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    
    // Check if today is sick
    if (!isSickDay(dateStr)) return 'bg-white text-slate-700';

    // Check previous day to determine if "Started" or "Ongoing"
    // Calculate previous day date string safely
    const prevDateObj = new Date(year, currentDate.getMonth(), day - 1);
    const prevDateStr = toLocalISOString(prevDateObj);

    const wasSickYesterday = isSickDay(prevDateStr);

    if (wasSickYesterday) {
        return 'bg-orange-400 text-white shadow-md shadow-orange-200'; // Ongoing
    } else {
        return 'bg-red-500 text-white shadow-md shadow-red-200'; // Started
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">{monthName} <span className="text-slate-400 font-normal">{year}</span></h2>
        <div className="flex gap-2">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-xs font-semibold text-slate-400 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-y-2 gap-x-1">
        {days.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} />;
          
          // Construct date key consistent with getStatusColor
          const m = String(currentDate.getMonth() + 1).padStart(2, '0');
          const d = String(day).padStart(2, '0');
          const dateStr = `${currentDate.getFullYear()}-${m}-${d}`;
          
          const isSelected = selectedDate === dateStr;
          const statusClass = getStatusColor(day);
          
          return (
            <button
              key={day}
              onClick={() => onDateSelect(dateStr)}
              className={`
                h-10 w-10 md:h-12 md:w-12 mx-auto flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-200
                ${statusClass}
                ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 scale-105' : ''}
                hover:scale-105 active:scale-95
              `}
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
