import React from 'react';
import { Tabs, TabList, Tab, TabPanel } from '../components/Settings/Tabs';
import { ProfileSection } from '../components/Settings/ProfileSection';
import { ContextLibrary } from '../components/Settings/ContextLibrary';
import { DataManagement } from '../components/Settings/DataManagement';
import { APIUsage } from '../components/Settings/APIUsage';

export const Settings = () => {
  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-2">Manage your profile, data, and usage</p>
      </header>

      {/* Tab Navigation */}
      <Tabs defaultTab="profile">
        <TabList>
          <Tab id="profile">👤 Profile</Tab>
          <Tab id="system">⚙️ System</Tab>
          <Tab id="usage">📊 Usage</Tab>
        </TabList>

        {/* Profile Tab */}
        <TabPanel id="profile">
          <div className="space-y-8">
            <ProfileSection />
            <ContextLibrary />
          </div>
        </TabPanel>

        {/* System Tab */}
        <TabPanel id="system">
          <DataManagement />
        </TabPanel>

        {/* Usage Tab */}
        <TabPanel id="usage">
          <APIUsage />
        </TabPanel>
      </Tabs>
    </div>
  );
};
