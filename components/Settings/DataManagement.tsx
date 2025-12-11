import React from 'react';
import { useStore } from '../../store';

export const DataManagement: React.FC = () => {
  const { showToast } = useStore();

  // ✅ Export data to JSON file
  const handleExportData = () => {
    try {
      const data = localStorage.getItem('active-vocab-storage');
      if (!data) {
        showToast('没有数据可以导出', 'warning');
        return;
      }

      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `active-vocab-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('数据已导出！', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('导出失败，请重试', 'error');
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

        if (!data.state || !data.state.profile) {
          throw new Error('Invalid data format');
        }

        if (!confirm('⚠️ 导入数据会覆盖当前所有数据，确定继续吗？')) {
          return;
        }

        localStorage.setItem('active-vocab-storage', text);
        showToast('数据导入成功！页面即将刷新...', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        console.error('Import failed:', error);
        showToast('导入失败：文件格式不正确或数据损坏', 'error');
      }
    };

    input.click();
  };

  // ✅ Clear translation cache only (fix "." bug)
  const handleClearTranslationCache = () => {
    if (!confirm('🧹 清除翻译缓存？\n\n这会删除所有单词的缓存翻译，但保留学习进度和个人资料。\n\n下次查看单词时会重新生成翻译。')) {
      return;
    }

    try {
      const storageKey = 'active-vocab-storage';
      const data = localStorage.getItem(storageKey);

      if (!data) {
        showToast('没有缓存数据需要清除', 'warning');
        return;
      }

      const parsedData = JSON.parse(data);

      // Clear only wordExplanations, keep everything else
      if (parsedData.state?.learnState?.wordExplanations) {
        parsedData.state.learnState.wordExplanations = {};
        localStorage.setItem(storageKey, JSON.stringify(parsedData));
        showToast('✅ 翻译缓存已清除！页面即将刷新...', 'success');
        setTimeout(() => window.location.reload(), 800);
      } else {
        showToast('没有翻译缓存需要清除', 'warning');
      }
    } catch (error) {
      console.error('Clear cache failed:', error);
      showToast('清除失败，请重试', 'error');
    }
  };

  // ✅ Clear all data
  const handleClearAllData = () => {
    if (!confirm('⚠️ 确定要清空所有数据吗？此操作无法撤销！\n\n包括：单词、学习记录、复习进度、Token统计')) {
      return;
    }

    if (!confirm('🚨 最后确认：真的要删除所有数据吗？建议先导出备份！')) {
      return;
    }

    localStorage.clear();
    showToast('所有数据已清空，页面即将刷新...', 'success');
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <section className="space-y-6">
      {/* Data Backup */}
      <div className="space-y-4">
        <header>
          <h2 className="text-h2 text-gray-900">Data Backup</h2>
          <p className="text-small text-gray-500">Export and import your learning data</p>
        </header>

        <div className="bg-white p-6 rounded border border-gray-300 space-y-3">
          <button
            onClick={handleExportData}
            className="w-full py-2 bg-gray-900 hover:bg-gray-700 text-white rounded text-small font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export Backup
          </button>

          <button
            onClick={handleImportData}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-small font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Import Backup
          </button>

          <div className="bg-gray-100 p-3 rounded border border-gray-300 text-tiny text-gray-700">
            <div className="font-semibold mb-1">Backup includes:</div>
            <div>• All vocabulary & learning progress</div>
            <div>• Review history & statistics</div>
            <div>• Profile & saved contexts</div>
          </div>
        </div>
      </div>

      {/* Cache Management */}
      <div className="space-y-4">
        <header>
          <h2 className="text-h2 text-gray-900">Cache Management</h2>
          <p className="text-small text-gray-500">Clear cached data to fix display issues</p>
        </header>

        <div className="bg-blue-50 p-6 rounded border border-blue-300 space-y-3">
          <button
            onClick={handleClearTranslationCache}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-small font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            🧹 清除翻译缓存
          </button>

          <div className="bg-white p-3 rounded border border-blue-200 text-tiny text-gray-700">
            <div className="font-semibold mb-1 text-blue-700">什么时候需要清除？</div>
            <div>• 看到翻译显示为 "." 或其他符号</div>
            <div>• 翻译显示异常或不完整</div>
            <div>• 更新后需要重新加载数据</div>
            <div className="mt-2 text-gray-500">✅ 不会删除学习进度和个人资料</div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-4">
        <header>
          <h2 className="text-h2 text-red-600">Danger Zone</h2>
          <p className="text-small text-gray-500">Irreversible actions</p>
        </header>

        <div className="bg-red-50 p-6 rounded border border-red-300">
          <button
            onClick={handleClearAllData}
            className="w-full py-2 bg-white hover:bg-red-50 text-red-600 border border-red-300 rounded text-small font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Clear All Data
          </button>
          <p className="text-tiny text-red-600 mt-2 text-center">
            This will permanently delete all your data
          </p>
        </div>
      </div>
    </section>
  );
};
