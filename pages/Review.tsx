import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import ReviewWord from '../components/ReviewWord';
import ClickableText from '../components/ClickableText';
import DictionaryModal from '../components/DictionaryModal';

export const Review = () => {
  const { words, updateReviewStats } = useStore();
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);

  // Get words that need review (have sentences but not mastered)
  const reviewWords = useMemo(() => {
    return words.filter(w =>
      w.userSentence &&
      w.userSentenceTranslation &&
      (!w.reviewStats || w.reviewStats.skipped || w.reviewStats.retryCount >= 2)
    );
  }, [words]);

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
            <p className="text-slate-500 max-w-sm">
              No words to review right now. Come back later or create more sentences in the Learn section.
            </p>
          </div>
        ) : (
          // Word list
          <div className="max-w-2xl mx-auto space-y-3">
            {/* Stats */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-slate-500">{reviewWords.length} words to review</span>
              <button
                onClick={() => setCurrentWordIndex(0)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors"
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
