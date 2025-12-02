
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { UserProfile } from '../types';

export const Settings = () => {
  const { profile, updateProfile, removeSavedContext, addSavedContext, tokenUsage, resetTokenUsage } = useStore();
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [newContext, setNewContext] = useState('');

  // ✅ Export data to JSON file
  const handleExportData = () => {
    try {
      // Get data from localStorage
      const data = localStorage.getItem('active-vocab-storage');
      if (!data) {
        alert('没有数据可以导出');
        return;
      }

      // Create blob and download
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `active-vocab-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('✅ 数据已导出！');
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    }
  };

  // ✅ Import data from JSON file
  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = async (e) => {
      try {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const text = await file.text();
        const data = JSON.parse(text);

        // Basic validation
        if (!data.state || !data.state.profile) {
          throw new Error('Invalid data format');
        }

        // Confirm before overwriting
        if (!confirm('⚠️ 导入数据会覆盖当前所有数据，确定继续吗？')) {
          return;
        }

        // Save to localStorage
        localStorage.setItem('active-vocab-storage', text);

        alert('✅ 数据导入成功！页面即将刷新...');
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        console.error('Import failed:', error);
        alert('❌ 导入失败：文件格式不正确或数据损坏');
      }
    };

    input.click();
  };

  // ✅ FIX: Sync formData when profile changes (especially savedContexts)
  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ✅ FIX: Preserve savedContexts when updating profile
    updateProfile({
      ...formData,
      savedContexts: profile.savedContexts || []
    });
    alert('Profile saved!');
  };

  const handleAddContext = () => {
    if (!newContext.trim()) {
      alert('Please enter a context scenario.');
      return;
    }
    addSavedContext(newContext.trim());
    setNewContext('');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-8 pb-24">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Your Profile</h1>
        <p className="text-slate-600 mt-2">ActiveVocab uses this to customize your examples.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Alex"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
            <input
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g. Shanghai"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Occupation</label>
            <input
              name="occupation"
              value={formData.occupation}
              onChange={handleChange}
              placeholder="e.g. Marketing Manager"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Hobbies / Interests</label>
          <textarea
            name="hobbies"
            value={formData.hobbies}
            onChange={handleChange}
            placeholder="e.g. Photography, Hiking, Coffee"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none h-24"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Frequent Places</label>
          <input
            name="frequentPlaces"
            value={formData.frequentPlaces}
            onChange={handleChange}
            placeholder="e.g. Gym, Library, Costco"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        <div className="pt-4">
          <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition">
            Save Profile
          </button>
        </div>
      </form>

      {/* Saved Contexts Section */}
      <section className="space-y-4">
          <header>
            <h2 className="text-xl font-bold text-slate-900">Saved Context Cards</h2>
            <p className="text-sm text-slate-500">Reusable scenarios for your daily practice.</p>
          </header>

          {/* Add New Context Input */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <label className="block text-sm font-medium text-slate-700">Add New Context</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newContext}
                onChange={(e) => setNewContext(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddContext()}
                placeholder="e.g. I'm heading to the gym after work"
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
              <button
                onClick={handleAddContext}
                className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-indigo-700 transition whitespace-nowrap"
              >
                Add
              </button>
            </div>
          </div>

          {profile.savedContexts && profile.savedContexts.length > 0 ? (
             <div className="grid grid-cols-1 gap-3">
                 {profile.savedContexts.map(ctx => (
                     <div key={ctx.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center group">
                         <p className="text-slate-700 line-clamp-2">{ctx.text}</p>
                         <button 
                            type="button"
                            onClick={() => removeSavedContext(ctx.id)}
                            className="ml-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            aria-label="Delete context"
                         >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                         </button>
                     </div>
                 ))}
             </div>
          ) : (
             <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
                 No saved contexts yet. Add one above or save from the Learn page!
             </div>
          )}
      </section>

      {/* Token Usage & Cost Section */}
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

      {/* Data Management Section */}
      <section className="space-y-4">
        <header>
          <h2 className="text-xl font-bold text-slate-900">数据管理</h2>
          <p className="text-sm text-slate-500">备份和恢复你的学习数据</p>
        </header>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          {/* Export Button */}
          <button
            onClick={handleExportData}
            className="w-full py-3 bg-primary hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            导出数据备份
          </button>

          {/* Import Button */}
          <button
            onClick={handleImportData}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            从备份导入数据
          </button>

          {/* Info text */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600">
            <div className="font-semibold mb-1">💡 使用说明：</div>
            <div>• 导出：下载包含所有单词、学习记录的JSON文件</div>
            <div>• 导入：从备份文件恢复数据（会覆盖当前数据）</div>
            <div>• 建议定期备份，换设备时可快速恢复</div>
          </div>
        </div>
      </section>
    </div>
  );
};
