import React, { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import ReviewWord from '../components/ReviewWord';
import ClickableText from '../components/ClickableText';
import DictionaryModal from '../components/DictionaryModal';

export const Review = () => {
  const navigate = useNavigate();
  const {
    getActiveWords,
    updateReviewStats,
    reviewState,
    startReviewSession,
    exitReviewSession
  } = useStore();

  const words = getActiveWords(); // ✅ Only show non-deleted words

  // Check if word should be reviewed today
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

  const reviewWords = useMemo(() => {
    return words.filter(isDueForReview);
  }, [words]);

  const totalWithSentences = words.filter(w => w.userSentences && w.userSentences.length > 0).length;
  const masteredWords = words.filter(w =>
    w.userSentences && w.userSentences.length > 0 &&
    w.nextReviewDate &&
    new Date(w.nextReviewDate) > new Date()
  ).length;

  const reviewDebug = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueExcluded: Array<{
      id: string;
      text: string;
      learned: boolean;
      hasSentences: boolean;
      hasNextReviewDate: boolean;
      reviewDateISO: string | null;
    }> = [];
    let overdueExcludedCount = 0;

    words.forEach(word => {
      const hasSentences = !!(word.userSentences && word.userSentences.length > 0);
      const learned = !!word.learned;
      const hasNextReviewDate = !!word.nextReviewDate;
      const reviewDate = hasNextReviewDate ? new Date(word.nextReviewDate as string) : null;
      if (reviewDate) {
        reviewDate.setHours(0, 0, 0, 0);
      }
      const isOverdue = !!reviewDate && reviewDate < today;
      const shouldReview = hasSentences && learned && hasNextReviewDate && !!reviewDate && reviewDate <= today;

      if (isOverdue && !shouldReview) {
        overdueExcludedCount += 1;
        if (overdueExcluded.length < 3) {
          overdueExcluded.push({
            id: word.id,
            text: word.text,
            learned,
            hasSentences,
            hasNextReviewDate,
            reviewDateISO: reviewDate ? reviewDate.toISOString() : null
          });
        }
      }
    });

    return {
      reviewWordsCount: reviewWords.length,
      totalWords: words.length,
      overdueExcludedCount,
      overdueExcluded
    };
  }, [words, reviewWords.length]);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/34db8039-d717-47fe-916b-d095ceab83aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pages/Review.tsx:88',message:'review debug snapshot',data:reviewDebug,timestamp:Date.now(),sessionId:'debug-session',runId:'run9',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion agent log
  }, [reviewDebug]);


  // Review mode - using store state
  if (reviewState.isActive && reviewState.currentWordIndex !== null) {
    const word = reviewState.reviewQueue[reviewState.currentWordIndex];

    if (!word) {
      // Safety check - exit if word not found
      exitReviewSession();
      return null;
    }

    return (
      <>
        <ReviewWord
          word={word.text}
          phonetic={word.phonetic}
          userSentences={word.userSentences || []}
          totalWords={reviewState.reviewQueue.length}
          currentWordIndex={reviewState.currentWordIndex}
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
          {/* Celebration icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className="text-h2 text-gray-900 mb-2">All caught up! 🎉</h2>
          <p className="text-small text-gray-500 max-w-sm mb-6">
            No words to review today. Come back tomorrow!
          </p>

          {totalWithSentences > 0 && (
            <div className="flex gap-6 text-tiny text-gray-500 mb-6">
              <span>{masteredWords} mastered</span>
              <span>{totalWithSentences} total</span>
            </div>
          )}

          {/* Back to Home button */}
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-900 hover:bg-gray-700 text-white rounded text-small font-medium transition-colors"
          >
            Back to Home
          </button>
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
              onClick={() => startReviewSession(reviewWords)}
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
                onClick={() => startReviewSession(reviewWords.slice(idx))}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">{word.text}</span>
                      {word.phonetic && (
                        <span className="text-tiny text-gray-500 font-mono">
                          {word.phonetic}
                        </span>
                      )}
                      {word.reviewStats && word.reviewStats.retryCount > 0 && (
                        <span className="px-2 py-0.5 text-tiny text-gray-500 bg-gray-100 rounded">
                          {word.reviewStats.retryCount + 1} attempts
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-small">
                      {word.userSentences && word.userSentences.map((sent, idx) => (
                        <div key={idx} className="border-l-2 border-gray-200 pl-2">
                          {sent.translation && (
                            <div className="text-gray-700">
                              {sent.translation}
                            </div>
                          )}
                          <div className="text-gray-500 text-tiny">
                            <ClickableText text={sent.sentence} />
                          </div>
                        </div>
                      ))}
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
