import React, { useState } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';

interface BackfillEntry {
  date: string;
  groups: number;
}

/**
 * Page to manually add check-in records
 * Useful for backfilling missed check-ins or correcting data
 */
export const BackfillCheckIn = () => {
  const navigate = useNavigate();
  const { addCheckIn, getCheckInRecord, showToast } = useStore();
  const [loading, setLoading] = useState(false);

  // Form state
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [groups, setGroups] = useState(1);

  // Entries to add
  const [entries, setEntries] = useState<BackfillEntry[]>([]);

  const handleAddEntry = () => {
    // Check if date already in entries
    if (entries.some(e => e.date === date)) {
      showToast('该日期已在列表中', 'warning');
      return;
    }

    setEntries([...entries, { date, groups }]);
    // Reset groups but keep date for convenience
    setGroups(1);
  };

  const handleRemoveEntry = (dateToRemove: string) => {
    setEntries(entries.filter(e => e.date !== dateToRemove));
  };

  const handleSubmit = async () => {
    if (entries.length === 0) {
      showToast('请先添加要补卡的日期', 'warning');
      return;
    }

    setLoading(true);

    try {
      let addedCount = 0;
      let updatedCount = 0;

      for (const entry of entries) {
        const existing = getCheckInRecord(entry.date);

        if (existing) {
          // Update existing record (add groups)
          addCheckIn(entry.date, existing.groupsCompleted + entry.groups, existing.wordsLearned);
          console.log(`✅ Updated ${entry.date}: ${existing.groupsCompleted} → ${existing.groupsCompleted + entry.groups} groups`);
          updatedCount++;
        } else {
          // Add new record
          addCheckIn(entry.date, entry.groups, []);
          console.log(`✅ Added check-in for ${entry.date} (${entry.groups} groups)`);
          addedCount++;
        }

        // Delay to ensure state updates and sync completes
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const messages = [];
      if (addedCount > 0) messages.push(`新增 ${addedCount} 天`);
      if (updatedCount > 0) messages.push(`更新 ${updatedCount} 天`);

      showToast(`补卡成功！${messages.join('，')}`, 'success');
      setEntries([]);

    } catch (error) {
      console.error('Error backfilling:', error);
      showToast('补卡失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 pb-24">
      <header className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="text-small text-gray-500 hover:text-gray-700 mb-4"
        >
          ← 返回首页
        </button>
        <h1 className="text-h1 text-gray-900 mb-2">补卡</h1>
        <p className="text-body text-gray-500">
          手动添加或更新打卡记录
        </p>
      </header>

      {/* Add Entry Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-h3 text-gray-900 mb-4">添加记录</h2>

        <div className="space-y-4">
          {/* Date Input */}
          <div>
            <label className="block text-small font-medium text-gray-700 mb-2">
              日期
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          {/* Groups Input */}
          <div>
            <label className="block text-small font-medium text-gray-700 mb-2">
              组数 (每组 5 个单词)
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setGroups(Math.max(1, groups - 1))}
                className="w-12 h-12 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-xl font-medium"
              >
                -
              </button>
              <input
                type="number"
                value={groups}
                onChange={(e) => setGroups(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                className="w-20 text-center px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-xl font-semibold"
              />
              <button
                onClick={() => setGroups(groups + 1)}
                className="w-12 h-12 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-xl font-medium"
              >
                +
              </button>
              <span className="text-small text-gray-500 ml-2">
                = {groups * 5} 个单词
              </span>
            </div>
          </div>

          {/* Existing Record Warning */}
          {getCheckInRecord(date) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-small text-yellow-800">
                该日期已有 {getCheckInRecord(date)?.groupsCompleted} 组记录，新增将累加
              </p>
            </div>
          )}

          {/* Add Button */}
          <button
            onClick={handleAddEntry}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition-colors"
          >
            添加到列表
          </button>
        </div>
      </div>

      {/* Entries List */}
      {entries.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-h3 text-gray-900 mb-4">
            待提交 ({entries.length} 条)
          </h2>

          <div className="space-y-3 mb-6">
            {entries.map((entry) => {
              const existing = getCheckInRecord(entry.date);
              return (
                <div
                  key={entry.date}
                  className="p-4 rounded-lg border border-gray-200 bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-small font-semibold text-gray-900">
                        {formatDate(entry.date)}
                      </div>
                      <div className="text-tiny text-gray-500 mt-1">
                        {entry.date}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-small font-medium text-gray-900">
                          +{entry.groups} 组
                        </div>
                        {existing && (
                          <div className="text-tiny text-gray-500">
                            {existing.groupsCompleted} → {existing.groupsCompleted + entry.groups}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveEntry(entry.date)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-medium text-white transition-colors ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gray-900 hover:bg-gray-800'
            }`}
          >
            {loading ? '处理中...' : `确认补卡 (${entries.length} 条)`}
          </button>
        </div>
      )}

      {/* Empty State */}
      {entries.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-small">选择日期和组数，点击"添加到列表"</p>
        </div>
      )}
    </div>
  );
};
