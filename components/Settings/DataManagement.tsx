import React from 'react';

export const DataManagement: React.FC = () => {
  // ✅ Export data to JSON file
  const handleExportData = () => {
    try {
      const data = localStorage.getItem('active-vocab-storage');
      if (!data) {
        alert('没有数据可以导出');
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

        if (!data.state || !data.state.profile) {
          throw new Error('Invalid data format');
        }

        if (!confirm('⚠️ 导入数据会覆盖当前所有数据，确定继续吗？')) {
          return;
        }

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

  // ✅ Clear all data
  const handleClearAllData = () => {
    if (!confirm('⚠️ 确定要清空所有数据吗？此操作无法撤销！\n\n包括：单词、学习记录、复习进度、Token统计')) {
      return;
    }

    if (!confirm('🚨 最后确认：真的要删除所有数据吗？建议先导出备份！')) {
      return;
    }

    localStorage.clear();
    alert('✅ 所有数据已清空，页面即将刷新...');
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <section className="space-y-6">
      {/* Data Backup */}
      <div className="space-y-4">
        <header>
          <h2 className="text-xl font-bold text-slate-900">Data Backup</h2>
          <p className="text-sm text-slate-500">Export and import your learning data</p>
        </header>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <button
            onClick={handleExportData}
            className="w-full py-3 bg-primary hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
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
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
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

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600">
            <div className="font-semibold mb-1">💡 Backup includes:</div>
            <div>• All vocabulary & learning progress</div>
            <div>• Review history & statistics</div>
            <div>• Profile & saved contexts</div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-4">
        <header>
          <h2 className="text-xl font-bold text-red-600">Danger Zone</h2>
          <p className="text-sm text-slate-500">Irreversible actions</p>
        </header>

        <div className="bg-red-50 p-6 rounded-xl border-2 border-red-200">
          <button
            onClick={handleClearAllData}
            className="w-full py-3 bg-white hover:bg-red-50 text-red-600 border-2 border-red-300 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
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
          <p className="text-xs text-red-600 mt-2 text-center">
            ⚠️ This will permanently delete all your data
          </p>
        </div>
      </div>
    </section>
  );
};
