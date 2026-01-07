import React from 'react';
import { SentenceEvaluation } from '../types';
import ClickableText from './ClickableText';

interface SentenceCreationProps {
  word: string;
  currentSentenceIndex: number;
  isRecording: boolean;
  isTranscribing: boolean;
  transcript: string;
  textInput: string;
  evaluation: SentenceEvaluation | null;
  isLoading: boolean;
  onToggleRecording: () => void;
  onTextInputChange: (value: string) => void;
  onTextSubmit: () => void;
  onSkip: () => void;
  onNext: () => void;
  onRetry: () => void;
  openDictionary: (word: string) => void;
}

export const SentenceCreation: React.FC<SentenceCreationProps> = ({
  word,
  currentSentenceIndex,
  isRecording,
  isTranscribing,
  transcript,
  textInput,
  evaluation,
  isLoading,
  onToggleRecording,
  onTextInputChange,
  onTextSubmit,
  onSkip,
  onNext,
  onRetry,
  openDictionary,
}) => {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="text-center">
        <h2 className="text-h2 text-gray-900 mb-2">Active Usage</h2>
        <p className="text-body text-gray-500">
          Make your own sentence using{' '}
          <strong
            className="text-gray-900 cursor-pointer hover:text-gray-700 transition-colors underline"
            onClick={() => openDictionary(word)}
            title="Click to see dictionary definition"
          >
            {word}
          </strong>.
        </p>
        <p className="text-small text-blue-600 font-semibold mt-2">
          Sentence {currentSentenceIndex + 1} of 3
        </p>
      </div>

      <div className="flex flex-col items-center">
        {isLoading ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-body text-gray-500 font-medium">Evaluating your sentence...</p>
          </div>
        ) : !evaluation ? (
          <>
            <div className="flex flex-col items-center space-y-4 w-full">
              {/* Prompt hint */}
              <div className="bg-gray-100 border border-gray-300 rounded p-4 w-full max-w-md">
                <p className="text-tiny text-gray-700 font-medium mb-2">TASK:</p>
                <p className="text-gray-900 font-medium text-center">
                  Create a sentence using{' '}
                  <span
                    className="font-bold cursor-pointer hover:text-gray-700 transition-colors underline"
                    onClick={() => openDictionary(word)}
                    title="Click to see dictionary definition"
                  >
                    "{word}"
                  </span>
                </p>
                <p className="text-tiny text-gray-500 mt-2 text-center">
                  Speak your sentence clearly, then tap Stop
                </p>
              </div>

              <button
                onClick={onToggleRecording}
                disabled={isLoading}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-900'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isRecording ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
              <p className="mt-4 text-gray-500 font-medium text-small">
                {isRecording ? "Recording... Tap to Stop" : isTranscribing ? "Processing..." : "Tap to Start Recording"}
              </p>

              {/* Text Input Alternative */}
              <div className="w-full max-w-md mt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="text-tiny text-gray-500 uppercase">Or Type</span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>
                <div className="space-y-2">
                  <textarea
                    value={textInput}
                    onChange={(e) => onTextInputChange(e.target.value)}
                    placeholder="Type your sentence here..."
                    className="w-full px-4 py-3 border border-gray-300 rounded text-small outline-none focus:border-gray-500 resize-none h-20"
                    disabled={isLoading || isRecording}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onTextSubmit();
                      }
                    }}
                  />
                  <button
                    onClick={onTextSubmit}
                    disabled={isLoading || isRecording || !textInput.trim()}
                    className="w-full py-2 bg-gray-900 text-white rounded text-small font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
            {isTranscribing && (
              <div className="mt-4 p-3 bg-gray-100 rounded max-w-md animate-pulse border border-gray-300">
                <p className="text-gray-700 text-small">Transcribing your speech...</p>
              </div>
            )}
            {transcript && !isRecording && !isTranscribing && (
              <div className="mt-4 p-3 bg-gray-100 rounded max-w-md border border-gray-300">
                <p className="text-tiny text-gray-500 mb-1">You said:</p>
                <p className="text-gray-900 italic">"{transcript}"</p>
              </div>
            )}
            {/* Skip button */}
            <button
              onClick={onSkip}
              className="mt-6 px-6 py-2 text-gray-500 hover:text-gray-900 font-medium text-small underline transition-colors"
            >
              Skip (Don't mark as learned) →
            </button>
          </>
        ) : (
          <div className="w-full space-y-4">
            <div className="bg-gray-100 p-4 rounded border border-gray-300">
              <span className="text-tiny font-medium text-gray-500 uppercase">You Said</span>
              <p className="text-gray-900 mt-1">"{transcript}"</p>
            </div>

            <div className={`p-4 rounded border ${evaluation.isCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
              <p className="font-medium">{evaluation.isCorrect ? "Valid Usage!" : "Needs Improvement"}</p>
              <p className="text-small mt-1">{evaluation.feedback}</p>
            </div>

            {evaluation.betterWay && (
              <div className="bg-gray-100 p-4 rounded border border-gray-300">
                <span className="text-tiny font-medium text-gray-500 uppercase">Better Way</span>
                <p className="text-gray-900 mt-1"><ClickableText text={evaluation.betterWay} /></p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onRetry}
                className="flex-1 py-3 bg-white border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={onSkip}
                className="flex-1 py-3 bg-gray-100 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={onNext}
                className="flex-1 py-3 bg-gray-900 text-white rounded font-medium hover:bg-gray-700 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
