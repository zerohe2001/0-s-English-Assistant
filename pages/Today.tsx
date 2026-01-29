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

  // Words due for review today (must match Review.tsx logic)
  const isDueForReview = (word: typeof words[0]): boolean => {
    // Only review words that have at least one sentence
    if (!word.userSentences || word.userSentences.length === 0) return false;

    // Must be marked as learned AND have a review date
    if (!word.learned || !word.nextReviewDate) return false;

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

      {/* Action Buttons - Simple one-row layout */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {/* Learn Button */}
        <button
          onClick={hasActiveSession ? handleResumeLearning : (wordsToLearn.length > 0 ? handleStartLearning : () => navigate('/library'))}
          className={`py-3 px-4 rounded-lg text-center transition-all border font-medium text-small ${
            hasActiveSession
              ? 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100'
              : wordsToLearn.length > 0
              ? 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
              : 'bg-white border-gray-300 text-gray-400 hover:bg-gray-50'
          }`}
        >
          {hasActiveSession
            ? 'Resume'
            : wordsToLearn.length > 0
            ? `Learn (${wordsToLearn.length})`
            : 'Learn'
          }
        </button>

        {/* Review Button */}
        <button
          onClick={wordsToReview.length > 0 ? handleStartReview : undefined}
          disabled={wordsToReview.length === 0}
          className={`py-3 px-4 rounded-lg text-center transition-all border font-medium text-small ${
            wordsToReview.length > 0
              ? 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
              : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {wordsToReview.length > 0 ? `Review (${wordsToReview.length})` : 'Review'}
        </button>

        {/* Reading Button */}
        <button
          onClick={handleOpenReading}
          className="py-3 px-4 rounded-lg text-center bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 transition-all font-medium text-small"
        >
          {readingState.articles.length > 0 ? `Reading (${readingState.articles.length})` : 'Reading'}
        </button>
      </div>

    </div>
  );
};
