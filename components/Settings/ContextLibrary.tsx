import React, { useState } from 'react';
import { useStore } from '../../store';

export const ContextLibrary: React.FC = () => {
  const { profile, addSavedContext, removeSavedContext, showToast } = useStore();
  const [newContext, setNewContext] = useState('');

  const handleAddContext = () => {
    if (!newContext.trim()) {
      showToast('Please enter a context scenario.', 'warning');
      return;
    }
    addSavedContext(newContext.trim());
    setNewContext('');
    showToast('Context added successfully', 'success');
  };

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-h2 text-gray-900">Context Library</h2>
        <p className="text-small text-gray-500">Reusable scenarios for your daily practice</p>
      </header>

      {/* Add New Context Input */}
      <div className="bg-white p-4 rounded border border-gray-300">
        <label className="block text-small font-medium text-gray-700 mb-2">Add New Context</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newContext}
            onChange={(e) => setNewContext(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddContext()}
            placeholder="e.g. I'm heading to the gym after work"
            className="flex-1 px-3 py-2 border border-gray-300 rounded text-small outline-none focus:border-gray-500"
          />
          <button
            onClick={handleAddContext}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded text-small font-medium transition-colors whitespace-nowrap"
          >
            Add
          </button>
        </div>
      </div>

      {/* Context Cards */}
      {profile.savedContexts && profile.savedContexts.length > 0 ? (
        <div className="grid grid-cols-1 gap-2">
          {profile.savedContexts.map((ctx) => (
            <div
              key={ctx.id}
              className="bg-white p-4 rounded border border-gray-300 flex justify-between items-center hover:bg-gray-50 transition-colors"
            >
              <p className="text-small text-gray-700 line-clamp-2 flex-1">{ctx.text}</p>
              <button
                type="button"
                onClick={() => removeSavedContext(ctx.id)}
                className="ml-4 text-gray-400 hover:text-red-600 transition-colors"
                aria-label="Delete context"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-100 rounded border border-gray-300">
          <p className="text-gray-500 text-small">No saved contexts yet. Add one above!</p>
        </div>
      )}
    </section>
  );
};
