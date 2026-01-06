
import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
// ✅ Use Gemini for text generation
import { generateWordExplanation, evaluateUserSentence, evaluateShadowing, translateToChinese } from '../services/gemini';
import { speak, preloadAudio } from '../services/tts';
import ClickableText from '../components/ClickableText';
import DictionaryModal from '../components/DictionaryModal';
import ReviewWord from '../components/ReviewWord';
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
    words,
    addSavedContext,
    setWordExplanation, // ✅ Add method to store explanations
    markWordAsLearned, // ✅ Mark word as learned
    openDictionary, // ✅ Open dictionary modal for word lookup
    saveUserSentence, // ✅ Save user's created sentence (for scene generation)
    addUserSentence, // ✅ Add sentence to Word's userSentences array
    showToast
  } = useStore();

  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null); // ✅ Track copied text for feedback
  const [isPending, startTransition] = useTransition(); // ✅ React 19 concurrent feature

  // ✅ Read explanation from store instead of local state
  const currentWord = learnState.learningQueue?.[learnState.currentWordIndex];
  const explanation = currentWord && learnState.wordExplanations && currentWord.id in learnState.wordExplanations
    ? learnState.wordExplanations[currentWord.id]
    : null;

  // Input State
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [manualContext, setManualContext] = useState('');
  const [isListeningContext, setIsListeningContext] = useState(false);

  // Practice State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false); // ✅ Show "Processing..." state
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState(''); // ✅ For typed input (alternative to speech)
  const [evaluation, setEvaluation] = useState<SentenceEvaluation | null>(null);
  const [shadowingFeedback, setShadowingFeedback] = useState<{isCorrect: boolean, feedback: string} | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const recorderRef = useRef<DeepgramRecorder | null>(null);
  const processingRef = useRef(false); // ✅ Prevent race conditions in speech evaluation

  // Initialize Deepgram Recorder
  useEffect(() => {
    const recorder = new DeepgramRecorder();
    recorderRef.current = recorder;

    // Initialize microphone access
    recorder.initialize().catch((error) => {
      console.error('❌ Failed to initialize recorder:', error);
      // Microphone access will be requested on first recording attempt
    });

    // ✅ Cleanup: Force cleanup on unmount to prevent memory leaks
    return () => {
      if (recorderRef.current) {
        // ✅ FIX: Always cleanup, even if recording (component is unmounting)
        // This ensures WebSocket closes and microphone is released
        recorderRef.current.cleanup();
        recorderRef.current = null;
        console.log('🧹 Learn component unmounted - recorder cleaned up');
      }
    };
  }, []); // Run only once on mount

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

  // Clear state when step changes
  useEffect(() => {
    setTranscript('');
    setEvaluation(null);
    setShadowingFeedback(null);
    setShowTranslation(false);
  }, [learnState.wordSubStep, learnState.currentWordIndex]);

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

      // Load all words in parallel
      const promises = wordsToLoad.map(async (word) => {
        try {
          const result = await generateWordExplanation(word.text, profile, learnState.dailyContext);
          setWordExplanation(word.id, result);
          completedCount++;
          setLoadingProgress({ current: completedCount, total: wordsToLoad.length });
          console.log(`✅ Loaded ${completedCount}/${wordsToLoad.length}: ${word.text}`);

          // Preload audio in background
          if (result.example) {
            preloadAudio(result.example);
          }
        } catch (error) {
          console.error(`❌ Failed to load ${word.text}:`, error);
          completedCount++;
          setLoadingProgress({ current: completedCount, total: wordsToLoad.length });
        }
      });

      await Promise.all(promises);
      console.log(`🎉 Batch loading completed! Loaded ${wordsToLoad.length} words`);
    } catch (error) {
      console.error('❌ Batch loading error:', error);
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
    if (!recorderRef.current) {
      showToast("Speech recognition not available. Please check your microphone permissions.", "error");
      return;
    }

    if (isRecording) {
      // Stop recording and transcribe
      recorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(true); // ✅ Show "Processing..." state
    } else {
      // Start recording
      setTranscript('');
      setIsRecording(true);

      try {
        // Ensure recorder is initialized
        if (!recorderRef.current.recording) {
          await recorderRef.current.initialize().catch(() => {
            // Already initialized, ignore
          });
        }

        recorderRef.current.start(
          (transcript: string) => {
            // ✅ Transcript from Deepgram (received after stop)
            console.log(`✅ Deepgram transcript:`, transcript);

            setTranscript(transcript);
            setIsTranscribing(false);

            // Process the transcript based on current step
            if (learnState.currentStep === 'input-context') {
              setManualContext(prev => {
                const spacer = prev ? ' ' : '';
                return prev + spacer + transcript;
              });
              setIsListeningContext(false);
            } else {
              // Normal practice flow - evaluate
              handleSpeechResult(transcript);
            }
          },
          (error: Error) => {
            console.error('❌ Deepgram error:', error);
            showToast(`Speech recognition failed: ${error.message}`, "error");
            setIsRecording(false);
            setIsTranscribing(false);
          }
        );
      } catch (e) {
        console.error("Failed to start recording:", e);
        setIsRecording(false);
        showToast("Failed to access microphone. Please check your browser permissions.", "error");
      }
    }
  };

  const handleToggleContextMic = async () => {
     // Use the same recorder for context input
     if (!recorderRef.current) {
         showToast("Speech recognition not available.", "error");
         return;
     }
     if (isListeningContext) {
         recorderRef.current.stop();
         setIsListeningContext(false);
     } else {
         setIsListeningContext(true);
         try {
             await recorderRef.current.initialize().catch(() => {
               // Already initialized, ignore
             });
             recorderRef.current.start(
               (transcript: string) => {
                 // ✅ Context input transcript
                 console.log(`✅ Context transcript:`, transcript);

                 setManualContext(prev => {
                   const spacer = prev ? ' ' : '';
                   return prev + spacer + transcript;
                 });
                 setIsListeningContext(false);
               },
               (error: Error) => {
                 console.error('❌ Context mic error:', error);
                 showToast(`Speech recognition failed: ${error.message}`, "error");
                 setIsListeningContext(false);
               }
             );
         } catch(e) {
             setIsListeningContext(false);
             showToast("Failed to access microphone.", "error");
         }
     }
  }

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

            const result = await evaluateShadowing(explanation.example, text);
            console.log("Shadowing result:", result);
            setShadowingFeedback(result);
        } else if (learnState.wordSubStep === 'creation') {
            // Check sentence creation
            console.log("Evaluating user sentence...");
            const result = await evaluateUserSentence(currentWord.text, text, learnState.dailyContext);
            console.log("Sentence evaluation result:", result);
            setEvaluation(result);
        }
      } catch (error) {
          console.error("Evaluation failed", error);
          showToast("Failed to evaluate speech. Please try again.", "error");
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
  const handleNextFromCreation = async () => {
      if (currentWord && transcript && transcript.trim()) {
          const userSentence = transcript.trim();

          // Save to learnState for scene generation
          saveUserSentence(currentWord.id, userSentence);
          console.log('✅ Saved user sentence for scene:', userSentence);

          // ✅ FIX: Try translation, then add to userSentences array
          try {
            const translation = await translateToChinese(userSentence);
            addUserSentence(currentWord.id, userSentence, translation);
            console.log(`✅ Added sentence ${learnState.currentSentenceIndex + 1}/3 to Word with translation:`, translation);
          } catch (translationError) {
            console.error('❌ Translation failed:', translationError);
            // Save with placeholder translation - can retry later
            addUserSentence(currentWord.id, userSentence, '[Translation pending]');
            showToast('Sentence saved (translation failed)', 'warning');
          }
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
          // Move to next sentence (0->1 or 1->2)
          setEvaluation(null);
          setTranscript('');
          nextSentence();
          console.log(`✅ Moving to sentence ${learnState.currentSentenceIndex + 2}/3`);
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
    // Clear current UI state when going back
    setTranscript('');
    setTextInput('');
    setEvaluation(null);
    setShadowingFeedback(null);

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

  const handleStartSession = async () => {
      // Combine manual text and selected cards

      const savedContexts = profile.savedContexts || [];
      const selectedTexts = savedContexts
        .filter(c => selectedContextIds.includes(c.id))
        .map(c => c.text);

      const combined = [manualContext, ...selectedTexts].join('. ').trim();

      if (!combined) {
          showToast("Please provide some context to start.", "warning");
          return;
      }

      setDailyContext(combined);

      // Manually transition to learning step (startLearning would reset to input-context)
      const queue = words.filter(w => !w.learned).slice(0, 5);
      if (queue.length === 0 && words.length > 0) {
          queue.push(...[...words].sort(() => 0.5 - Math.random()).slice(0, 5));
      }

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
                  const result = await generateWordExplanation(word.text, profile, combined);
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

  const handleSaveContext = () => {
      if (!manualContext.trim()) return;
      addSavedContext(manualContext);
      setManualContext('');
      showToast("Context saved to Profile!", "success");
  };

  const toggleContextCard = (id: string) => {
      if (selectedContextIds.includes(id)) {
          setSelectedContextIds(selectedContextIds.filter(cid => cid !== id));
      } else {
          setSelectedContextIds([...selectedContextIds, id]);
      }
  }

  // --- Views ---

  if (learnState.currentStep === 'input-context') {
    const hasContent = manualContext.trim().length > 0 || selectedContextIds.length > 0;

    // ✅ Calculate which words will be learned
    const previewWords = learnState.learningQueue && learnState.learningQueue.length > 0
      ? learnState.learningQueue  // Already selected (from Vocabulary page)
      : words.filter(w => !w.learned).slice(0, 5).length > 0
        ? words.filter(w => !w.learned).slice(0, 5)  // Default: first 5 unlearned
        : [...words].sort(() => 0.5 - Math.random()).slice(0, 5);  // Fallback: random 5

    return (
      <>
      <div className="max-w-lg mx-auto p-6 flex flex-col h-full overflow-y-auto pb-24">
        <header className="mb-6">
            <h2 className="text-h1 text-gray-900 mb-2">What's the plan?</h2>
            <p className="text-body text-gray-500">Describe your day or choose a saved scenario.</p>
        </header>

        {/* Words Preview - Show which words will be learned */}
        {previewWords && previewWords.length > 0 && (
            <div className="mb-6 bg-gray-100 p-4 rounded border border-gray-300">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-small font-medium text-gray-900 uppercase tracking-wide">
                        Words for this session
                    </h3>
                    <span className="text-tiny bg-white px-2 py-1 rounded text-gray-700 font-medium border border-gray-300">
                        {previewWords.length} {previewWords.length === 1 ? 'word' : 'words'}
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {previewWords.map((word, index) => (
                        <span
                            key={word.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-gray-900 rounded font-medium text-small border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => openDictionary(word.text)}
                            title="Click to see dictionary definition"
                        >
                            <span className="text-tiny text-gray-500 font-medium">{index + 1}.</span>
                            {word.text}
                        </span>
                    ))}
                </div>
                <p className="text-tiny text-gray-500 mt-3">
                    Tip: Select specific words in the Vocabulary page
                </p>
            </div>
        )}

        {/* Input Area */}
        <div className="relative mb-6">
            <textarea
                className="w-full p-4 pr-12 border border-gray-300 rounded outline-none text-body h-32 resize-none focus:border-gray-500"
                placeholder="e.g. I'm going to Costco to buy groceries..."
                value={manualContext}
                onChange={(e) => setManualContext(e.target.value)}
            />
            <button
                onClick={handleToggleContextMic}
                className={`absolute bottom-4 right-4 p-2 rounded-full transition-all ${isListeningContext ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
            </button>
        </div>

        {manualContext.trim() && (
            <button
                onClick={handleSaveContext}
                className="text-small text-gray-900 font-medium flex items-center mb-6 hover:text-gray-700 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Save this to Profile
            </button>
        )}

        {/* Saved Cards */}
        {profile.savedContexts && profile.savedContexts.length > 0 && (
            <div className="mb-6">
                <h3 className="text-small font-medium text-gray-500 uppercase tracking-wide mb-3">Saved Contexts</h3>
                <div className="grid grid-cols-1 gap-2">
                    {profile.savedContexts.map(ctx => (
                        <div
                            key={ctx.id}
                            onClick={() => toggleContextCard(ctx.id)}
                            className={`p-4 rounded border cursor-pointer transition-all ${
                                selectedContextIds.includes(ctx.id)
                                ? 'bg-gray-100 border-gray-900'
                                : 'bg-white border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-start">
                                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center mr-3 ${selectedContextIds.includes(ctx.id) ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
                                    {selectedContextIds.includes(ctx.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <p className={`text-small ${selectedContextIds.includes(ctx.id) ? 'text-gray-900' : 'text-gray-700'}`}>{ctx.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <button
          onClick={handleStartSession}
          disabled={!hasContent || words.length === 0}
          className="mt-auto w-full bg-gray-900 text-white py-4 rounded font-medium text-body hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {words.length === 0 ? "Add Words First" : "Start Session"}
        </button>
      </div>
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
           <div className="flex gap-3">
             <button
               onClick={handleGoBack}
               disabled={isAtBeginning}
               className={`text-small transition-colors ${isAtBeginning ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-900'}`}
             >
               返回
             </button>
             <button onClick={resetSession} className="text-small text-gray-500 hover:text-red-600 transition-colors">Exit</button>
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
                    <div className="animate-fade-in space-y-6">
                        <div className="bg-white p-8 rounded border border-gray-300 text-center relative group">
                            <h1
                              className="text-h1 font-bold text-gray-900 mb-2 cursor-pointer hover:text-gray-700 transition-colors"
                              onClick={() => openDictionary(currentWord.text)}
                              title="Click to see full dictionary definition"
                            >
                              {currentWord.text}
                            </h1>

                            {/* Phonetic + Play Button */}
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <span className="text-body text-gray-500 font-mono">{explanation.phonetic}</span>
                                <button
                                  onClick={() => speak(currentWord.text)}
                                  className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-all"
                                  title="Play pronunciation"
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
                                    onClick={(e) => { e.stopPropagation(); handleCopyText(explanation.example); }}
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
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
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
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                                        Tap for Chinese
                                    </span>
                                </div>
                            )}
                        </div>

                        <button
                          onClick={handleNextStep}
                          disabled={isLoading}
                          className="w-full bg-gray-900 text-white py-4 rounded font-medium text-body hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Practice Pronunciation →
                        </button>
                    </div>
                )}

                {/* 2. Shadowing View */}
                {learnState.wordSubStep === 'shadowing' && (
                    <div className="animate-fade-in space-y-6">
                         <div className="text-center">
                             <h2 className="text-h2 text-gray-900 mb-2">Shadowing</h2>
                             <p className="text-body text-gray-500">Read the example sentence aloud.</p>
                         </div>

                         <div className="bg-gray-100 p-6 rounded border border-gray-300">
                             <div className="text-body text-gray-900 italic mb-4">
                                 "<ClickableText text={explanation.example} />"
                             </div>
                             <button onClick={() => speak(explanation.example)} className="flex items-center text-small text-gray-700 font-medium hover:text-gray-900 transition-colors">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                 Listen Again
                             </button>
                         </div>

                         <div className="flex flex-col items-center">
                            {isLoading ? (
                                <div className="flex flex-col items-center space-y-4">
                                    <div className="w-16 h-16 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-body text-gray-500 font-medium">Evaluating your pronunciation...</p>
                                </div>
                            ) : !shadowingFeedback ? (
                                <>
                                    <div className="flex flex-col items-center space-y-4 w-full">
                                        {/* Target sentence hint */}
                                        <div className="bg-gray-100 border border-gray-300 rounded p-4 w-full max-w-md">
                                            <p className="text-tiny text-gray-700 font-medium mb-2">READ THIS ALOUD:</p>
                                            <p className="text-gray-900 font-medium text-center">
                                                "<span
                                                  className="cursor-pointer hover:text-gray-700 transition-colors underline"
                                                  onClick={() => openDictionary(currentWord.text)}
                                                  title="Click to see dictionary definition"
                                                >
                                                  {currentWord.text}
                                                </span>"
                                            </p>
                                            <p className="text-tiny text-gray-500 mt-2 text-center">
                                                Speak clearly and click Stop when done
                                            </p>
                                        </div>

                                        <button
                                          onClick={handleToggleRecording}
                                          disabled={isLoading}
                                          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-900'} disabled:opacity-50`}
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
                                              onChange={(e) => setTextInput(e.target.value)}
                                              placeholder="Type the sentence here..."
                                              className="w-full px-4 py-3 border border-gray-300 rounded text-small outline-none focus:border-gray-500 resize-none h-20"
                                              disabled={isLoading || isRecording}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                  e.preventDefault();
                                                  handleTextSubmit();
                                                }
                                              }}
                                            />
                                            <button
                                              onClick={handleTextSubmit}
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
                                    {/* Skip button - allows skipping without recording */}
                                    <button
                                      onClick={handleSkipShadowing}
                                      className="mt-6 px-6 py-2 text-gray-500 hover:text-gray-900 font-medium text-small underline transition-colors"
                                    >
                                      Skip (Don't mark as learned) →
                                    </button>
                                </>
                            ) : (
                                <div className="w-full space-y-4">
                                     <div className={`p-4 rounded border ${shadowingFeedback.isCorrect ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                                         <p className="font-medium text-body mb-1">{shadowingFeedback.isCorrect ? "Good Job!" : "Try Again"}</p>
                                         <p className="text-small">{shadowingFeedback.feedback}</p>
                                     </div>

                                     {/* Sentence Comparison */}
                                     <div className="bg-white rounded border border-gray-300 p-4 space-y-3">
                                         <div>
                                             <p className="text-tiny font-medium text-gray-500 uppercase mb-1">Target</p>
                                             <p className="text-gray-900 italic">"<ClickableText text={explanation.example} />"</p>
                                         </div>
                                         <div className="border-t border-gray-300"></div>
                                         <div>
                                             <p className="text-tiny font-medium text-gray-500 uppercase mb-1">You said</p>
                                             <p className="text-gray-900 italic">"<ClickableText text={transcript} />"</p>
                                         </div>
                                     </div>

                                     <div className="flex gap-3">
                                         <button onClick={() => { setShadowingFeedback(null); setTranscript(''); }} className="flex-1 py-3 bg-white border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50 transition-colors">Retry</button>
                                         <button onClick={handleSkipShadowing} className="flex-1 py-3 bg-gray-100 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-200 transition-colors">Skip</button>
                                         <button onClick={handleNextFromShadowing} className="flex-1 py-3 bg-gray-900 text-white rounded font-medium hover:bg-gray-700 transition-colors">Next →</button>
                                     </div>
                                </div>
                            )}
                         </div>
                    </div>
                )}

                {/* 3. Creation View */}
                {learnState.wordSubStep === 'creation' && (
                    <div className="animate-fade-in space-y-6">
                         <div className="text-center">
                             <h2 className="text-h2 text-gray-900 mb-2">Active Usage</h2>
                             <p className="text-body text-gray-500">
                               Make your own sentence using{' '}
                               <strong
                                 className="text-gray-900 cursor-pointer hover:text-gray-700 transition-colors underline"
                                 onClick={() => openDictionary(currentWord.text)}
                                 title="Click to see dictionary definition"
                               >
                                 {currentWord.text}
                               </strong>.
                             </p>
                             <p className="text-small text-blue-600 font-semibold mt-2">
                               Sentence {learnState.currentSentenceIndex + 1} of 3
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
                                                  onClick={() => openDictionary(currentWord.text)}
                                                  title="Click to see dictionary definition"
                                                >
                                                  "{currentWord.text}"
                                                </span>
                                            </p>
                                            <p className="text-tiny text-gray-500 mt-2 text-center">
                                                Speak your sentence clearly, then tap Stop
                                            </p>
                                        </div>

                                        <button
                                          onClick={handleToggleRecording}
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
                                        <p className="mt-4 text-gray-500 font-medium text-small">{isRecording ? "Recording... Tap to Stop" : isTranscribing ? "Processing..." : "Tap to Start Recording"}</p>

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
                                              onChange={(e) => setTextInput(e.target.value)}
                                              placeholder="Type your sentence here..."
                                              className="w-full px-4 py-3 border border-gray-300 rounded text-small outline-none focus:border-gray-500 resize-none h-20"
                                              disabled={isLoading || isRecording}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                  e.preventDefault();
                                                  handleTextSubmit();
                                                }
                                              }}
                                            />
                                            <button
                                              onClick={handleTextSubmit}
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
                                    {/* Skip button - allows skipping without recording */}
                                    <button
                                      onClick={handleSkipCreation}
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
                                         <button onClick={() => { setEvaluation(null); setTranscript(''); }} className="flex-1 py-3 bg-white border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50 transition-colors">Retry</button>
                                         <button onClick={handleSkipCreation} className="flex-1 py-3 bg-gray-100 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-200 transition-colors">Skip</button>
                                         <button onClick={handleNextFromCreation} className="flex-1 py-3 bg-gray-900 text-white rounded font-medium hover:bg-gray-700 transition-colors">Next →</button>
                                     </div>
                                </div>
                            )}
                         </div>
                    </div>
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

    if (!currentWord || !currentWord.userSentences || currentWord.userSentences.length === 0) {
      // Skip words without sentences
      nextReviewWord(false);
      return null;
    }

    const handleReviewComplete = async (stats: { retryCount: number, skipped: boolean }) => {
      // Update review stats for this word
      updateReviewStats(currentWord.id, stats);

      // Check if all words reviewed
      if (learnState.currentWordIndex >= learnState.learningQueue.length - 1) {
        // All review done, complete session
        showToast("Review completed!", "success");
        resetSession();
        navigate('/');
      } else {
        // Move to next word
        nextReviewWord(true);
      }
    };

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
      <>
        <ReviewWord
          word={currentWord.text}
          userSentences={currentWord.userSentences}
          onNext={handleReviewComplete}
        />
        <DictionaryModal />
      </>
    );
  }

  return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;
};
