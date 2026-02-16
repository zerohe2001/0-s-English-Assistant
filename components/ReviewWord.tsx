import React, { useState, useRef, useEffect } from 'react';
import { DeepgramRecorder } from '../services/deepgram-recorder';
import { speak } from '../services/tts';
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
  onNext?: (stats: { retryCount: number; skipped: boolean }) => void; // ✅ Callback when word review completes (for Learn flow)
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
  currentWordIndex,
  onNext // ✅ Optional callback for Learn flow (triggers check-in)
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
  const transcriptRef = useRef<string>(''); // ✅ Use ref to store latest transcript immediately
  const transcriptPromiseRef = useRef<{
    resolve: (value: string) => void;
    reject: (error: Error) => void;
  } | null>(null); // ✅ Promise to wait for transcript
  const invalidSentenceHandledRef = useRef(false);
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const recorderRef = useRef<DeepgramRecorder | null>(null);

  // ✅ Get current sentence being reviewed
  const currentSentence = userSentences[currentSentenceIndex];
  const originalSentence = currentSentence?.sentence || '';
  const chineseTranslation = currentSentence?.translation || '';
  const hasValidSentence =
    userSentences.length > 0 &&
    currentSentenceIndex >= 0 &&
    currentSentenceIndex < userSentences.length;

  useEffect(() => {
    if (hasValidSentence) {
      invalidSentenceHandledRef.current = false;
      return;
    }
    if (invalidSentenceHandledRef.current) return;
    invalidSentenceHandledRef.current = true;
    showToast('该单词没有可复习的句子，已跳过', 'warning');
    nextReviewWordStandalone({ retryCount, skipped: true });
  }, [hasValidSentence, retryCount, showToast, nextReviewWordStandalone]);

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

  // ✅ Single toggle function for start/stop recording (like Learn page)
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (recorderRef.current) {
        recorderRef.current.stop();
      }
      setIsRecording(false);

      try {
        // ✅ Wait for transcript with timeout (max 5 seconds)
        console.log('⏳ Waiting for Deepgram transcript...');
        const finalTranscript = await Promise.race([
          new Promise<string>((resolve, reject) => {
            transcriptPromiseRef.current = { resolve, reject };
          }),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ]);

        console.log('📝 Final transcript:', finalTranscript);

        // Analyze sentence if we have transcript
        if (finalTranscript.trim()) {
          setIsAnalyzing(true);
          try {
            const result = await compareWithOriginal(originalSentence, finalTranscript.trim());
            setComparison(result);
            setReviewStep('comparing'); // ✅ Use store setter instead of local state
            setReviewComparison(result); // ✅ Save to store
          } catch (error) {
            console.error('Failed to analyze sentence:', error);
            showToast('分析失败，请重试', 'error');
          } finally {
            setIsAnalyzing(false);
          }
        } else {
          console.warn('⚠️ Empty transcript received');
          showToast('No speech detected. Please try again or type your answer.', 'warning');
        }
      } catch (error) {
        console.error('⚠️ Timeout or error waiting for transcript:', error);
        showToast('Speech recognition timed out. Please try again or type your answer.', 'warning');
      } finally {
        transcriptPromiseRef.current = null;
      }
    } else {
      // Start recording
      if (!recorderRef.current) {
        showToast('Speech recognition not available. Please check your microphone permissions.', 'error');
        return;
      }

      try {
        setIsRecording(true);
        setUserSentence(''); // Clear previous attempt
        transcriptRef.current = ''; // Clear ref
        transcriptPromiseRef.current = null; // Clear promise

        // Re-initialize recorder (in case stream was cleaned up)
        await recorderRef.current.initialize();

        recorderRef.current.start(
          (transcript: string) => {
            // ✅ Transcript from Deepgram (received after stop)
            console.log(`✅ Review transcript:`, transcript);

            // Update both state and ref
            transcriptRef.current = transcript;
            setUserSentence(transcript);

            // ✅ Resolve the waiting promise
            if (transcriptPromiseRef.current) {
              transcriptPromiseRef.current.resolve(transcript);
            }
          },
          (error: Error) => {
            console.error('❌ Deepgram error:', error);
            showToast(`Speech recognition failed: ${error.message}`, 'error');
            setIsRecording(false);

            // ✅ Reject the waiting promise
            if (transcriptPromiseRef.current) {
              transcriptPromiseRef.current.reject(error);
            }
          }
        );
      } catch (error) {
        console.error('Failed to start recording:', error);
        showToast('Failed to access microphone. Please check your browser permissions.', 'error');
        setIsRecording(false);
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
    const stats = { retryCount: retryCount, skipped: true };
    if (onNext) {
      // ✅ Learn flow: use callback (triggers check-in)
      onNext(stats);
    } else {
      // Standalone review flow: use store method
      nextReviewWordStandalone(stats);
    }
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
      setReviewStep('comparing'); // ✅ Use store setter
      setReviewComparison(result); // ✅ Save to store
    } catch (error) {
      console.error('Failed to analyze sentence:', error);
      showToast('分析失败，请重试', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ✅ Expand contractions to full forms so "can't"="cannot", "it's"="it is" etc.
  const expandContractions = (str: string): string => {
    const map: Record<string, string> = {
      "can't": "can not", "cannot": "can not",
      "won't": "will not", "don't": "do not", "doesn't": "does not", "didn't": "did not",
      "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not",
      "hasn't": "has not", "haven't": "have not", "hadn't": "had not",
      "couldn't": "could not", "wouldn't": "would not", "shouldn't": "should not",
      "it's": "it is", "he's": "he is", "she's": "she is",
      "that's": "that is", "there's": "there is", "here's": "here is",
      "what's": "what is", "who's": "who is", "how's": "how is",
      "where's": "where is", "when's": "when is", "why's": "why is",
      "i'm": "i am", "you're": "you are", "we're": "we are", "they're": "they are",
      "i've": "i have", "you've": "you have", "we've": "we have", "they've": "they have",
      "i'll": "i will", "you'll": "you will", "he'll": "he will", "she'll": "she will",
      "we'll": "we will", "they'll": "they will", "it'll": "it will",
      "i'd": "i would", "you'd": "you would", "he'd": "he would", "she'd": "she would",
      "we'd": "we would", "they'd": "they would", "let's": "let us",
    };
    // Replace contractions word-by-word (handle apostrophe variants)
    return str.replace(/[\w][\w'']*(?:'[\w]+)?/gi, (match) => {
      const key = match.toLowerCase().replace(/[\u2019']/g, "'");
      return map[key] || match;
    });
  };

  // ✅ Word-level diff using LCS, with contraction expansion
  const wordDiff = (original: string, user: string): { originalMarked: { text: string; match: boolean }[]; userMarked: { text: string; match: boolean }[] } => {
    const cleanPunc = (s: string) => s.toLowerCase().replace(/[.,!?;:'""`´''""()\[\]{}\-–—_\/\\@#$%^&*+=<>~|]/g, '').trim();

    // Original display words (keep as-is for rendering)
    const origDisplayWords = original.split(/\s+/).filter(Boolean);
    const userDisplayWords = user.split(/\s+/).filter(Boolean);

    // Expand contractions then split for LCS comparison
    const origExpanded = expandContractions(original).split(/\s+/).filter(Boolean).map(w => cleanPunc(w)).filter(Boolean);
    const userExpanded = expandContractions(user).split(/\s+/).filter(Boolean).map(w => cleanPunc(w)).filter(Boolean);

    // Track which expanded word came from which display word
    const buildMap = (text: string, displayWords: string[]) => {
      const expanded = expandContractions(text).split(/\s+/).filter(Boolean);
      const map: number[] = []; // map[expandedIdx] = displayWordIdx
      let di = 0, ei = 0;
      while (di < displayWords.length && ei < expanded.length) {
        const dNorm = cleanPunc(displayWords[di]);
        const eNorm = cleanPunc(expanded[ei]);
        if (dNorm === eNorm) {
          map.push(di); ei++; di++;
        } else {
          // This display word expanded into multiple words
          map.push(di); ei++;
          // Check if next expanded words still belong to same display word
          while (ei < expanded.length && di + 1 < displayWords.length) {
            const nextDNorm = cleanPunc(displayWords[di + 1]);
            const nextENorm = cleanPunc(expanded[ei]);
            if (nextDNorm === nextENorm) break; // next expanded belongs to next display word
            map.push(di); ei++;
          }
          di++;
        }
      }
      while (ei < expanded.length) { map.push(Math.max(0, di - 1)); ei++; }
      return map;
    };

    const origMap = buildMap(original, origDisplayWords);
    const userMap = buildMap(user, userDisplayWords);

    // Build LCS table on expanded words
    const a = origExpanded, b = userExpanded;
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

    // Backtrack
    const origExpandedMatched = new Set<number>();
    const userExpandedMatched = new Set<number>();
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        origExpandedMatched.add(i - 1); userExpandedMatched.add(j - 1);
        i--; j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) { i--; } else { j--; }
    }

    // Map back: a display word is matched only if ALL its expanded parts matched
    const isDisplayWordMatched = (expandedMatchSet: Set<number>, mapArr: number[], displayCount: number) => {
      const result = new Set<number>();
      for (let d = 0; d < displayCount; d++) {
        const expandedIndices = mapArr.map((mapped, ei) => mapped === d ? ei : -1).filter(ei => ei >= 0);
        if (expandedIndices.length > 0 && expandedIndices.every(ei => expandedMatchSet.has(ei))) {
          result.add(d);
        }
      }
      return result;
    };

    const origMatched = isDisplayWordMatched(origExpandedMatched, origMap, origDisplayWords.length);
    const userMatched = isDisplayWordMatched(userExpandedMatched, userMap, userDisplayWords.length);

    return {
      originalMarked: origDisplayWords.map((w, idx) => ({ text: w, match: origMatched.has(idx) })),
      userMarked: userDisplayWords.map((w, idx) => ({ text: w, match: userMatched.has(idx) })),
    };
  };

  // ✅ Calculate similarity using Levenshtein distance
  const calculateSimilarity = (str1: string, str2: string): number => {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return Math.round(((maxLen - distance) / maxLen) * 100);
  };

  // ✅ Fast comparison without AI (cost-free, instant)
  const compareWithOriginal = async (original: string, userInput: string) => {
    // Normalize for comparison: expand contractions, lowercase, remove punctuation
    const normalizeForComparison = (str: string): string => {
      return expandContractions(str)
        .toLowerCase()
        // Normalize curly/smart quotes to straight quotes first
        .replace(/[\u2018\u2019\u201A\u201B]/g, "'")  // Single curly quotes → '
        .replace(/[\u201C\u201D\u201E\u201F]/g, '"')  // Double curly quotes → "
        // Remove ALL punctuation and symbols
        .replace(/[.,!?;:'""`´''""()\[\]{}\-–—_\/\\@#$%^&*+=<>~|]/g, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim();
    };

    const normalizedOriginal = normalizeForComparison(original);
    const normalizedUser = normalizeForComparison(userInput);

    // Fast check: exact match (ignoring case, whitespace, and punctuation)
    if (normalizedOriginal === normalizedUser) {
      console.log('✅ Perfect match!');
      return {
        similarity: 100,
        feedback: 'Perfect! Your sentence matches exactly.',
        differences: []
      };
    }

    // For Levenshtein, use the already-normalized strings
    const originalNoPunc = normalizedOriginal;
    const userNoPunc = normalizedUser;

    // Calculate similarity using Levenshtein distance
    const similarity = calculateSimilarity(originalNoPunc, userNoPunc);
    console.log(`📊 Similarity: ${similarity}%`);

    if (similarity >= 80) {
      return {
        similarity,
        feedback: 'Great! Very close to the original sentence.',
        differences: ['Minor differences in wording']
      };
    } else if (similarity >= 60) {
      return {
        similarity,
        feedback: 'Good effort, but there are some differences. Try again?',
        differences: ['Check the original sentence carefully']
      };
    } else {
      return {
        similarity,
        feedback: 'Not quite right. Please try again or check the original sentence.',
        differences: ['Significant differences detected']
      };
    }
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
      const stats = { retryCount: retryCount, skipped: false };
      if (onNext) {
        // ✅ Learn flow: use callback (triggers check-in)
        onNext(stats);
      } else {
        // Standalone review flow: use store method
        nextReviewWordStandalone(stats);
      }
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

  if (!hasValidSentence) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <p className="text-small text-gray-500">正在准备下一条复习内容...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-8 pt-6 pb-4 border-b border-gray-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="text-gray-500 hover:text-gray-900 transition-colors"
              aria-label="Go back"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-h3 font-semibold text-gray-900">{word}</span>
            {phonetic && (
              <span className="text-tiny text-gray-500 font-mono">{phonetic}</span>
            )}
            {retryCount > 0 && (
              <span className="text-tiny text-gray-400">· Attempt {retryCount + 1}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step === 'comparing' && comparison && (
              <span className={`text-h3 font-bold ${comparison.similarity >= 90 ? 'text-green-600' : comparison.similarity >= 70 ? 'text-yellow-600' : 'text-red-500'}`}>
                {comparison.similarity}%
              </span>
            )}
            <button
              onClick={exitReviewSession}
              className="text-gray-500 hover:text-gray-900 text-small font-medium transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {/* Prompt Card */}
        <div className="mb-8">
          <div className="text-h2 text-gray-900 leading-relaxed">
            {chineseTranslation}
          </div>
        </div>

        {/* Speaking Step */}
        {step === 'speaking' && !isAnalyzing && (
          <VoiceOrTextInput
            isRecording={isRecording}
            transcript={userSentence}
            onToggleRecording={toggleRecording}
            textInput={textInput}
            onTextInputChange={setTextInput}
            onTextSubmit={handleTextSubmit}
            placeholder="Type your translation here..."
            recordingPrompt="Tap to Start Recording"
            disabled={false}
            onSecondaryAction={playOriginal}
            secondaryActionLabel="Listen to original"
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
            {/* Comparison */}
            {(() => {
              const diff = comparison.similarity < 100 ? wordDiff(originalSentence, userSentence) : null;
              return (
                <div className="space-y-3">
                  <div className="p-4 bg-white border border-gray-300 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-tiny text-gray-500">You said</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(userSentence); showToast('Copied!', 'success'); }}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-gray-900">
                      {diff ? (
                        <span>
                          {diff.userMarked.map((w, i) => (
                            <span key={i}>
                              {i > 0 && ' '}
                              <span className={w.match ? '' : 'text-red-500 bg-red-50 rounded px-0.5'}>{w.text}</span>
                            </span>
                          ))}
                        </span>
                      ) : (
                        <ClickableText text={userSentence} />
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-gray-300 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-tiny text-gray-500">Original</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { navigator.clipboard.writeText(originalSentence); showToast('Copied!', 'success'); }}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={playOriginal}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="text-gray-900">
                      {diff ? (
                        <span>
                          {diff.originalMarked.map((w, i) => (
                            <span key={i}>
                              {i > 0 && ' '}
                              <span className={w.match ? '' : 'text-green-600 bg-green-50 rounded px-0.5'}>{w.text}</span>
                            </span>
                          ))}
                        </span>
                      ) : (
                        <ClickableText text={originalSentence} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}


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
              disabled={!comparison || comparison.similarity < 95}
              className={`px-6 py-2 rounded text-small font-medium transition-colors ${
                comparison && comparison.similarity >= 95
                  ? 'bg-gray-900 hover:bg-gray-700 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
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
