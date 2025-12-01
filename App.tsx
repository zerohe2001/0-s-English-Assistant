
import React, { PropsWithChildren } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Settings } from './pages/Settings';
import { Vocabulary } from './pages/Vocabulary';
import { Learn } from './pages/Learn';
import { Review } from './pages/Review';
import { useStore } from './store';
import DictionaryModal from './components/DictionaryModal';

const NavLink = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-primary' : 'text-slate-400'}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
};

const Layout = ({ children }: PropsWithChildren) => {
  return (
    <div className="h-full flex flex-col bg-slate-50 relative">
      <main className="flex-1 overflow-y-auto no-scrollbar content-with-nav">
        {children}
      </main>
      {/* Fixed bottom navigation - 4 tabs */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center px-2 z-50 safe-bottom-nav shadow-lg">
        <NavLink
          to="/"
          label="Learn"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
        />
        <NavLink
          to="/review"
          label="Review"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
        />
        <NavLink
          to="/vocab"
          label="Words"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
        />
        <NavLink
          to="/settings"
          label="Profile"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
        />
      </nav>
      <DictionaryModal />
    </div>
  );
};

// Check if API key is present
const ApiKeyGuard = ({ children }: PropsWithChildren) => {
  if (!process.env.API_KEY) {
    return (
      <div className="flex items-center justify-center h-full p-6 text-center">
        <div className="bg-red-50 p-6 rounded-xl border border-red-200">
          <h2 className="text-xl font-bold text-red-600 mb-2">Missing API Key</h2>
          <p className="text-red-800">This app requires a valid Google Gemini API Key in <code>process.env.API_KEY</code> to function.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

const ProfileGuard = ({ children }: PropsWithChildren) => {
    const { isProfileSet } = useStore();
    if (!isProfileSet) {
        return <Navigate to="/settings" replace />;
    }
    return <>{children}</>;
}

export default function App() {
  return (
    <HashRouter>
        <ApiKeyGuard>
            <Layout>
                <Routes>
                <Route path="/" element={
                    <ProfileGuard>
                        <Learn />
                    </ProfileGuard>
                } />
                <Route path="/review" element={<Review />} />
                <Route path="/vocab" element={<Vocabulary />} />
                <Route path="/settings" element={<Settings />} />
                </Routes>
            </Layout>
        </ApiKeyGuard>
    </HashRouter>
  );
}
