import React, { useState } from 'react';
import { CheckInRecord } from '../types';

interface CheckInCalendarProps {
  checkInHistory: CheckInRecord[];
  totalDays: number;
}

/**
 * Monthly calendar view showing check-in activity
 * Displays current month with visual indicators for studied days
 */
export const CheckInCalendar: React.FC<CheckInCalendarProps> = ({
  checkInHistory,
  totalDays,
}) => {
  // Generate calendar grid for current month
  const generateMonthCalendar = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    // Get first and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Get day of week for first day (0 = Sunday)
    const startDayOfWeek = firstDay.getDay();

    // Calculate total cells needed (including padding)
    const daysInMonth = lastDay.getDate();
    const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;

    const calendar: Array<{ date: Date | null; dateStr: string | null; checkIn: CheckInRecord | undefined }> = [];

    // Add padding for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      calendar.push({ date: null, dateStr: null, checkIn: undefined });
    }

    // Add all days in month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const checkIn = checkInHistory.find(record => record.date === dateStr);
      calendar.push({ date, dateStr, checkIn });
    }

    // Add padding for days after month ends
    const remainingCells = totalCells - calendar.length;
    for (let i = 0; i < remainingCells; i++) {
      calendar.push({ date: null, dateStr: null, checkIn: undefined });
    }

    return calendar;
  };

  const calendar = generateMonthCalendar();
  const today = new Date();
  const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayStr = today.toISOString().split('T')[0];

  // Group calendar into weeks
  const weeks: typeof calendar[] = [];
  for (let i = 0; i < calendar.length; i += 7) {
    weeks.push(calendar.slice(i, i + 7));
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-h3 text-gray-900 font-semibold">{monthName}</h3>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-900">{totalDays}</div>
          <div className="text-tiny text-gray-500">total days</div>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-tiny text-gray-500 font-medium py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendar.map((cell, index) => {
          if (!cell.date || !cell.dateStr) {
            // Empty cell for padding
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const hasStudied = cell.checkIn && cell.checkIn.groupsCompleted > 0;
          const isToday = cell.dateStr === todayStr;

          return (
            <div
              key={cell.dateStr}
              className={`aspect-square rounded-lg flex items-center justify-center text-small font-medium transition-all ${
                isToday
                  ? hasStudied
                    ? 'bg-gray-900 text-white ring-2 ring-blue-500'
                    : 'bg-white ring-2 ring-blue-500 text-gray-900'
                  : hasStudied
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {cell.date.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
};
