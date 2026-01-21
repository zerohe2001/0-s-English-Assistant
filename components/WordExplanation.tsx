import React, { useState } from 'react';
import { WordExplanation as WordExplanationType } from '../types';
import { speak } from '../services/tts';
import { speakWord } from '../services/wordPronunciation';
import ClickableText from './ClickableText';

interface WordExplanationProps {
  word: string;
  explanation: WordExplanationType;
  onNext: () => void;
  onCopyText: (text: string) => void;
  openDictionary: (word: string) => void;
  copiedText: string | null;
  isLoading: boolean;
}

export const WordExplanation: React.FC<WordExplanationProps> = ({
  word,
  explanation,
  onNext,
  onCopyText,
  openDictionary,
  copiedText,
  isLoading,
}) => {
  const [showTranslation, setShowTranslation] = useState(false);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-white p-8 rounded border border-gray-300 text-center relative group">
        <h1
          className="text-h1 font-bold text-gray-900 mb-2 cursor-pointer hover:text-gray-700 transition-colors"
          onClick={() => openDictionary(word)}
          title="Click to see full dictionary definition"
        >
          {word}
        </h1>

        {/* Phonetic + Play Button */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-body text-gray-500 font-mono">{explanation.phonetic}</span>
          <button
            onClick={() => speakWord(word)}
            className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-all"
            title="Play pronunciation (native speaker)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-900" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="text-body text-gray-700">
          <ClickableText text={explanation.meaning} />
        </div>
        <div className="absolute top-2 right-2 text-tiny text-gray-300">Tap words to define</div>
      </div>

      <div
        onClick={() => setShowTranslation(!showTranslation)}
        className="bg-gray-100 p-6 rounded relative cursor-pointer hover:bg-gray-200 transition-colors"
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-tiny font-medium text-gray-700 uppercase">Example</span>
          <div className="flex gap-2">
            {/* Copy Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onCopyText(explanation.example); }}
              className={`${copiedText === explanation.example ? 'text-green-600' : 'text-gray-700 hover:text-gray-900'} p-1 bg-white rounded-full transition-colors`}
              title={copiedText === explanation.example ? "Copied!" : "Copy to ask AI"}
            >
              {copiedText === explanation.example ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            {/* Play Button */}
            <button
              onClick={(e) => { e.stopPropagation(); speak(explanation.example); }}
              className="text-gray-700 hover:text-gray-900 p-1 bg-white rounded-full transition-colors"
              title="Play audio"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="text-body text-gray-900 italic leading-relaxed">
          "<ClickableText text={explanation.example} />"
        </div>

        {showTranslation ? (
          <p className="mt-3 pt-3 border-t border-gray-300 text-gray-700 animate-fade-in font-medium">
            {explanation.exampleTranslation}
          </p>
        ) : (
          <div className="mt-4 flex items-center justify-center">
            <span className="text-tiny text-gray-500 flex items-center bg-white px-2 py-1 rounded border border-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              Tap for Chinese
            </span>
          </div>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={isLoading}
        className="w-full bg-gray-900 text-white py-4 rounded font-medium text-body hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Practice Pronunciation →
      </button>
    </div>
  );
};
