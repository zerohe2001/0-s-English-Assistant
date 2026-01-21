import React, { useState } from 'react';

interface MakeupCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  eligibleDates: string[];
  onConfirm: (targetDate: string) => void;
  extraGroups: number;
}

/**
 * Modal for selecting a date to makeup check-in with extra groups
 */
export const MakeupCheckInModal: React.FC<MakeupCheckInModalProps> = ({
  isOpen,
  onClose,
  eligibleDates,
  onConfirm,
  extraGroups,
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedDate) {
      onConfirm(selectedDate);
      setSelectedDate(null);
      onClose();
    }
  };

  const handleSkip = () => {
    setSelectedDate(null);
    onClose();
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekday = weekdays[date.getDay()];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日 (${weekday})`;
  };

  // Calculate how many days ago
  const getDaysAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return '昨天';
    if (diffDays === 2) return '前天';
    return `${diffDays} 天前`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-gray-300">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-h2 text-gray-900 mb-2">🎉 太棒了！</h2>
              <p className="text-small text-gray-600">
                今天你学了 {extraGroups + 1} 组单词！
              </p>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-body text-gray-700 mb-4">
            可以使用多学的 <span className="font-bold text-green-600">{extraGroups} 组</span> 补之前的空缺：
          </p>

          {eligibleDates.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded border border-gray-200">
              <p className="text-small text-gray-500">
                最近 7 天内没有可补卡的日期
              </p>
              <p className="text-tiny text-gray-400 mt-2">
                继续保持每天学习吧！
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {eligibleDates.map((date) => (
                <div
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`p-4 rounded border-2 cursor-pointer transition-all ${
                    selectedDate === date
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Radio Button */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedDate === date
                            ? 'border-green-500 bg-green-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedDate === date && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>

                      {/* Date Info */}
                      <div>
                        <div className="text-body text-gray-900 font-medium">
                          {formatDate(date)}
                        </div>
                        <div className="text-tiny text-gray-500">
                          {getDaysAgo(date)}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="px-2 py-1 bg-gray-100 text-gray-600 text-tiny rounded">
                      未学习
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-300 flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded font-medium text-body hover:bg-gray-50 transition-colors"
          >
            跳过
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedDate}
            className="flex-1 py-3 bg-green-600 text-white rounded font-medium text-body hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认补卡
          </button>
        </div>
      </div>
    </div>
  );
};
