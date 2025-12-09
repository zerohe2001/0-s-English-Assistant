import React, { useState } from 'react';

interface TabsProps {
  children: React.ReactNode;
  defaultTab?: string;
}

interface TabListProps {
  children: React.ReactNode;
}

interface TabProps {
  id: string;
  children: React.ReactNode;
}

interface TabPanelProps {
  id: string;
  children: React.ReactNode;
}

// Context to share active tab state
const TabsContext = React.createContext<{
  activeTab: string;
  setActiveTab: (id: string) => void;
}>({ activeTab: '', setActiveTab: () => {} });

export const Tabs: React.FC<TabsProps> = ({ children, defaultTab = '' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="space-y-6">{children}</div>
    </TabsContext.Provider>
  );
};

export const TabList: React.FC<TabListProps> = ({ children }) => {
  return (
    <div className="flex gap-2 border-b border-gray-300 mb-6">
      {children}
    </div>
  );
};

export const Tab: React.FC<TabProps> = ({ id, children }) => {
  const { activeTab, setActiveTab } = React.useContext(TabsContext);
  const isActive = activeTab === id;

  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 text-small font-medium border-b transition-colors ${
        isActive
          ? 'border-gray-900 text-gray-900'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
};

export const TabPanel: React.FC<TabPanelProps> = ({ id, children }) => {
  const { activeTab } = React.useContext(TabsContext);

  if (activeTab !== id) return null;

  return <div className="animate-fade-in">{children}</div>;
};
