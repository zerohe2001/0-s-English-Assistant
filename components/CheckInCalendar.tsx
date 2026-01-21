import React, { useState } from 'react';
import { CheckInRecord } from '../types';

interface CheckInCalendarProps {
  checkInHistory: CheckInRecord[];
  totalDays: number;
}

/**
 * Simple list view of recent check-ins
 * Shows last 7 days of learning activity
 */
export const CheckInCalendar: React.FC<CheckInCalendarProps> = ({
  checkInHistory,
  totalDays,
}) => {
  // Generate last 7 days
  const getLast7Days = () => {
    const days: { date: Date; dateStr: string; checkIn: CheckInRecord | undefined }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const checkIn = checkInHistory.find(record => record.date === dateStr);
      days.push({ date, dateStr, checkIn });
    }

    return days;
  };

  const last7Days = getLast7Days();

  // Format date display
  const formatDate = (date: Date, dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateStr === today) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${weekdays[date.getDay()]}, ${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-h3 text-gray-900 font-semibold">Study Streak</h3>
          <p className="text-tiny text-gray-500 mt-1">Last 7 days</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-900">{totalDays}</div>
          <div className="text-tiny text-gray-500">total days</div>
        </div>
      </div>

      {/* List of last 7 days */}
      <div className="space-y-2">
        {last7Days.map(({ date, dateStr, checkIn }) => {
          const groups = checkIn?.groupsCompleted || 0;
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <div
              key={dateStr}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                isToday ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-small font-medium text-gray-900 w-28">
                  {formatDate(date, dateStr)}
                </div>
                {groups > 0 && (
                  <div className="text-small text-gray-600">
                    {checkIn?.wordsLearned.map((_, i) => i < 5 ? '⭐' : '').join('')}
                    {groups > 1 && (
                      <span className="ml-2">
                        {checkIn?.wordsLearned.slice(5, 10).map((_, i) => '⭐').join('')}
                      </span>
                    )}
                    {groups > 2 && (
                      <span className="ml-2">
                        {checkIn?.wordsLearned.slice(10, 15).map((_, i) => '⭐').join('')}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {groups > 0 ? (
                  <>
                    <span className="text-small font-semibold text-green-600">
                      {groups} {groups === 1 ? 'group' : 'groups'}
                    </span>
                    <span className="text-tiny text-gray-500">
                      ({checkIn?.wordsLearned.length} words)
                    </span>
                  </>
                ) : (
                  <span className="text-small text-gray-400">No study</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
