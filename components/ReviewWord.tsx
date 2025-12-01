import React, { useState, useRef } from 'react';
import { DeepgramRecorder } from '../services/deepgram-recorder';
import { speak } from '../services/tts';
import ClickableText from './ClickableText';

interface ReviewWordProps {
  word: string;
  originalSentence: string;
  chineseTranslation: string;
  onNext: (stats: { retryCount: number, skipped: boolean }) => void;
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
  const recorderRef = useRef<DeepgramRecorder | null>(null);

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setUserSentence(''); // Clear previous attempt

      recorderRef.current = new DeepgramRecorder({
        onTranscript: (text: string) => {
          setUserSentence(text);
        },
        onError: (error: string) => {
          console.error('Recording error:', error);
          alert('录音失败，请重试');
          setIsRecording(false);
        }
      });

      await recorderRef.current.start();
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('无法启动录音');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (recorderRef.current) {
      await recorderRef.current.stop();
      recorderRef.current = null;
    }
    setIsRecording(false);

    // Move to comparing step if user said something
    if (userSentence.trim()) {
      setStep('comparing');
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setStep('speaking');
    setUserSentence('');
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

  // Calculate similarity (simple word matching)
  const calculateSimilarity = () => {
    const original = originalSentence.toLowerCase().split(/\s+/);
    const user = userSentence.toLowerCase().split(/\s+/);
    const matches = user.filter(w => original.includes(w)).length;
    return Math.round((matches / original.length) * 100);
  };

  const similarity = step === 'comparing' ? calculateSimilarity() : 0;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-indigo-900 mb-2">复习句子</h2>
        <div className="inline-block px-4 py-2 bg-indigo-100 rounded-full">
          <span className="text-sm font-bold text-indigo-600">{word}</span>
        </div>
      </div>

      {/* Chinese Translation Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="text-sm font-bold text-slate-400 uppercase mb-2">请说出这句话的英文</div>
        <div className="text-2xl font-bold text-slate-800">
          <ClickableText text={chineseTranslation} />
        </div>
      </div>

      {/* Speaking Step */}
      {step === 'speaking' && (
        <div className="flex-1 flex flex-col justify-center items-center space-y-6">
          {!isRecording && !userSentence && (
            <button
              onClick={startRecording}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-2xl hover:scale-105 transition-all active:scale-95 flex flex-col items-center justify-center"
            >
              <span className="text-5xl">🎤</span>
              <span className="text-sm font-bold mt-2">开始说</span>
            </button>
          )}

          {isRecording && (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-32 h-32 rounded-full bg-red-500 animate-pulse flex items-center justify-center">
                <span className="text-6xl">🎤</span>
              </div>
              <button
                onClick={stopRecording}
                className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700"
              >
                停止录音
              </button>
              {userSentence && (
                <div className="text-center bg-white/80 p-4 rounded-xl">
                  <div className="text-xs text-slate-500">识别中...</div>
                  <div className="text-slate-800 italic">"{userSentence}"</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Comparing Step */}
      {step === 'comparing' && (
        <div className="flex-1 space-y-4">
          {/* Similarity Score */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-slate-600">相似度</span>
              <span className={`text-3xl font-bold ${similarity >= 80 ? 'text-green-600' : similarity >= 60 ? 'text-orange-600' : 'text-red-600'}`}>
                {similarity}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all ${similarity >= 80 ? 'bg-green-500' : similarity >= 60 ? 'bg-orange-500' : 'bg-red-500'}`}
                style={{ width: `${similarity}%` }}
              ></div>
            </div>
          </div>

          {/* User's Sentence */}
          <div className="bg-blue-50 rounded-2xl shadow-lg p-6 border-2 border-blue-200">
            <div className="text-xs font-bold text-blue-600 uppercase mb-2">你说的</div>
            <div className="text-lg text-blue-900">
              <ClickableText text={userSentence} />
            </div>
          </div>

          {/* Original Sentence */}
          <div className="bg-green-50 rounded-2xl shadow-lg p-6 border-2 border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-green-600 uppercase">原句</span>
              <button
                onClick={playOriginal}
                className="text-green-600 hover:text-green-700 text-2xl"
              >
                🔊
              </button>
            </div>
            <div className="text-lg text-green-900">
              <ClickableText text={originalSentence} />
            </div>
          </div>

          {/* Retry count warning */}
          {retryCount >= 2 && (
            <div className="bg-orange-100 border-2 border-orange-300 rounded-xl p-3 text-center">
              <span className="text-sm text-orange-800">
                ⚠️ 重试次数：{retryCount + 1}/3 - 再次重试或跳过将标记为未完成
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex-shrink-0 mt-6 space-y-3">
        {step === 'comparing' && (
          <>
            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-all active:scale-95"
              >
                🔄 Retry
              </button>
              <button
                onClick={handleSkip}
                className="flex-1 py-4 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-all active:scale-95"
              >
                ⏭️ Skip
              </button>
            </div>
            <button
              onClick={handleNext}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-all active:scale-95"
            >
              ✅ Next
            </button>
          </>
        )}

        {step === 'speaking' && (
          <button
            onClick={() => {
              playOriginal();
              alert('提示：听完原句后，尝试自己说出来');
            }}
            className="w-full py-3 bg-white border-2 border-indigo-300 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition"
          >
            🔊 听原句
          </button>
        )}
      </div>
    </div>
  );
};

export default ReviewWord;
