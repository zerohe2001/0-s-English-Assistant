
import React, { PropsWithChildren, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Settings } from './pages/Settings';
import { Today } from './pages/Today';
import { Library } from './pages/Library';
import { Vocabulary } from './pages/Vocabulary';
import { Learn } from './pages/Learn';
import { Review } from './pages/Review';
import { ReadingDetail } from './pages/ReadingDetail';
import { Auth } from './pages/Auth';
import { useStore } from './store';
import DictionaryModal from './components/DictionaryModal';
import ToastContainer from './components/ToastContainer';

const NavLink = ({ to, icon, label, badge }: { to: string; icon: React.ReactNode; label: string; badge?: number }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-[11px] font-medium">{label}</span>
    </Link>
  );
};

const Layout = ({ children }: PropsWithChildren) => {
  const { words } = useStore();

  // Calculate words due for review today
  const isDueForReview = (word: typeof words[0]): boolean => {
    if (!word.userSentences || word.userSentences.length === 0) return false;
    if (!word.nextReviewDate) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reviewDate = new Date(word.nextReviewDate);
    reviewDate.setHours(0, 0, 0, 0);

    return today >= reviewDate;
  };

  const reviewCount = words.filter(isDueForReview).length;

  return (
    <div className="h-full flex flex-col bg-white relative">
      <main className="flex-1 overflow-y-auto no-scrollbar content-with-nav">
        {children}
      </main>
      {/* Fixed bottom navigation - 3 tabs (Notion-style minimal) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 flex justify-around items-center px-2 z-50 safe-bottom-nav">
        <NavLink
          to="/"
          label="Today"
          badge={reviewCount}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
        />
        <NavLink
          to="/library"
          label="Library"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
        />
        <NavLink
          to="/me"
          label="Me"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
        />
      </nav>
      <DictionaryModal />
      <ToastContainer />
    </div>
  );
};

// Check if API key is present
const ApiKeyGuard = ({ children }: PropsWithChildren) => {
  if (!process.env.API_KEY) {
    return (
      <div className="flex items-center justify-center h-full p-6 text-center">
        <div className="bg-red-50 p-6 rounded border border-red-300">
          <h2 className="text-h2 text-red-600 mb-2">Missing API Key</h2>
          <p className="text-small text-red-800">This app requires a valid Google Gemini API Key in <code>process.env.API_KEY</code> to function.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

const ProfileGuard = ({ children }: PropsWithChildren) => {
    const { isProfileSet } = useStore();
    if (!isProfileSet) {
        return <Navigate to="/me" replace />;
    }
    return <>{children}</>;
}

const AuthGuard = ({ children }: PropsWithChildren) => {
  const { isAuthenticated, checkAuth } = useStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsChecking(false);
    };
    init();
  }, [checkAuth]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={() => checkAuth()} />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <HashRouter>
        <ApiKeyGuard>
          <AuthGuard>
            <Layout>
                <Routes>
                <Route path="/" element={
                    <ProfileGuard>
                        <Today />
                    </ProfileGuard>
                } />
                <Route path="/library" element={<Library />} />
                <Route path="/vocabulary" element={<Vocabulary />} />
                <Route path="/learn" element={
                    <ProfileGuard>
                        <Learn />
                    </ProfileGuard>
                } />
                <Route path="/review" element={<Review />} />
                <Route path="/reading/:articleId" element={<ReadingDetail />} />
                <Route path="/me" element={<Settings />} />
                </Routes>
            </Layout>
          </AuthGuard>
        </ApiKeyGuard>
    </HashRouter>
  );
}
