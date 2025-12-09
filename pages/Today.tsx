import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';

export const Today = () => {
  const navigate = useNavigate();
  const { profile, words, learnState, startLearning, startReviewPhase, readingState, showToast } = useStore();

  // Calculate today's tasks
  const unlearnedWords = words.filter(w => !w.learned);
  const wordsToLearn = unlearnedWords.slice(0, 5);

  // Words due for review today
  const isDueForReview = (word: typeof words[0]): boolean => {
    if (!word.userSentence || !word.userSentenceTranslation) return false;
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
  const tasksCompleted = [
    wordsToLearn.length === 0,
    wordsToReview.length === 0,
  ].filter(Boolean).length;
  const totalTasks = 2;

  const handleStartLearning = () => {
    if (wordsToLearn.length === 0) {
      showToast('No words to learn today. Add some words in Library!', 'info');
      return;
    }
    startLearning();
    navigate('/learn');
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
      <header className="mb-8">
        <h1 className="text-h1 text-gray-900 mb-2">
          {getGreeting()}{profile.name ? `, ${profile.name}` : ''}
        </h1>
        <p className="text-body text-gray-500">
          Your learning plan for today
        </p>
      </header>

      {/* Task Cards */}
      <div className="space-y-2">
        {/* Learn New Words */}
        <div
          onClick={wordsToLearn.length > 0 ? handleStartLearning : () => navigate('/library')}
          className="bg-white border border-gray-300 rounded p-4 transition-colors cursor-pointer hover:bg-gray-50"
        >
          <div className="flex items-start justify-between mb-2">
            <h2 className="text-h3 text-gray-900">Learn</h2>
            {wordsToLearn.length > 0 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-tiny rounded">
                {wordsToLearn.length}
              </span>
            )}
          </div>

          {wordsToLearn.length > 0 ? (
            <p className="text-small text-gray-500">
              {wordsToLearn.map(w => w.text).join(', ')}
            </p>
          ) : (
            <div className="text-center py-2 px-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-small text-gray-500 mb-1">No words to learn</p>
              <p className="text-tiny text-gray-700 font-medium">
                Tap to add words in Library →
              </p>
            </div>
          )}
        </div>

        {/* Review Words */}
        <div
          onClick={wordsToReview.length > 0 ? handleStartReview : undefined}
          className={`bg-white border border-gray-300 rounded p-4 transition-colors ${
            wordsToReview.length > 0 ? 'cursor-pointer hover:bg-gray-50' : ''
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <h2 className="text-h3 text-gray-900">Review</h2>
            {wordsToReview.length > 0 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-tiny rounded">
                {wordsToReview.length}
              </span>
            )}
          </div>

          {wordsToReview.length > 0 ? (
            <p className="text-small text-gray-500">
              {`${wordsToReview.slice(0, 3).map(w => w.text).join(', ')}${wordsToReview.length > 3 ? '...' : ''}`}
            </p>
          ) : (
            <div className="text-center py-2 px-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-small text-gray-500">No reviews due today. Great work!</p>
            </div>
          )}
        </div>

        {/* Reading Practice */}
        <div
          onClick={handleOpenReading}
          className="bg-white border border-gray-300 rounded p-4 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="flex items-start justify-between mb-2">
            <h2 className="text-h3 text-gray-900">Reading</h2>
            {readingState.articles.length > 0 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-tiny rounded">
                {readingState.articles.length}
              </span>
            )}
          </div>

          <p className="text-small text-gray-500">
            {readingState.articles.length > 0
              ? readingState.articles[0].title
              : 'Add articles to practice listening'
            }
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mt-8 pt-6 border-t border-gray-300">
        <div className="flex items-center justify-between mb-2">
          <p className="text-small text-gray-500">Today's Progress</p>
          <p className="text-small text-gray-700 font-medium">
            {tasksCompleted}/{totalTasks}
          </p>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalTasks }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded ${
                i < tasksCompleted ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-h2 text-gray-900">{words.filter(w => w.learned).length}</p>
          <p className="text-tiny text-gray-500 mt-1">Learned</p>
        </div>
        <div className="text-center">
          <p className="text-h2 text-gray-900">{words.length}</p>
          <p className="text-tiny text-gray-500 mt-1">Total Words</p>
        </div>
        <div className="text-center">
          <p className="text-h2 text-gray-900">{readingState.articles.length}</p>
          <p className="text-tiny text-gray-500 mt-1">Articles</p>
        </div>
      </div>
    </div>
  );
};
