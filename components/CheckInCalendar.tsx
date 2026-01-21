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

  // Get month labels for the calendar
  const getMonthLabels = () => {
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const firstDay = week[0];
      const month = firstDay.getMonth();

      if (month !== lastMonth) {
        labels.push({
          month: firstDay.toLocaleDateString('en-US', { month: 'short' }),
          weekIndex
        });
        lastMonth = month;
      }
    });

    return labels;
  };

  const monthLabels = getMonthLabels();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-h3 text-gray-900 font-semibold">Study Streak</h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold text-gray-900">{totalDays}</span>
            <span className="text-small text-gray-500">days</span>
          </div>
        </div>
        <p className="text-small text-gray-500">
          Last 12 weeks of daily learning activity
        </p>
      </div>

      {/* Calendar Grid */}
      <div className="relative">
        {/* Month Labels */}
        <div className="flex gap-1 mb-2 h-4">
          {monthLabels.map((label, index) => (
            <div
              key={index}
              className="text-tiny text-gray-500"
              style={{
                marginLeft: index === 0 ? `${label.weekIndex * 16}px` : '0',
                flex: index === monthLabels.length - 1 ? '1' : 'none'
              }}
            >
              {label.month}
            </div>
          ))}
        </div>

        {/* Weekday Labels */}
        <div className="flex gap-1 mb-1">
          <div className="flex flex-col gap-1 text-tiny text-gray-500 w-6 text-right pr-2">
            <div className="h-3">M</div>
            <div className="h-3"></div>
            <div className="h-3">W</div>
            <div className="h-3"></div>
            <div className="h-3">F</div>
            <div className="h-3"></div>
            <div className="h-3">S</div>
          </div>

          <div className="flex gap-1 flex-1">
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
                        isToday ? 'ring-1 ring-blue-500' : ''
                      } hover:ring-1 hover:ring-gray-400 transition-all cursor-pointer`}
                      onMouseEnter={() => setHoveredDate(dateStr)}
                      onMouseLeave={() => setHoveredDate(null)}
                      title={`${date.toLocaleDateString()} - ${groups} group${groups === 1 ? '' : 's'}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
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
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-tiny text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-gray-200 rounded-sm" />
              <span>No study</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-green-300 rounded-sm" />
              <span>1 group</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-green-500 rounded-sm" />
              <span>2 groups</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-green-700 rounded-sm" />
              <span>3+ groups</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-white border border-blue-500 rounded-sm" />
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
};
