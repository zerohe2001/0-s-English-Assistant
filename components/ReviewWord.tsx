import React, { useState, useRef, useEffect } from 'react';
import { DeepgramRecorder } from '../services/deepgram-recorder';
import { speak } from '../services/tts';
import { compareSentences } from '../services/claude';
import ClickableText from './ClickableText';
import VoiceOrTextInput from './VoiceOrTextInput';
import { useStore } from '../store';
import { UserSentence } from '../types';

interface ReviewWordProps {
  word: string;
  phonetic?: string; // ✅ Phonetic notation
  userSentences: UserSentence[]; // ✅ Array of sentences to review
  totalWords: number; // ✅ Total words in review queue
  currentWordIndex: number; // ✅ Current word index (0-based)
}

interface ComparisonResult {
  similarity: number;
  feedback: string;
  differences: string[];
}

const ReviewWord: React.FC<ReviewWordProps> = ({
  word,
  phonetic,
  userSentences,
  totalWords,
  currentWordIndex
}) => {
  const {
    showToast,
    reviewState,
    setReviewStep,
    setReviewInput,
    setReviewComparison,
    nextReviewSentenceStandalone,
    nextReviewWordStandalone,
    goBackReview,
    exitReviewSession
  } = useStore();

  // Use store state instead of local state
  const currentSentenceIndex = reviewState.currentSentenceIndex;
  const step = reviewState.step;
  const retryCount = reviewState.retryCount;

  const [userSentence, setUserSentence] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const recorderRef = useRef<DeepgramRecorder | null>(null);

  // ✅ Get current sentence being reviewed
  const currentSentence = userSentences[currentSentenceIndex];
  const originalSentence = currentSentence?.sentence || '';
  const chineseTranslation = currentSentence?.translation || '';

  // 🐛 DEBUG: Log the data to find the issue
  useEffect(() => {
    console.log('=== ReviewWord Debug ===');
    console.log('Total sentences:', userSentences.length);
    console.log('Current index:', currentSentenceIndex);
    console.log('Current sentence object:', currentSentence);
    console.log('Original sentence:', originalSentence);
    console.log('Chinese translation:', chineseTranslation);
    console.log('All userSentences:', userSentences);
  }, [currentSentenceIndex, userSentences]);

  // Initialize Deepgram Recorder
  useEffect(() => {
    const recorder = new DeepgramRecorder();
    recorderRef.current = recorder;

    // Initialize microphone access
    recorder.initialize().catch((error) => {
      console.error('❌ Failed to initialize recorder:', error);
      // Microphone access will be requested on first recording attempt
    });

    // Cleanup: Stop recorder when component unmounts
    return () => {
      if (recorderRef.current) {
        recorderRef.current.cleanup();
        recorderRef.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    if (!recorderRef.current) {
      showToast('Speech recognition not available. Please check your microphone permissions.', 'error');
      return;
    }

    try {
      setIsRecording(true);
      setUserSentence(''); // Clear previous attempt

      // Re-initialize recorder (in case stream was cleaned up)
      await recorderRef.current.initialize();

      recorderRef.current.start(
        (transcript: string) => {
          // ✅ Transcript from Deepgram (received after stop)
          console.log(`✅ Review transcript:`, transcript);

          // Update display with transcribed text
          setUserSentence(transcript);
        },
        (error: Error) => {
          console.error('❌ Deepgram error:', error);
          showToast(`Speech recognition failed: ${error.message}`, 'error');
          setIsRecording(false);
        }
      );
    } catch (error) {
      console.error('Failed to start recording:', error);
      showToast('Failed to access microphone. Please check your browser permissions.', 'error');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
    }
    setIsRecording(false);

    // Note: With DeepgramRecorder, the transcript callback will be called
    // automatically after stop(), so we wait a bit for it to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Analyze sentence
    if (userSentence.trim()) {
      setIsAnalyzing(true);
      try {
        const result = await compareWithOriginal(originalSentence, userSentence.trim());
        setComparison(result);
        setStep('comparing');
      } catch (error) {
        console.error('Failed to analyze sentence:', error);
        showToast('分析失败，请重试', 'error');
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleRetry = () => {
    setReviewStep('speaking');
    setUserSentence('');
    setTextInput('');
    setComparison(null);
    // Increment retry count in store
    const newRetryCount = retryCount + 1;
    // Store will track this
  };

  const handleSkip = () => {
    // Skip current word
    nextReviewWordStandalone({ retryCount: retryCount, skipped: true });
  };

  // ✅ Handle text input submission (alternative to speech)
  const handleTextSubmit = async () => {
    const text = textInput.trim();
    if (!text) {
      showToast('Please enter some text first.', 'warning');
      return;
    }

    setUserSentence(text);
    setTextInput('');

    // Analyze sentence
    setIsAnalyzing(true);
    try {
      const result = await compareWithOriginal(originalSentence, text);
      setComparison(result);
      setStep('comparing');
    } catch (error) {
      console.error('Failed to analyze sentence:', error);
      showToast('分析失败，请重试', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ✅ Fast comparison with optional AI fallback
  const compareWithOriginal = async (original: string, userInput: string) => {
    // Normalize for comparison (lowercase, trim, remove extra spaces)
    const normalizedOriginal = original.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalizedUser = userInput.toLowerCase().replace(/\s+/g, ' ').trim();

    // Fast check: exact match (ignoring case and whitespace)
    if (normalizedOriginal === normalizedUser) {
      console.log('✅ Perfect match! No AI call needed.');
      return {
        similarity: 100,
        feedback: 'Perfect! Your sentence matches exactly.',
        differences: []
      };
    }

    // Fast check: very similar (ignore punctuation)
    const stripPunctuation = (str: string) => str.replace(/[.,!?;:]/g, '').trim();
    if (stripPunctuation(normalizedOriginal) === stripPunctuation(normalizedUser)) {
      console.log('✅ Perfect match (ignoring punctuation)! No AI call needed.');
      return {
        similarity: 100,
        feedback: 'Perfect! Your sentence matches exactly.',
        differences: []
      };
    }

    // Not identical - use AI for semantic comparison
    console.log('🤖 Calling AI for semantic comparison...');
    return await compareSentences(original, userInput);
  };

  const handleNext = () => {
    // Check if there are more sentences to review
    if (currentSentenceIndex < userSentences.length - 1) {
      // Move to next sentence
      nextReviewSentenceStandalone();
      setUserSentence('');
      setTextInput('');
      setComparison(null);
      console.log(`✅ Moving to sentence ${currentSentenceIndex + 2}/${userSentences.length}`);
    } else {
      // All sentences reviewed, complete the word
      nextReviewWordStandalone({ retryCount: retryCount, skipped: false });
    }
  };

  const handleBack = () => {
    goBackReview();
    setUserSentence('');
    setTextInput('');
    setComparison(null);
  };

  const playOriginal = () => {
    speak(originalSentence);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-8 pt-8 pb-6 border-b border-gray-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="text-gray-500 hover:text-gray-900 transition-colors"
              aria-label="Go back"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-1 h-8 bg-gray-900 rounded-full"></div>
            <h1 className="text-h1 text-gray-900">Review</h1>
          </div>
          <button
            onClick={exitReviewSession}
            className="text-gray-500 hover:text-gray-900 text-small font-medium transition-colors"
          >
            Exit
          </button>
        </div>
        <div className="flex items-center gap-2 text-gray-500 flex-wrap">
          <div className="flex items-baseline gap-2 px-3 py-1 bg-gray-100 rounded">
            <span className="text-small font-medium text-gray-900">{word}</span>
            {phonetic && (
              <span className="text-tiny text-gray-500 font-mono">
                {phonetic}
              </span>
            )}
          </div>
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-small font-semibold">
            Word {currentWordIndex + 1}/{totalWords}
          </span>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-small font-semibold">
            Sentence {currentSentenceIndex + 1}/{userSentences.length}
          </span>
          {retryCount > 0 && (
            <span className="text-tiny text-gray-500">· Attempt {retryCount + 1}</span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {/* Prompt Card */}
        <div className="mb-8">
          <div className="text-tiny font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Translate to English
          </div>
          <div className="text-h2 text-gray-900 leading-relaxed">
            {chineseTranslation}
          </div>
        </div>

        {/* Speaking Step */}
        {step === 'speaking' && !isAnalyzing && (
          <VoiceOrTextInput
            isRecording={isRecording}
            transcript={userSentence}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            textInput={textInput}
            onTextInputChange={setTextInput}
            onTextSubmit={handleTextSubmit}
            placeholder="Type your translation here..."
            recordingPrompt="Click to start recording"
            disabled={false}
            onSecondaryAction={playOriginal}
            secondaryActionLabel={
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                Listen to original
              </>
            }
          />
        )}

        {/* Analyzing */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
            <p className="mt-4 text-small text-gray-500">Analyzing...</p>
          </div>
        )}

        {/* Comparing Step */}
        {step === 'comparing' && comparison && (
          <div className="space-y-6">
            {/* Score */}
            <div className="flex items-center justify-between p-5 bg-gray-100 rounded border border-gray-300">
              <span className="text-small font-medium text-gray-700">Similarity</span>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-gray-900">{comparison.similarity}%</div>
                <div className={`w-2 h-2 rounded-full ${comparison.similarity >= 90 ? 'bg-green-500' : comparison.similarity >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              </div>
            </div>

            {/* Feedback */}
            {comparison.feedback && (
              <div className="p-4 bg-gray-100 rounded border-l-2 border-gray-900">
                <p className="text-small text-gray-700 leading-relaxed">{comparison.feedback}</p>
              </div>
            )}

            {/* Comparison */}
            <div className="space-y-3">
              <div className="p-4 bg-white border border-gray-300 rounded">
                <div className="text-tiny text-gray-500 mb-2">You said</div>
                <div className="text-gray-900"><ClickableText text={userSentence} /></div>
              </div>

              <div className="p-4 bg-white border border-gray-300 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-tiny text-gray-500">Original</span>
                  <button
                    onClick={playOriginal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>
                </div>
                <div className="text-gray-900"><ClickableText text={originalSentence} /></div>
              </div>
            </div>

            {/* Differences */}
            {comparison.differences && comparison.differences.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded">
                <div className="text-tiny font-medium text-amber-900 mb-2">Differences</div>
                <div className="flex flex-wrap gap-2">
                  {comparison.differences.map((diff, idx) => (
                    <span key={idx} className="px-2 py-1 bg-white text-tiny text-amber-800 rounded border border-amber-300">
                      {diff}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Warning */}
            {retryCount >= 2 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded text-center">
                <span className="text-small text-orange-700">
                  Attempt {retryCount + 1}/3
                </span>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Action Buttons */}
      <div className="flex-shrink-0 px-8 py-6 border-t border-gray-300 bg-white">
        {step === 'comparing' && (
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded text-small font-medium transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleSkip}
              className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-500 rounded text-small transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded text-small font-medium transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewWord;
