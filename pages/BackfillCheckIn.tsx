import React, { useState } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';

/**
 * Admin page to backfill check-in history
 * Temporary page for one-time data backfill
 */
export const BackfillCheckIn = () => {
  const navigate = useNavigate();
  const { addCheckIn, getCheckInRecord, showToast } = useStore();
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Data to backfill
  const backfillData = [
    { date: '2025-01-19', groups: 1, description: 'Sunday, Jan 19' },
    { date: '2025-01-20', groups: 1, description: 'Monday, Jan 20' },
    { date: '2025-01-21', groups: 1, description: 'Tuesday, Jan 21 (Today)' },
  ];

  const handleBackfill = async () => {
    setLoading(true);

    try {
      let addedCount = 0;
      let skippedCount = 0;

      for (const data of backfillData) {
        // Check if already exists (re-check each time to get latest state)
        const existing = getCheckInRecord(data.date);

        if (existing) {
          console.log(`⚠️ ${data.date} already exists, skipping...`);
          skippedCount++;
        } else {
          // Add check-in
          addCheckIn(data.date, data.groups, []);
          console.log(`✅ Added check-in for ${data.date} (${data.groups} group)`);
          addedCount++;

          // Longer delay to ensure state updates and sync completes
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      setCompleted(true);

      if (addedCount > 0) {
        showToast(`Successfully backfilled ${addedCount} check-in record(s)!`, 'success');
      } else {
        showToast(`All dates already have check-in records (skipped ${skippedCount})`, 'info');
      }

    } catch (error) {
      console.error('Error backfilling:', error);
      showToast('Failed to backfill check-in history', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 pb-24">
      <header className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="text-small text-gray-500 hover:text-gray-700 mb-4"
        >
          ← Back to Home
        </button>
        <h1 className="text-h1 text-gray-900 mb-2">Backfill Check-In History</h1>
        <p className="text-body text-gray-500">
          Add historical check-in records to your calendar
        </p>
      </header>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-h3 text-gray-900 mb-4">Data to Backfill</h2>

        <div className="space-y-3 mb-6">
          {backfillData.map((data) => {
            const existing = getCheckInRecord(data.date);
            return (
              <div
                key={data.date}
                className={`p-4 rounded-lg border ${
                  existing ? 'bg-gray-50 border-gray-300' : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-small font-semibold text-gray-900">
                      {data.description}
                    </div>
                    <div className="text-tiny text-gray-500 mt-1">
                      {data.date}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-small text-gray-600">
                      {data.groups} group
                    </span>
                    {existing ? (
                      <span className="px-2 py-1 bg-gray-200 text-gray-600 text-tiny rounded">
                        Already exists
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-tiny rounded">
                        Will add
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-200 pt-6">
          {!completed ? (
            <button
              onClick={handleBackfill}
              disabled={loading}
              className={`w-full py-3 rounded-lg font-medium text-white transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Processing...' : 'Backfill Check-In History'}
            </button>
          ) : (
            <div className="text-center">
              <div className="text-h2 mb-2">✅</div>
              <p className="text-body text-gray-900 font-semibold mb-1">
                Backfill completed!
              </p>
              <p className="text-small text-gray-500 mb-4">
                Your check-in history has been updated
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                View Calendar
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-tiny text-yellow-800">
            ⚠️ This is a one-time admin operation. After backfilling, you can safely delete this page.
          </p>
        </div>
      </div>
    </div>
  );
};
