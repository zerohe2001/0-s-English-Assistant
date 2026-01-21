import React, { useState } from 'react';
import { CheckInRecord } from '../types';

interface CheckInCalendarProps {
  checkInHistory: CheckInRecord[];
  totalDays: number;
}

/**
 * GitHub-style contribution calendar for daily check-ins
 * Shows last 12 weeks (84 days) of check-in activity
 */
export const CheckInCalendar: React.FC<CheckInCalendarProps> = ({
  checkInHistory,
  totalDays,
}) => {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Generate last 12 weeks (84 days) of dates
  const generateCalendarDates = () => {
    const today = new Date();
    const dates: Date[] = [];

    for (let i = 83; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }

    return dates;
  };

  const dates = generateCalendarDates();

  // Get check-in record for a specific date
  const getCheckInForDate = (date: Date): CheckInRecord | undefined => {
    const dateStr = date.toISOString().split('T')[0];
    return checkInHistory.find(record => record.date === dateStr);
  };

  // Get color based on groups completed
  const getColor = (groups: number): string => {
    if (groups === 0) return 'bg-gray-200'; // Not studied
    if (groups === 1) return 'bg-green-300'; // 1 group (light green)
    if (groups === 2) return 'bg-green-500'; // 2 groups (medium green)
    return 'bg-green-700'; // 3+ groups (deep green)
  };

  // Group dates by week
  const weeks: Date[][] = [];
  for (let i = 0; i < dates.length; i += 7) {
    weeks.push(dates.slice(i, i + 7));
  }

  // Get hovered check-in details
  const hoveredCheckIn = hoveredDate
    ? checkInHistory.find(record => record.date === hoveredDate)
    : null;

  return (
    <div className="bg-white rounded border border-gray-300 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-h3 text-gray-900">Study Streak</h3>
        <div className="flex items-center gap-2">
          <span className="text-h2 text-gray-900">{totalDays}</span>
          <span className="text-small text-gray-500">days</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="relative">
        <div className="flex gap-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((date, dayIndex) => {
                const dateStr = date.toISOString().split('T')[0];
                const checkIn = getCheckInForDate(date);
                const groups = checkIn?.groupsCompleted || 0;
                const isToday = dateStr === new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={dayIndex}
                    className={`w-3 h-3 rounded-sm ${getColor(groups)} ${
                      isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                    } hover:ring-2 hover:ring-gray-400 transition-all cursor-pointer`}
                    onMouseEnter={() => setHoveredDate(dateStr)}
                    onMouseLeave={() => setHoveredDate(null)}
                    title={`${date.toLocaleDateString()} - ${groups} group${groups === 1 ? '' : 's'}`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Hover Tooltip */}
        {hoveredDate && hoveredCheckIn && (
          <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded text-tiny whitespace-nowrap z-10">
            <div className="font-medium">
              {new Date(hoveredDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <div className="text-gray-300 mt-1">
              {hoveredCheckIn.groupsCompleted} group{hoveredCheckIn.groupsCompleted === 1 ? '' : 's'} completed
            </div>
            <div className="text-gray-400 text-tiny mt-1">
              {hoveredCheckIn.wordsLearned.length} words learned
            </div>
            {/* Arrow */}
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-tiny text-gray-500">
        <span>Less</span>
        <div className="w-3 h-3 bg-gray-200 rounded-sm" />
        <div className="w-3 h-3 bg-green-300 rounded-sm" />
        <div className="w-3 h-3 bg-green-500 rounded-sm" />
        <div className="w-3 h-3 bg-green-700 rounded-sm" />
        <span>More</span>
      </div>
    </div>
  );
};
