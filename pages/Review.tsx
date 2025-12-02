import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import ReviewWord from '../components/ReviewWord';
import ClickableText from '../components/ClickableText';
import DictionaryModal from '../components/DictionaryModal';

export const Review = () => {
  const { words, updateReviewStats } = useStore();
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);

  // ✅ Helper: Check if word should be reviewed today
  const isDueForReview = (word: typeof words[0]): boolean => {
    // Must have sentence
    if (!word.userSentence || !word.userSentenceTranslation) return false;

    // No review date set → needs first review
    if (!word.nextReviewDate) return true;

    // Check if today >= nextReviewDate
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reviewDate = new Date(word.nextReviewDate);
    reviewDate.setHours(0, 0, 0, 0);

    return today >= reviewDate;
  };

  // Get words due for review today
  const reviewWords = useMemo(() => {
    return words.filter(isDueForReview);
  }, [words]);

  // Stats
  const totalWithSentences = words.filter(w => w.userSentence).length;
  const masteredWords = words.filter(w =>
    w.userSentence &&
    w.nextReviewDate &&
    new Date(w.nextReviewDate) > new Date()
  ).length;

  const handleReviewComplete = (stats: { retryCount: number, skipped: boolean }) => {
    if (currentWordIndex === null) return;

    const currentWord = reviewWords[currentWordIndex];
    updateReviewStats(currentWord.id, stats);

    // Move to next word or finish
    if (currentWordIndex < reviewWords.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      setCurrentWordIndex(null);
    }
  };

  // Review mode
  if (currentWordIndex !== null && reviewWords[currentWordIndex]) {
    const word = reviewWords[currentWordIndex];
    return (
      <>
        <ReviewWord
          word={word.text}
          originalSentence={word.userSentence!}
          chineseTranslation={word.userSentenceTranslation!}
          onNext={handleReviewComplete}
        />
        <DictionaryModal />
      </>
    );
  }

  // List mode - Notion style
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-8 pt-8 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 bg-slate-900 rounded-full"></div>
          <h1 className="text-3xl font-bold text-slate-900">Review</h1>
        </div>
        <p className="text-slate-500 text-sm">Practice your sentences</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {reviewWords.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">✨</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">All caught up!</h2>
            <p className="text-slate-500 max-w-sm mb-4">
              No words to review today. Come back tomorrow!
            </p>
            {/* Stats when all caught up */}
            {totalWithSentences > 0 && (
              <div className="flex gap-4 text-sm text-slate-400 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{masteredWords} mastered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                  <span>{totalWithSentences} total</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Word list
          <div className="max-w-2xl mx-auto space-y-3">
            {/* Stats Bar */}
            <div className="flex items-center justify-between mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-2xl font-bold text-slate-900">{reviewWords.length}</div>
                  <div className="text-xs text-slate-500">due today</div>
                </div>
                {masteredWords > 0 && (
                  <div className="pl-6 border-l border-slate-300">
                    <div className="text-lg font-semibold text-green-600">{masteredWords}</div>
                    <div className="text-xs text-slate-500">mastered</div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setCurrentWordIndex(0)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Start Review
              </button>
            </div>

            {/* Word cards */}
            {reviewWords.map((word, idx) => (
              <div
                key={word.id}
                className="p-5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors cursor-pointer"
                onClick={() => setCurrentWordIndex(idx)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-slate-900">{word.text}</span>
                      {word.reviewStats && (
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          word.reviewStats.skipped
                            ? 'bg-orange-100 text-orange-700'
                            : word.reviewStats.retryCount >= 2
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {word.reviewStats.skipped
                            ? 'Skipped'
                            : `${word.reviewStats.retryCount + 1} attempts`
                          }
                        </span>
                      )}
                    </div>

                    {/* Sentences */}
                    <div className="space-y-2 text-sm">
                      {word.userSentenceTranslation && (
                        <div className="text-slate-600">
                          <ClickableText text={word.userSentenceTranslation} />
                        </div>
                      )}
                      {word.userSentence && (
                        <div className="text-slate-400 text-xs">
                          <ClickableText text={word.userSentence} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg className="w-5 h-5 text-slate-300 flex-shrink-0 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DictionaryModal />
    </div>
  );
};
