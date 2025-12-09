import React from 'react';
import { useStore } from '../../store';

export const APIUsage: React.FC = () => {
  const { tokenUsage, resetTokenUsage, showToast } = useStore();

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-h2 text-gray-900">API Usage & Cost</h2>
        <p className="text-small text-gray-500">Claude Haiku 3.5 token consumption tracking</p>
      </header>

      <div className="bg-white p-6 rounded border border-gray-300">
        {/* Total Cost - Big Display */}
        <div className="text-center mb-6">
          <div className="text-tiny text-gray-500 uppercase tracking-wide mb-2">Total Cost</div>
          <div className="text-5xl font-bold text-gray-900">
            ${tokenUsage.totalCost.toFixed(4)}
          </div>
          <div className="text-tiny text-gray-500 mt-2">USD</div>
        </div>

        {/* Token Breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-100 p-4 rounded border border-gray-300">
            <div className="text-tiny text-gray-500 uppercase mb-1">Input Tokens</div>
            <div className="text-2xl font-bold text-gray-900">{tokenUsage.inputTokens.toLocaleString()}</div>
            <div className="text-tiny text-gray-500 mt-1">
              ${((tokenUsage.inputTokens / 1000000) * 0.80).toFixed(4)}
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded border border-gray-300">
            <div className="text-tiny text-gray-500 uppercase mb-1">Output Tokens</div>
            <div className="text-2xl font-bold text-gray-900">{tokenUsage.outputTokens.toLocaleString()}</div>
            <div className="text-tiny text-gray-500 mt-1">
              ${((tokenUsage.outputTokens / 1000000) * 4.00).toFixed(4)}
            </div>
          </div>
        </div>

        {/* Pricing Info */}
        <div className="bg-gray-100 p-3 rounded border border-gray-300 text-tiny text-gray-700">
          <div className="font-semibold mb-1">Claude Haiku 3.5 Pricing:</div>
          <div>• Input: $0.80 per million tokens</div>
          <div>• Output: $4.00 per million tokens</div>
        </div>

        {/* Reset Button */}
        <button
          onClick={() => {
            if (window.confirm('确定要重置token使用统计吗？此操作无法撤销。')) {
              resetTokenUsage();
              showToast('统计已重置', 'success');
            }
          }}
          className="mt-4 w-full py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded text-small font-medium transition-colors"
        >
          Reset Statistics
        </button>
      </div>
    </section>
  );
};
