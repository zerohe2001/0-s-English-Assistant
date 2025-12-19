import React from 'react';
import { useStore } from '../../store';
import { useNavigate } from 'react-router-dom';

export const AccountSection = () => {
  const { user, logout, showToast, isSyncing } = useStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out? Your data will remain in the cloud.')) {
      await logout();
      showToast('Signed out successfully', 'success');
      navigate('/');
    }
  };

  return (
    <section className="bg-white border border-gray-300 rounded p-6">
      <h2 className="text-h3 text-gray-900 mb-4">Account</h2>

      <div className="space-y-4">
        {/* User Email */}
        <div>
          <label className="block text-small font-medium text-gray-700 mb-1">
            Email
          </label>
          <div className="text-body text-gray-900">
            {user?.email || 'Not available'}
          </div>
        </div>

        {/* Sync Status */}
        <div>
          <label className="block text-small font-medium text-gray-700 mb-1">
            Sync Status
          </label>
          <div className="flex items-center gap-2">
            {isSyncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                <span className="text-small text-gray-600">Syncing...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-small text-gray-600">Synced</span>
              </>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="pt-4 border-t border-gray-300">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded text-small font-medium transition-colors"
          >
            Sign Out
          </button>
          <p className="text-tiny text-gray-500 mt-2 text-center">
            Your data is safely stored in the cloud
          </p>
        </div>
      </div>
    </section>
  );
};
