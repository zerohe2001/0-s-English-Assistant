
import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
// ✅ Use Gemini API via Edge Function for security
import { generateWordExplanation, evaluateUserSentence, evaluateShadowing, translateToChinese, compareTextSimilarity, quickCheckSentence } from '../services/geminiClient';
import { speak, preloadAudio } from '../services/tts';
import { withErrorHandling, withPerformanceTracking, logAndNotify } from '../utils/errorHandler';
import ClickableText from '../components/ClickableText';
import DictionaryModal from '../components/DictionaryModal';
import { ContextInput } from '../components/ContextInput';
import { WordExplanation as WordExplanationComponent } from '../components/WordExplanation';
import { ShadowingPractice } from '../components/ShadowingPractice';
import { SentenceCreation } from '../components/SentenceCreation';
import { ReviewMode } from '../components/ReviewMode';
import { MakeupCheckInModal } from '../components/MakeupCheckInModal'; // ✅ Check-in modal
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { WordExplanation, SentenceEvaluation } from '../types';
import { DeepgramRecorder } from '../services/deepgram-recorder';

export const Learn = () => {
  const navigate = useNavigate();
  const {
    profile,
    learnState,
    setDailyContext,
    startLearning,
    setWordSubStep,
    nextSentence, // ✅ Move to next sentence in creation phase
    nextWord,
    goBackStep, // ✅ Go back to previous step in learning flow
    nextReviewWord, // ✅ Move to next word in review
    updateReviewStats, // ✅ Update review statistics
    resetSession,
    getActiveWords,
    addSavedContext,
    setWordExplanation, // ✅ Add method to store explanations
    markWordAsLearned, // ✅ Mark word as learned
    openDictionary, // ✅ Open dictionary modal for word lookup
    saveUserSentence, // ✅ Save user's created sentence (for scene generation)
    addUserSentence, // ✅ Add sentence to Word's userSentences array
    addCheckIn, // ✅ Record daily check-in
    getCheckInRecord, // ✅ Get check-in for a date
    getMakeupEligibleDates, // ✅ Get dates eligible for makeup
    makeupCheckIn, // ✅ Perform makeup check-in
    showToast
  } = useStore();

  const words = getActiveWords(); // ✅ Only show non-deleted words

  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null); // ✅ Track copied text for feedback
  const [isPending, startTransition] = useTransition(); // ✅ React 19 concurrent feature

  // ✅ Check-in modal state
  const [showMakeupModal, setShowMakeupModal] = useState(false);
  const [eligibleDates, setEligibleDates] = useState<string[]>([]);
  const [extraGroups, setExtraGroups] = useState(0);

  // ✅ Read explanation from store instead of local state
  const currentWord = learnState.learningQueue?.[learnState.currentWordIndex];
  const explanation = currentWord && learnState.wordExplanations && currentWord.id in learnState.wordExplanations
    ? learnState.wordExplanations[currentWord.id]
    : null;

  // Input State - moved to ContextInput component

  // Practice State
  const [textInput, setTextInput] = useState(''); // ✅ For typed input (alternative to speech)
  const [inputMethod, setInputMethod] = useState<'voice' | 'text'>('voice'); // ✅ Track how user provided input
  const [evaluation, setEvaluation] = useState<SentenceEvaluation | null>(null);
  const [shadowingFeedback, setShadowingFeedback] = useState<{isCorrect: boolean, feedback: string} | null>(null);
  const processingRef = useRef(false); // ✅ Prevent race conditions in speech evaluation

  // Voice Recorder Hook
  const {
    isRecording,
    isTranscribing,
    transcript,
    setTranscript,
    toggleRecording,
    recorderRef,
  } = useVoiceRecorder({
    onTranscript: (transcriptText) => {
      // Process the transcript
      handleSpeechResult(transcriptText);
    },
    onError: (error) => {
      showToast(error, "error");
    },
  });

  // ✅ Batch preload all word explanations on component mount
  useEffect(() => {
    if (learnState.currentStep === 'learning' && learnState.learningQueue.length > 0) {
      batchPreloadExplanations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Fetch word content when currentWord changes (for cache check and audio preload)
  useEffect(() => {
    if (learnState.currentStep === 'learning' && currentWord && learnState.wordSubStep === 'explanation') {
      loadWordContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learnState.currentWordIndex, learnState.currentStep]);

  // Clear state when moving forward (but not when going back)
  // This runs when wordSubStep or currentWordIndex changes
  const prevSubStepRef = useRef(learnState.wordSubStep);
  const prevSentenceIndexRef = useRef(learnState.currentSentenceIndex);

  useEffect(() => {
    // Don't clear if we're in creation mode - let the restoration useEffect handle it
    if (learnState.wordSubStep === 'creation') {
      return;
    }

    // Clear state for other substeps
    setTranscript('');
    setEvaluation(null);
    setShadowingFeedback(null);

    // Update refs
    prevSubStepRef.current = learnState.wordSubStep;
    prevSentenceIndexRef.current = learnState.currentSentenceIndex;
  }, [learnState.wordSubStep, learnState.currentWordIndex]);

  // ✅ Restore saved sentence when returning to completed sentence via Back button
  // OR clear state when moving to new sentence
  useEffect(() => {
    if (learnState.wordSubStep === 'creation' && currentWord?.id) {
      const savedSentences = learnState.userSentences?.[currentWord.id];

      if (savedSentences && savedSentences[learnState.currentSentenceIndex]) {
        const saved = savedSentences[learnState.currentSentenceIndex];

        // Restore sentence and show as "already completed"
        console.log(`✅ Restoring saved sentence ${learnState.currentSentenceIndex + 1}:`, saved.sentence);
        setTranscript(saved.sentence);
        setEvaluation({
          isCorrect: true,
          feedback: "This sentence was previously saved and validated.",
          betterWay: saved.sentence
        });
      } else {
        // New sentence - clear state to show input interface
        console.log(`🆕 New sentence ${learnState.currentSentenceIndex + 1} - clearing state`);
        setTranscript('');
        setEvaluation(null);
      }
    }
  }, [learnState.currentSentenceIndex, learnState.wordSubStep, currentWord?.id, learnState.userSentences]);

  // ✅ Batch preload all word explanations
  const batchPreloadExplanations = async () => {
    const wordsToLoad = learnState.learningQueue.filter(word => {
      const cached = learnState.wordExplanations[word.id];
      if (!cached) return true; // Need to load

      // Check if cached translation is valid
      const translation = cached.exampleTranslation?.trim() || '';
      const isInvalid =
        !translation ||
        !/[\u4e00-\u9fa5]/.test(translation) ||
        translation.length < 2 ||
        /^[^\u4e00-\u9fa5a-zA-Z]+$/.test(translation);

      return isInvalid; // Need to reload if invalid
    });

    if (wordsToLoad.length === 0) {
      console.log('✨ All words already cached');
      return;
    }

    console.log(`🚀 Batch loading ${wordsToLoad.length} words...`);
    setIsLoading(true);
    setLoadingProgress({ current: 0, total: wordsToLoad.length });

    try {
      let completedCount = 0;

      // Load all words in parallel with performance tracking
      await withPerformanceTracking(async () => {
        const promises = wordsToLoad.map(async (word) => {
          const result = await withErrorHandling(
            () => generateWordExplanation(word.text, profile, learnState.dailyContext),
            (error) => console.error(`❌ Failed to load ${word.text}:`, error),
            { maxRetries: 1, retryDelay: 500 }
          );

          if (result) {
            setWordExplanation(word.id, result);
            // Preload audio in background
            if (result.example) {
              preloadAudio(result.example);
            }
          }

          completedCount++;
          setLoadingProgress({ current: completedCount, total: wordsToLoad.length });
          console.log(`✅ Loaded ${completedCount}/${wordsToLoad.length}: ${word.text}`);
        });

        await Promise.all(promises);
      }, `Batch load ${wordsToLoad.length} words`);
    } catch (error) {
      logAndNotify(error, showToast, "Batch loading failed");
    } finally {
      setIsLoading(false);
      setLoadingProgress(null);
    }
  };

  const loadWordContent = async () => {
    // ✅ This function now only handles cache check and audio preload
    // Batch preloading is done on mount, so this is just for switching between words

    if (!currentWord) {
      console.error('loadWordContent called but currentWord is undefined');
      return;
    }

    const cached = learnState.wordExplanations[currentWord.id];

    if (cached) {
      console.log('✨ Using cached explanation for:', currentWord.text);
      // Preload audio for cached explanation
      if (cached.example) {
        preloadAudio(cached.example);
      }
    } else {
      // This should rarely happen since batch preload runs first
      // But handle it just in case
      console.warn('⚠️ No cached explanation found for:', currentWord.text, '- loading individually');
      setIsLoading(true);
      try {
        const result = await generateWordExplanation(currentWord.text, profile, learnState.dailyContext);
        setWordExplanation(currentWord.id, result);

        if (result.example) {
          preloadAudio(result.example);
        }
      } catch (e) {
        console.error(e);
        showToast("Failed to load word data. Check API Key or Connection.", "error");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // speak function is now imported from services/tts.ts

  // ✅ Copy text to clipboard with visual feedback
  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);

      // Clear "Copied!" message after 2 seconds
      setTimeout(() => {
        setCopiedText(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      showToast("Failed to copy. Please try again.", "error");
    }
  };

  const handleToggleRecording = async () => {
    // Mark input as voice when starting recording
    if (!isRecording) {
      setInputMethod('voice');
    }
    await toggleRecording();
  };


  const handleSpeechResult = async (text: string) => {
      // ✅ Prevent race conditions: Skip if already processing
      if (processingRef.current) {
          console.log("⚠️ Already processing speech, skipping duplicate call...");
          return;
      }

      console.log("=== handleSpeechResult called ===");
      console.log("Current step:", learnState.wordSubStep);
      console.log("Transcript:", text);

      processingRef.current = true;
      setIsLoading(true);
      try {
        if (learnState.wordSubStep === 'shadowing') {
            // Check shadowing
            console.log("Evaluating shadowing...");
            if (!explanation) {
                console.error("No explanation available!");
                showToast("Error: No example sentence to compare against.", "error");
                return;
            }
            console.log("Target sentence:", explanation.example);
            console.log("User said:", text);
            console.log("Input method:", inputMethod);

            // ✅ Fast text comparison for all input types (no AI needed)
            // Deepgram already converted speech to text, just need to compare
            console.log("Using fast text comparison for", inputMethod, "input...");
            const result = compareTextSimilarity(explanation.example, text);
            console.log("Text comparison result:", result);
            setShadowingFeedback(result);
        } else if (learnState.wordSubStep === 'creation') {
            // Check sentence creation
            console.log("Evaluating user sentence...");

            // ✅ Quick pre-check for common errors (instant feedback, no AI call)
            const quickCheck = quickCheckSentence(
                currentWord.text,
                text,
                explanation?.example
            );

            if (!quickCheck.passed) {
                // Instant feedback for basic errors - don't call AI!
                console.log("❌ Quick check failed:", quickCheck.feedback);
                setEvaluation({
                    isCorrect: false,
                    feedback: quickCheck.feedback!,
                    betterWay: text  // Keep original sentence
                });
                return;
            }

            // ✅ Passed quick checks - now do full AI evaluation
            console.log("✅ Quick check passed, calling AI for grammar evaluation...");
            const result = await evaluateUserSentence(currentWord.text, text, learnState.dailyContext);
            console.log("Sentence evaluation result:", result);
            setEvaluation(result);
        }
      } catch (error) {
          logAndNotify(error, showToast, "Evaluation failed");
      } finally {
          processingRef.current = false;
          setIsLoading(false);
      }
  };

  // ✅ Handle text input submission (alternative to speech)
  const handleTextSubmit = async () => {
      const text = textInput.trim();
      if (!text) {
          showToast("Please enter some text first.", "warning");
          return;
      }

      // Mark as text input (for fast evaluation)
      setInputMethod('text');

      // Set transcript to the typed text
      setTranscript(text);

      // Process it the same way as speech
      await handleSpeechResult(text);

      // Clear text input after submission
      setTextInput('');
  };

  // ✅ Handle Next from Shadowing - does NOT mark as learned yet (wait for 3 sentences)
  const handleNextFromShadowing = () => {
      console.log('✅ Shadowing completed, moving to creation');
      setWordSubStep('creation');
  };

  // ✅ Handle Skip from Shadowing - does NOT mark as learned
  const handleSkipShadowing = () => {
      console.log('⏭️ Skipped shadowing, word NOT marked as learned');
      setWordSubStep('creation');
  };

  // ✅ Handle Next from Creation - saves sentence and moves to next sentence or word
  const handleNextFromCreation = () => {
      if (currentWord && transcript && transcript.trim()) {
          const userSentence = transcript.trim();

          // Save to learnState for scene generation
          saveUserSentence(currentWord.id, userSentence);
          console.log('✅ Saved user sentence for scene:', userSentence);

          // ✅ PERFORMANCE FIX: Translate in background (don't block UI)
          // User can immediately move to next sentence while translation happens
          translateToChinese(userSentence)
            .then(translation => {
              addUserSentence(currentWord.id, userSentence, translation);
              console.log(`✅ Translation completed in background (sentence ${learnState.currentSentenceIndex + 1}/3):`, translation);
            })
            .catch(translationError => {
              console.error('❌ Background translation failed:', translationError);
              // Save with placeholder translation - can retry later
              addUserSentence(currentWord.id, userSentence, '[Translation pending]');
            });
      }

      // Check if user has created 3 sentences
      if (learnState.currentSentenceIndex >= 2) {
          // User created 3 sentences, mark word as learned and move to next word
          if (currentWord) {
              markWordAsLearned(currentWord.id);
              console.log('✅ Word marked as learned after 3 sentences:', currentWord.text);
          }

          // Move to next word or complete session
          if (learnState.currentWordIndex >= learnState.learningQueue.length - 1) {
              // All words completed, end session
              showToast("Great job! All words learned.", "success");
              resetSession();
              navigate('/');
          } else {
              setEvaluation(null);
              setTranscript('');
              nextWord();
          }
      } else {
          // Move to next sentence (0->1 or 1->2) - INSTANT, no waiting!
          setEvaluation(null);
          setTranscript('');
          nextSentence();
          console.log(`✅ Moving to sentence ${learnState.currentSentenceIndex + 2}/3 (translation in background)`);
      }
  };

  // ✅ Handle Skip from Creation - does NOT mark as learned, moves to next
  const handleSkipCreation = async () => {
      console.log('⏭️ Skipped creation, word NOT marked as learned');

      // Move to next word or complete session (same logic as Next but without marking)
      if (learnState.currentWordIndex >= learnState.learningQueue.length - 1) {
          // All words completed, end session
          showToast("Session complete!", "success");
          resetSession();
          navigate('/');
      } else {
          setEvaluation(null);
          setTranscript('');
          nextWord();
      }
  };

  // ✅ Handle Back button - go to previous step
  const handleGoBack = () => {
    // Don't clear transcript/evaluation here - let useEffect handle restoration
    // Only clear input-related state that should always be reset
    setTextInput('');

    // Only clear shadowing feedback when actually leaving shadowing step
    if (learnState.wordSubStep === 'shadowing') {
      setShadowingFeedback(null);
    }

    // Navigate to previous step
    goBackStep();
  };

  // Check if at the very beginning (can't go back further)
  const isAtBeginning = learnState.currentWordIndex === 0 && learnState.wordSubStep === 'explanation';

  const handleNextStep = async () => {
      if (learnState.wordSubStep === 'explanation') {
          setWordSubStep('shadowing');
      } else if (learnState.wordSubStep === 'shadowing') {
          // Default behavior for other callers
          setWordSubStep('creation');
      } else if (learnState.wordSubStep === 'creation') {
          // Move to next word or complete session
          if (learnState.currentWordIndex >= learnState.learningQueue.length - 1) {
              // All words completed, end session
              showToast("Great job! All words learned.", "success");
              resetSession();
              navigate('/');
          } else {
             nextWord();
          }
      }
  };

  const handleStartSession = async (context: string) => {
      if (!context) {
          showToast("Please provide some context to start.", "warning");
          return;
      }

      setDailyContext(context);

      // ✅ Use existing learningQueue if available (from Vocabulary selection)
      // Otherwise, select unlearned words
      let queue = learnState.learningQueue;
      if (!queue || queue.length === 0) {
        queue = words.filter(w => !w.learned).slice(0, 5);
        if (queue.length === 0 && words.length > 0) {
            queue = [...words].sort(() => 0.5 - Math.random()).slice(0, 5);
        }
      }

      console.log('🎯 Starting session with queue:', queue.map(w => w.text));

      // Set learning state manually
      useStore.setState((state) => ({
        learnState: {
          ...state.learnState,
          currentStep: 'learning',
          learningQueue: queue,
          currentWordIndex: 0,
          wordSubStep: 'explanation',
        }
      }));

      // ✅ PERFORMANCE OPTIMIZATION: Preload ALL words immediately
      console.log(`🚀 Preloading ${queue.length} words in background...`);
      setIsLoading(true);

      // ✅ FIX: Limit to 2 concurrent preloads to prevent memory overflow
      const MAX_CONCURRENT = 2;

      for (let i = 0; i < queue.length; i += MAX_CONCURRENT) {
          const batch = queue.slice(i, i + MAX_CONCURRENT);
          const batchPromises = batch.map(async (word) => {
              try {
                  const result = await generateWordExplanation(word.text, profile, context);
                  setWordExplanation(word.id, result);

                  // Preload TTS audio
                  if (result.example) {
                      preloadAudio(result.example);
                  }
                  if (word.text) {
                      preloadAudio(word.text);
                  }

                  console.log(`✅ Preloaded: ${word.text}`);
              } catch (e) {
                  console.error(`❌ Failed to preload ${word.text}:`, e);
              }
          });

          await Promise.all(batchPromises);
      }

      setIsLoading(false);
      console.log('🎉 All words preloaded!');
  };


  // --- Views ---

  if (learnState.currentStep === 'input-context') {
    return (
      <>
        <ContextInput
          profile={profile}
          words={words}
          learningQueue={learnState.learningQueue}
          onStartSession={handleStartSession}
          onSaveContext={addSavedContext}
          openDictionary={openDictionary}
          showToast={showToast}
        />
        <DictionaryModal />
      </>
    );
  }

  if (learnState.currentStep === 'learning') {
    return (
      <>
      <div className="max-w-xl mx-auto p-4 flex flex-col h-full">
        {/* Header Progress */}
        <div className="flex justify-between items-center mb-6">
           <div className="flex flex-col">
             <span className="text-tiny font-medium text-gray-500 uppercase tracking-wide">
               Word {learnState.currentWordIndex + 1} / {learnState.learningQueue.length}
             </span>
             <div className="flex gap-1 mt-1">
                 <div className={`h-1 w-6 rounded ${learnState.wordSubStep === 'explanation' ? 'bg-gray-900' : 'bg-gray-300'}`}></div>
                 <div className={`h-1 w-6 rounded ${learnState.wordSubStep === 'shadowing' ? 'bg-gray-900' : 'bg-gray-300'}`}></div>
                 <div className={`h-1 w-6 rounded ${learnState.wordSubStep === 'creation' ? 'bg-gray-900' : 'bg-gray-300'}`}></div>
             </div>
           </div>
           <div className="flex items-center justify-between">
             {/* Left: Back button (primary action) */}
             <button
               onClick={handleGoBack}
               disabled={isAtBeginning}
               className={`flex items-center gap-1 px-4 py-2 rounded transition-colors ${
                 isAtBeginning
                   ? 'text-gray-300 cursor-not-allowed'
                   : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 font-medium'
               }`}
             >
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
               </svg>
               Back
             </button>

             {/* Right: Exit button (secondary action, subtle) */}
             <button
               onClick={() => navigate('/')}
               className="text-small text-gray-400 hover:text-red-500 transition-colors underline"
             >
               Exit
             </button>
           </div>
        </div>

        {isLoading && !explanation && (
            <div className="flex-1 flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
                <p className="text-body text-gray-500">
                  {loadingProgress
                    ? `Loading ${loadingProgress.current} of ${loadingProgress.total} words...`
                    : 'Preparing lesson...'}
                </p>
            </div>
        )}

        {explanation && (
            <div className="flex-1 flex flex-col space-y-6 overflow-y-auto pb-24">

                {/* 1. Explanation View */}
                {learnState.wordSubStep === 'explanation' && (
                    <WordExplanationComponent
                      word={currentWord.text}
                      explanation={explanation}
                      onNext={handleNextStep}
                      onCopyText={handleCopyText}
                      openDictionary={openDictionary}
                      copiedText={copiedText}
                      isLoading={isLoading}
                    />
                )}

                {/* 2. Shadowing View */}
                {learnState.wordSubStep === 'shadowing' && (
                    <ShadowingPractice
                      word={currentWord.text}
                      exampleSentence={explanation.example}
                      isRecording={isRecording}
                      isTranscribing={isTranscribing}
                      transcript={transcript}
                      textInput={textInput}
                      shadowingFeedback={shadowingFeedback}
                      isLoading={isLoading}
                      onToggleRecording={handleToggleRecording}
                      onTextInputChange={setTextInput}
                      onTextSubmit={handleTextSubmit}
                      onSkip={handleSkipShadowing}
                      onNext={handleNextFromShadowing}
                      onRetry={() => { setShadowingFeedback(null); setTranscript(''); }}
                      openDictionary={openDictionary}
                    />
                )}

                {/* 3. Creation View */}
                {learnState.wordSubStep === 'creation' && (
                    <SentenceCreation
                      word={currentWord.text}
                      currentSentenceIndex={learnState.currentSentenceIndex}
                      isRecording={isRecording}
                      isTranscribing={isTranscribing}
                      transcript={transcript}
                      textInput={textInput}
                      evaluation={evaluation}
                      isLoading={isLoading}
                      onToggleRecording={handleToggleRecording}
                      onTextInputChange={setTextInput}
                      onTextSubmit={handleTextSubmit}
                      onSkip={handleSkipCreation}
                      onNext={handleNextFromCreation}
                      onRetry={() => { setEvaluation(null); setTranscript(''); }}
                      openDictionary={openDictionary}
                    />
                )}
            </div>
        )}
      </div>
      <DictionaryModal />
      </>
    );
  }

  // ✅ Review Step - Practice sentences
  if (learnState.currentStep === 'review') {
    const currentWord = learnState.learningQueue[learnState.currentWordIndex];

    const handleReviewComplete = async (stats: { retryCount: number, skipped: boolean }) => {
      // Update review stats for this word
      updateReviewStats(currentWord.id, stats);

      // Check if all words reviewed
      if (learnState.currentWordIndex >= learnState.learningQueue.length - 1) {
        // All review done, complete session
        showToast("Review completed!", "success");

        // ✅ Record check-in
        const today = new Date().toISOString().split('T')[0];
        const wordIds = learnState.learningQueue.map(w => w.id);
        const existingCheckIn = getCheckInRecord(today);
        const newGroupCount = (existingCheckIn?.groupsCompleted || 0) + 1;

        addCheckIn(today, newGroupCount, wordIds);

        // ✅ Check if eligible for makeup check-in (2+ groups today)
        if (newGroupCount >= 2) {
          const eligible = getMakeupEligibleDates();
          if (eligible.length > 0) {
            setEligibleDates(eligible);
            setExtraGroups(newGroupCount - 1);
            setShowMakeupModal(true);
          }
        }

        resetSession();
        navigate('/');
      } else {
        // Move to next word
        nextReviewWord(true);
      }
    };

    return (
      <>
        <ReviewMode
          currentWord={currentWord}
          currentWordIndex={learnState.currentWordIndex}
          totalWords={learnState.learningQueue.length}
          isLoading={isLoading}
          onReviewComplete={handleReviewComplete}
          onSkipWord={() => nextReviewWord(false)}
        />
        <DictionaryModal />
        {/* ✅ Makeup Check-in Modal */}
        <MakeupCheckInModal
          isOpen={showMakeupModal}
          onClose={() => setShowMakeupModal(false)}
          eligibleDates={eligibleDates}
          onConfirm={(targetDate) => {
            makeupCheckIn(targetDate);
            setShowMakeupModal(false);
          }}
          extraGroups={extraGroups}
        />
      </>
    );
  }

  return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;
};
