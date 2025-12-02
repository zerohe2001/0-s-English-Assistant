import React from 'react';
import { useStore } from '../../store';

export const APIUsage: React.FC = () => {
  const { tokenUsage, resetTokenUsage } = useStore();

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-bold text-slate-900">API Usage & Cost</h2>
        <p className="text-sm text-slate-500">Claude Haiku 3.5 token consumption tracking</p>
      </header>

      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-100 shadow-sm">
        {/* Total Cost - Big Display */}
        <div className="text-center mb-6">
          <div className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-2">Total Cost</div>
          <div className="text-5xl font-bold text-indigo-900">
            ${tokenUsage.totalCost.toFixed(4)}
          </div>
          <div className="text-xs text-indigo-500 mt-2">USD</div>
        </div>

        {/* Token Breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/70 backdrop-blur p-4 rounded-lg border border-indigo-100">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Input Tokens</div>
            <div className="text-2xl font-bold text-slate-900">{tokenUsage.inputTokens.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">
              ${((tokenUsage.inputTokens / 1000000) * 0.80).toFixed(4)}
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur p-4 rounded-lg border border-indigo-100">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Output Tokens</div>
            <div className="text-2xl font-bold text-slate-900">{tokenUsage.outputTokens.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">
              ${((tokenUsage.outputTokens / 1000000) * 4.00).toFixed(4)}
            </div>
          </div>
        </div>

        {/* Pricing Info */}
        <div className="bg-white/50 backdrop-blur p-3 rounded-lg border border-indigo-100 text-xs text-slate-600">
          <div className="font-semibold mb-1">Claude Haiku 3.5 Pricing:</div>
          <div>• Input: $0.80 per million tokens</div>
          <div>• Output: $4.00 per million tokens</div>
        </div>

        {/* Reset Button */}
        <button
          onClick={() => {
            if (confirm('确定要重置token使用统计吗？此操作无法撤销。')) {
              resetTokenUsage();
            }
          }}
          className="mt-4 w-full py-2 bg-white/70 hover:bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
        >
          Reset Statistics
        </button>
      </div>
    </section>
  );
};
