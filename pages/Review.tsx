import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import ReviewWord from '../components/ReviewWord';
import ClickableText from '../components/ClickableText';
import DictionaryModal from '../components/DictionaryModal';

export const Review = () => {
  const { words, updateReviewStats } = useStore();
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);

  // Check if word should be reviewed today
  const isDueForReview = (word: typeof words[0]): boolean => {
    if (!word.userSentence || !word.userSentenceTranslation) return false;
    if (!word.nextReviewDate) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reviewDate = new Date(word.nextReviewDate);
    reviewDate.setHours(0, 0, 0, 0);

    return today >= reviewDate;
  };

  const reviewWords = useMemo(() => {
    return words.filter(isDueForReview);
  }, [words]);

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

  // List mode
  return (
    <div className="max-w-2xl mx-auto px-6 py-8 pb-24">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-h1 text-gray-900">Review</h1>
        <p className="text-body text-gray-500 mt-2">Practice your sentences</p>
      </header>

      {reviewWords.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h2 className="text-h2 text-gray-900 mb-2">All caught up</h2>
          <p className="text-small text-gray-500 max-w-sm mb-4">
            No words to review today. Come back tomorrow!
          </p>
          {totalWithSentences > 0 && (
            <div className="flex gap-6 text-tiny text-gray-500 mt-4">
              <span>{masteredWords} mastered</span>
              <span>{totalWithSentences} total</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats Bar */}
          <div className="flex items-center justify-between p-4 bg-white border border-gray-300 rounded">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-h2 text-gray-900">{reviewWords.length}</div>
                <div className="text-tiny text-gray-500">due today</div>
              </div>
              {masteredWords > 0 && (
                <div className="pl-6 border-l border-gray-300">
                  <div className="text-h3 text-gray-900">{masteredWords}</div>
                  <div className="text-tiny text-gray-500">mastered</div>
                </div>
              )}
            </div>
            <button
              onClick={() => setCurrentWordIndex(0)}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-small font-medium rounded transition-colors"
            >
              Start Review
            </button>
          </div>

          {/* Word cards */}
          <div className="space-y-2">
            {reviewWords.map((word, idx) => (
              <div
                key={word.id}
                className="p-4 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setCurrentWordIndex(idx)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">{word.text}</span>
                      {word.reviewStats && word.reviewStats.retryCount > 0 && (
                        <span className="px-2 py-0.5 text-tiny text-gray-500 bg-gray-100 rounded">
                          {word.reviewStats.retryCount + 1} attempts
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-small">
                      {word.userSentenceTranslation && (
                        <div className="text-gray-700">
                          {word.userSentenceTranslation}
                        </div>
                      )}
                      {word.userSentence && (
                        <div className="text-gray-500 text-tiny">
                          <ClickableText text={word.userSentence} />
                        </div>
                      )}
                    </div>
                  </div>

                  <svg className="w-5 h-5 text-gray-300 flex-shrink-0 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DictionaryModal />
    </div>
  );
};
