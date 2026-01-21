import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { CheckInCalendar } from '../components/CheckInCalendar'; // ✅ Check-in calendar

export const Today = () => {
  const navigate = useNavigate();
  const {
    profile,
    getActiveWords,
    learnState,
    startLearning,
    startReviewPhase,
    readingState,
    resetSession,
    showToast,
    getTotalCheckInDays // ✅ Get total check-in days
  } = useStore();
  const words = getActiveWords(); // ✅ Only show non-deleted words

  // Calculate today's tasks
  const unlearnedWords = words.filter(w => !w.learned);
  const wordsToLearn = unlearnedWords.slice(0, 5);

  // Words due for review today
  const isDueForReview = (word: typeof words[0]): boolean => {
    // Only review words that have at least one sentence
    if (!word.userSentences || word.userSentences.length === 0) return false;
    if (!word.nextReviewDate) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reviewDate = new Date(word.nextReviewDate);
    reviewDate.setHours(0, 0, 0, 0);

    return today >= reviewDate;
  };

  const wordsToReview = words.filter(isDueForReview);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Calculate progress (out of 7 tasks per day)
  // ✅ Check if today's planned words are all learned (not if there are no more unlearned words)
  const todayWordsAllLearned = wordsToLearn.every(w => w.learned);

  const tasksCompleted = [
    todayWordsAllLearned,  // ✅ Today's 5 words are all learned
    wordsToReview.length === 0,  // ✅ No reviews due today
  ].filter(Boolean).length;
  const totalTasks = 2;

  // Check if there's an active learning session in progress
  const hasActiveSession = learnState.currentStep === 'learning' && learnState.learningQueue.length > 0;
  const sessionProgress = hasActiveSession
    ? `Word ${learnState.currentWordIndex + 1}/${learnState.learningQueue.length}`
    : '';

  const handleStartLearning = () => {
    if (wordsToLearn.length === 0) {
      showToast('No words to learn today. Add some words in Library!', 'info');
      return;
    }
    // Use the specific words shown on Today page to ensure consistency
    const { startLearningWithWords } = useStore.getState();
    startLearningWithWords(wordsToLearn.map(w => w.id));
    navigate('/learn');
  };

  const handleResumeLearning = () => {
    // Resume learning session without resetting state
    navigate('/learn');
  };

  const handleEndSession = () => {
    // Actually end the learning session and clear all data
    resetSession();
    showToast('Session ended', 'info');
  };

  const handleStartReview = () => {
    if (wordsToReview.length === 0) {
      showToast('No reviews due today. Great work!', 'success');
      return;
    }
    navigate('/review');
  };

  const handleOpenReading = () => {
    if (readingState.articles.length === 0) {
      navigate('/library?tab=articles');
    } else {
      navigate('/library?tab=articles');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 pb-24">
      {/* Greeting Header */}
      <header className="mb-6">
        <h1 className="text-h1 text-gray-900 mb-2">
          {getGreeting()}{profile.name ? `, ${profile.name}` : ''}
        </h1>
        <p className="text-body text-gray-500">
          Your learning plan for today
        </p>
      </header>

      {/* Study Streak Card - Prominent position */}
      <div className="mb-8">
        <CheckInCalendar
          checkInHistory={profile.checkInHistory || []}
          totalDays={getTotalCheckInDays()}
        />
      </div>

      {/* Action Buttons - Modern button style */}
      <div className="grid gap-3 mb-8">
        {/* Learn Button */}
        <button
          onClick={hasActiveSession ? handleResumeLearning : (wordsToLearn.length > 0 ? handleStartLearning : () => navigate('/library'))}
          className={`group relative overflow-hidden rounded-xl p-5 text-left transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
            hasActiveSession
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-200'
              : wordsToLearn.length > 0
              ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200'
              : 'bg-white border-2 border-dashed border-gray-300 text-gray-600 hover:border-gray-400'
          }`}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{hasActiveSession ? '▶️' : wordsToLearn.length > 0 ? '📚' : '➕'}</span>
                <h3 className="text-h3 font-bold">
                  {hasActiveSession ? 'Resume Learning' : wordsToLearn.length > 0 ? 'Learn New Words' : 'Add Words'}
                </h3>
              </div>
              {(hasActiveSession || wordsToLearn.length > 0) && (
                <span className={`px-3 py-1 rounded-full text-tiny font-bold ${
                  hasActiveSession ? 'bg-white/20' : 'bg-white/30'
                }`}>
                  {hasActiveSession ? sessionProgress : `${wordsToLearn.length} words`}
                </span>
              )}
            </div>

            {hasActiveSession ? (
              <div>
                <p className="text-sm opacity-90 mb-2">
                  {learnState.learningQueue.map(w => w.text).join(', ')}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEndSession();
                  }}
                  className="text-tiny text-white/70 hover:text-white underline"
                >
                  ✕ End Session
                </button>
              </div>
            ) : wordsToLearn.length > 0 ? (
              <p className="text-sm opacity-90">
                {wordsToLearn.map(w => w.text).join(', ')}
              </p>
            ) : (
              <p className="text-sm">
                Go to Library to select words to learn
              </p>
            )}
          </div>
        </button>

        {/* Review Button */}
        <button
          onClick={wordsToReview.length > 0 ? handleStartReview : undefined}
          disabled={wordsToReview.length === 0}
          className={`group relative overflow-hidden rounded-xl p-5 text-left transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
            wordsToReview.length > 0
              ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-lg shadow-orange-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{wordsToReview.length > 0 ? '🔄' : '✓'}</span>
                <h3 className="text-h3 font-bold">Review Words</h3>
              </div>
              {wordsToReview.length > 0 && (
                <span className="px-3 py-1 bg-white/30 rounded-full text-tiny font-bold">
                  {wordsToReview.length} words
                </span>
              )}
            </div>

            <p className="text-sm opacity-90">
              {wordsToReview.length > 0
                ? `${wordsToReview.slice(0, 3).map(w => w.text).join(', ')}${wordsToReview.length > 3 ? '...' : ''}`
                : 'No reviews due today. Great work!'
              }
            </p>
          </div>
        </button>

        {/* Reading Button */}
        <button
          onClick={handleOpenReading}
          className="group relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-cyan-400 to-blue-500 text-white text-left shadow-lg shadow-cyan-200 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📖</span>
                <h3 className="text-h3 font-bold">Reading Practice</h3>
              </div>
              {readingState.articles.length > 0 && (
                <span className="px-3 py-1 bg-white/30 rounded-full text-tiny font-bold">
                  {readingState.articles.length} articles
                </span>
              )}
            </div>

            <p className="text-sm opacity-90">
              {readingState.articles.length > 0
                ? readingState.articles[0].title
                : 'Add articles to practice reading'
              }
            </p>
          </div>
        </button>
      </div>

      {/* Progress & Stats Section */}
      <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200 p-6">
        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-body font-bold text-gray-900">Today's Progress</h3>
            <span className="text-h3 font-bold text-green-600">
              {tasksCompleted}/{totalTasks}
            </span>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: totalTasks }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-all ${
                  i < tasksCompleted
                    ? 'bg-gradient-to-r from-green-400 to-green-600'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
            <p className="text-3xl font-bold text-green-600">{words.filter(w => w.learned).length}</p>
            <p className="text-tiny text-gray-500 mt-1 uppercase tracking-wide">Learned</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
            <p className="text-3xl font-bold text-blue-600">{words.length}</p>
            <p className="text-tiny text-gray-500 mt-1 uppercase tracking-wide">Total</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
            <p className="text-3xl font-bold text-purple-600">{readingState.articles.length}</p>
            <p className="text-tiny text-gray-500 mt-1 uppercase tracking-wide">Articles</p>
          </div>
        </div>
      </div>
    </div>
  );
};
