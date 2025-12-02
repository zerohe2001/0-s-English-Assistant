import React, { useState, useRef, useEffect } from 'react';
import { DeepgramRecorder } from '../services/deepgram-recorder';
import { speak } from '../services/tts';
import { compareSentences } from '../services/claude';
import ClickableText from './ClickableText';

interface ReviewWordProps {
  word: string;
  originalSentence: string;
  chineseTranslation: string;
  onNext: (stats: { retryCount: number, skipped: boolean }) => void;
}

interface ComparisonResult {
  similarity: number;
  feedback: string;
  differences: string[];
}

const ReviewWord: React.FC<ReviewWordProps> = ({
  word,
  originalSentence,
  chineseTranslation,
  onNext
}) => {
  const [step, setStep] = useState<'speaking' | 'comparing'>('speaking');
  const [userSentence, setUserSentence] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const recorderRef = useRef<DeepgramRecorder | null>(null);

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
      alert('Speech recognition not available. Please check your microphone permissions.');
      return;
    }

    try {
      setIsRecording(true);
      setUserSentence(''); // Clear previous attempt

      // Re-initialize recorder (in case stream was cleaned up)
      await recorderRef.current.initialize();

      recorderRef.current.start(
        (transcript: string) => {
          // Transcript received from Deepgram
          console.log('✅ Deepgram transcript:', transcript);
          setUserSentence(transcript);
        },
        (error: Error) => {
          console.error('❌ Deepgram error:', error);
          alert(`Speech recognition failed: ${error.message}`);
          setIsRecording(false);
        }
      );
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to access microphone. Please check your browser permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
    }
    setIsRecording(false);

    // Wait a moment for transcript to arrive
    await new Promise(resolve => setTimeout(resolve, 500));

    // Analyze sentence with Claude
    if (userSentence.trim()) {
      setIsAnalyzing(true);
      try {
        const result = await compareSentences(originalSentence, userSentence.trim());
        setComparison(result);
        setStep('comparing');
      } catch (error) {
        console.error('Failed to analyze sentence:', error);
        alert('分析失败，请重试');
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setStep('speaking');
    setUserSentence('');
    setComparison(null);
  };

  const handleSkip = () => {
    onNext({ retryCount: retryCount, skipped: true });
  };

  const handleNext = () => {
    onNext({ retryCount: retryCount, skipped: false });
  };

  const playOriginal = () => {
    speak(originalSentence);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Notion-style Header */}
      <div className="flex-shrink-0 px-8 pt-8 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-8 bg-slate-900 rounded-full"></div>
          <h1 className="text-3xl font-bold text-slate-900">Review</h1>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <span className="px-3 py-1 bg-slate-100 rounded text-sm font-medium">{word}</span>
          {retryCount > 0 && (
            <span className="text-xs text-slate-400">· Attempt {retryCount + 1}</span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {/* Prompt Card */}
        <div className="mb-8">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Translate to English
          </div>
          <div className="text-2xl text-slate-800 leading-relaxed">
            <ClickableText text={chineseTranslation} />
          </div>
        </div>

        {/* Speaking Step */}
        {step === 'speaking' && !isAnalyzing && (
          <div className="space-y-6">
            {!isRecording && !userSentence && (
              <div className="flex flex-col items-center py-12">
                <button
                  onClick={startRecording}
                  className="w-20 h-20 rounded-full bg-slate-900 hover:bg-slate-800 transition-all flex items-center justify-center group"
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform">🎤</span>
                </button>
                <p className="mt-4 text-sm text-slate-500">Click to start recording</p>
              </div>
            )}

            {isRecording && (
              <div className="space-y-4">
                <div className="flex items-center justify-center py-8">
                  <div className="w-16 h-16 rounded-full bg-red-500 animate-pulse flex items-center justify-center">
                    <span className="text-2xl">🎤</span>
                  </div>
                </div>

                {userSentence && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-500 mb-2">Recognizing...</div>
                    <div className="text-slate-800">"{userSentence}"</div>
                  </div>
                )}

                <button
                  onClick={stopRecording}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors font-medium"
                >
                  Stop Recording
                </button>
              </div>
            )}

            {/* Hint */}
            <button
              onClick={playOriginal}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mx-auto"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              Listen to original
            </button>
          </div>
        )}

        {/* Analyzing */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-slate-500">Analyzing...</p>
          </div>
        )}

        {/* Comparing Step - Notion Style */}
        {step === 'comparing' && comparison && (
          <div className="space-y-6">
            {/* Score */}
            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-sm font-medium text-slate-600">Similarity</span>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-slate-900">{comparison.similarity}%</div>
                <div className={`w-2 h-2 rounded-full ${comparison.similarity >= 90 ? 'bg-green-500' : comparison.similarity >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              </div>
            </div>

            {/* Feedback */}
            {comparison.feedback && (
              <div className="p-4 bg-slate-50 rounded-lg border-l-4 border-slate-900">
                <p className="text-sm text-slate-700 leading-relaxed">{comparison.feedback}</p>
              </div>
            )}

            {/* Comparison */}
            <div className="space-y-3">
              <div className="p-4 bg-white border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-500 mb-2">You said</div>
                <div className="text-slate-900"><ClickableText text={userSentence} /></div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">Original</span>
                  <button
                    onClick={playOriginal}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>
                </div>
                <div className="text-slate-900"><ClickableText text={originalSentence} /></div>
              </div>
            </div>

            {/* Differences */}
            {comparison.differences && comparison.differences.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-xs font-medium text-amber-900 mb-2">Differences</div>
                <div className="flex flex-wrap gap-2">
                  {comparison.differences.map((diff, idx) => (
                    <span key={idx} className="px-2 py-1 bg-white text-xs text-amber-800 rounded border border-amber-300">
                      {diff}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Warning */}
            {retryCount >= 2 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-center">
                <span className="text-sm text-orange-700">
                  ⚠️ Attempt {retryCount + 1}/3
                </span>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Action Buttons - Notion Style */}
      <div className="flex-shrink-0 px-8 py-6 border-t border-slate-100 bg-white">
        {step === 'comparing' && (
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
            >
              Try Again
            </button>
            <button
              onClick={handleSkip}
              className="px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 rounded-lg transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors font-medium"
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
