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
    <div className="flex gap-2 border-b border-slate-200 mb-6">
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
      className={`px-4 py-3 font-semibold text-sm transition-all relative ${
        isActive
          ? 'text-primary'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
      )}
    </button>
  );
};

export const TabPanel: React.FC<TabPanelProps> = ({ id, children }) => {
  const { activeTab } = React.useContext(TabsContext);

  if (activeTab !== id) return null;

  return <div className="animate-fade-in">{children}</div>;
};
