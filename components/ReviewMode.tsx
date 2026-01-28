import React from 'react';
import ReviewWord from './ReviewWord';
import { Word } from '../types';

interface ReviewModeProps {
  currentWord: Word;
  currentWordIndex: number;
  totalWords: number;
  isLoading: boolean;
  onReviewComplete: (stats: { retryCount: number; skipped: boolean }) => void;
  onSkipWord: () => void;
}

export const ReviewMode: React.FC<ReviewModeProps> = ({
  currentWord,
  currentWordIndex,
  totalWords,
  isLoading,
  onReviewComplete,
  onSkipWord,
}) => {
  // Skip words without sentences
  if (!currentWord || !currentWord.userSentences || currentWord.userSentences.length === 0) {
    onSkipWord();
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 animate-fade-in p-6">
        <div className="w-16 h-16 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center">
          <p className="text-h2 text-gray-900">准备对话场景</p>
          <p className="text-body text-gray-500 mt-2">正在生成个性化对话...</p>
        </div>
      </div>
    );
  }

  return (
    <ReviewWord
      word={currentWord.text}
      phonetic={currentWord.phonetic}
      userSentences={currentWord.userSentences}
      totalWords={totalWords}
      currentWordIndex={currentWordIndex}
      onNext={onReviewComplete}
    />
  );
};
