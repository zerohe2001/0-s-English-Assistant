
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
// ✅ Use Claude for text generation (faster, more reliable, better quota)
import { generateWordExplanation, evaluateUserSentence, evaluateShadowing, generateConversationScene, generateSessionSummary, translateToChinese } from '../services/claude';
import { speak, preloadAudio } from '../services/tts';
import LiveSession from '../components/LiveSession';
import ClickableText from '../components/ClickableText';
import DictionaryModal from '../components/DictionaryModal';
import ReviewWord from '../components/ReviewWord';
import { WordExplanation, SentenceEvaluation } from '../types';
import { DeepgramRecorder } from '../services/deepgram-recorder';

export const Learn = () => {
  const {
    profile,
    learnState,
    setDailyContext,
    startLearning,
    setWordSubStep,
    nextWord,
    completeLearningPhase,
    nextReviewWord, // ✅ Move to next word in review
    updateReviewStats, // ✅ Update review statistics
    setSessionSummary,
    resetSession,
    words,
    addSavedContext,
    setWordExplanation, // ✅ Add method to store explanations
    markWordAsLearned, // ✅ Mark word as learned
    openDictionary, // ✅ Open dictionary modal for word lookup
    saveUserSentence, // ✅ Save user's created sentence (for scene generation)
    saveWordSentence // ✅ Save sentence to Word object (for review)
  } = useStore();

  const [isLoading, setIsLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null); // ✅ Track copied text for feedback

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

    // ✅ Cleanup: Stop recorder when component unmounts or step changes
    return () => {
      if (recorderRef.current) {
        recorderRef.current.cleanup();
        recorderRef.current = null;
      }
    };
  }, [learnState.currentStep]); // Re-initialize if step changes

  // Fetch word content when currentWord changes
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

  const loadWordContent = async () => {
    // ✅ Safety check: currentWord must exist
    if (!currentWord) {
      console.error('loadWordContent called but currentWord is undefined');
      return;
    }

    // ✅ Check if explanation already exists in store
    if (learnState.wordExplanations[currentWord.id]) {
      console.log('✨ Using cached explanation for:', currentWord.text);
      // Preload audio for cached explanation
      const cached = learnState.wordExplanations[currentWord.id];
      if (cached.example) {
        preloadAudio(cached.example);
      }
      return; // Don't regenerate
    }

    // Generate new explanation if not cached
    setIsLoading(true);
    try {
      const result = await generateWordExplanation(currentWord.text, profile, learnState.dailyContext);

      // ✅ Store in Zustand store instead of local state
      setWordExplanation(currentWord.id, result);

      // 🚀 Preload audio in background
      if (result.example) {
        console.log('⏳ Preloading audio for example sentence...');
        preloadAudio(result.example);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to load word data. Check API Key or Connection.");
    } finally {
      setIsLoading(false);
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
      alert('Failed to copy. Please try again.');
    }
  };

  const handleToggleRecording = async () => {
    if (!recorderRef.current) {
      alert("Speech recognition not available. Please check your microphone permissions.");
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
            // Transcript received from Deepgram
            console.log('✅ Deepgram transcript:', transcript);
            setTranscript(transcript);
            setIsTranscribing(false); // ✅ Stop showing "Processing..."

            // Process the transcript based on current step
            if (learnState.currentStep === 'input-context') {
              setManualContext(prev => {
                const spacer = prev ? ' ' : '';
                return prev + spacer + transcript;
              });
              setIsListeningContext(false);
            } else {
              // Normal practice flow - evaluate when stopped
              handleSpeechResult(transcript);
            }
          },
          (error: Error) => {
            console.error('❌ Deepgram error:', error);
            alert(`Speech recognition failed: ${error.message}`);
            setIsRecording(false);
            setIsTranscribing(false); // ✅ Stop showing "Processing..."
          }
        );
      } catch (e) {
        console.error("Failed to start recording:", e);
        setIsRecording(false);
        alert('Failed to access microphone. Please check your browser permissions.');
      }
    }
  };

  const handleToggleContextMic = async () => {
     // Use the same recorder for context input
     if (!recorderRef.current) {
         alert("Speech recognition not available.");
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
                 setManualContext(prev => {
                   const spacer = prev ? ' ' : '';
                   return prev + spacer + transcript;
                 });
                 setIsListeningContext(false);
               },
               (error: Error) => {
                 console.error('❌ Context mic error:', error);
                 alert(`Speech recognition failed: ${error.message}`);
                 setIsListeningContext(false);
               }
             );
         } catch(e) {
             setIsListeningContext(false);
             alert('Failed to access microphone.');
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
                alert("Error: No example sentence to compare against.");
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
          alert("Failed to evaluate speech. Please try again.");
      } finally {
          processingRef.current = false;
          setIsLoading(false);
      }
  };

  // ✅ Handle Next from Shadowing - marks word as learned
  const handleNextFromShadowing = () => {
      if (currentWord) {
          markWordAsLearned(currentWord.id);
          console.log('✅ Word marked as learned:', currentWord.text);
      }
      setWordSubStep('creation');
  };

  // ✅ Handle Skip from Shadowing - does NOT mark as learned
  const handleSkipShadowing = () => {
      console.log('⏭️ Skipped shadowing, word NOT marked as learned');
      setWordSubStep('creation');
  };

  // ✅ Handle Next from Creation - marks word as learned and moves to next
  const handleNextFromCreation = async () => {
      if (currentWord) {
          markWordAsLearned(currentWord.id);
          console.log('✅ Word marked as learned:', currentWord.text);

          // ✅ Save user's sentence if they created one
          if (transcript && transcript.trim()) {
              const userSentence = transcript.trim();

              // Save to learnState for scene generation
              saveUserSentence(currentWord.id, userSentence);
              console.log('✅ Saved user sentence for scene:', userSentence);

              // Generate and save translation to Word object for review
              try {
                  const translation = await translateToChinese(userSentence);
                  saveWordSentence(currentWord.id, userSentence, translation);
                  console.log('✅ Saved sentence to Word with translation:', translation);
              } catch (error) {
                  console.error('Failed to translate sentence:', error);
                  // Save without translation as fallback
                  saveWordSentence(currentWord.id, userSentence, '');
              }
          }
      }

      // Move to next word or conversation
      if (learnState.currentWordIndex >= learnState.learningQueue.length - 1) {
          setIsLoading(true);
          try {
              // ✅ Pass user sentences to scene generation
              const scene = await generateConversationScene(
                  profile,
                  learnState.dailyContext,
                  learnState.learningQueue.map(w => w.text),
                  learnState.userSentences // ✅ Include user's created sentences
              );
              completeLearningPhase(scene);
          } catch (error) {
              console.error(error);
              alert("Failed to generate conversation scene. Please try again.");
          } finally {
              setIsLoading(false);
          }
      } else {
          setEvaluation(null);
          setTranscript('');
          nextWord();
      }
  };

  // ✅ Handle Skip from Creation - does NOT mark as learned, moves to next
  const handleSkipCreation = async () => {
      console.log('⏭️ Skipped creation, word NOT marked as learned');

      // Move to next word or conversation (same logic as Next but without marking)
      if (learnState.currentWordIndex >= learnState.learningQueue.length - 1) {
          setIsLoading(true);
          try {
              // ✅ Pass user sentences to scene generation
              const scene = await generateConversationScene(
                  profile,
                  learnState.dailyContext,
                  learnState.learningQueue.map(w => w.text),
                  learnState.userSentences // ✅ Include user's created sentences
              );
              completeLearningPhase(scene);
          } catch (error) {
              console.error(error);
              alert("Failed to generate conversation scene. Please try again.");
          } finally {
              setIsLoading(false);
          }
      } else {
          setEvaluation(null);
          setTranscript('');
          nextWord();
      }
  };

  const handleNextStep = async () => {
      if (learnState.wordSubStep === 'explanation') {
          setWordSubStep('shadowing');
      } else if (learnState.wordSubStep === 'shadowing') {
          // Default behavior for other callers
          setWordSubStep('creation');
      } else if (learnState.wordSubStep === 'creation') {
          // Move to next word or conversation
          if (learnState.currentWordIndex >= learnState.learningQueue.length - 1) {
             setIsLoading(true);
             try {
                 const scene = await generateConversationScene(
                     profile, 
                     learnState.dailyContext, 
                     learnState.learningQueue.map(w => w.text)
                 );
                 completeLearningPhase(scene);
             } catch (e) {
                 console.error(e);
                 alert("Failed to generate conversation scene.");
             } finally {
                 setIsLoading(false);
             }
          } else {
             nextWord();
          }
      }
  };
  
  const handleConversationComplete = async (history: any[]) => {
      setIsLoading(true);
      try {
        const summary = await generateSessionSummary(
            history,
            learnState.learningQueue.map(w => w.text)
        );
        setSessionSummary(summary);
      } catch (e) {
          console.error(e);
          alert("Failed to generate summary.");
          resetSession(); // Fallback
      } finally {
          setIsLoading(false);
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
          alert("Please provide some context to start.");
          return;
      }

      setDailyContext(combined);
      startLearning();

      // ✅ PERFORMANCE OPTIMIZATION: Preload ALL words immediately
      // Get the learning queue that was just created by startLearning()
      const queue = words.filter(w => !w.learned).slice(0, 5);
      if (queue.length === 0 && words.length > 0) {
          queue.push(...[...words].sort(() => 0.5 - Math.random()).slice(0, 5));
      }

      console.log(`🚀 Preloading ${queue.length} words in background...`);
      setIsLoading(true);

      // Preload all words concurrently
      const preloadPromises = queue.map(async (word) => {
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

      // Wait for all to complete
      await Promise.all(preloadPromises);
      setIsLoading(false);
      console.log('🎉 All words preloaded!');
  };

  const handleSaveContext = () => {
      if (!manualContext.trim()) return;
      addSavedContext(manualContext);
      setManualContext('');
      alert("Context saved to Profile!");
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

    return (
      <>
      <div className="max-w-lg mx-auto p-6 flex flex-col h-full overflow-y-auto pb-24">
        <header className="mb-6">
            <h2 className="text-3xl font-bold mb-2 text-slate-900">What's the plan?</h2>
            <p className="text-slate-500">Describe your day or choose a saved scenario.</p>
        </header>
        
        {/* Input Area */}
        <div className="relative mb-6">
            <textarea
                className="w-full p-4 pr-12 border rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none text-lg h-32 resize-none"
                placeholder="e.g. I'm going to Costco to buy groceries..."
                value={manualContext}
                onChange={(e) => setManualContext(e.target.value)}
            />
            <button 
                onClick={handleToggleContextMic}
                className={`absolute bottom-4 right-4 p-2 rounded-full transition-all ${isListeningContext ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
        
        {manualContext.trim() && (
            <button 
                onClick={handleSaveContext}
                className="text-sm text-primary font-medium flex items-center mb-6 hover:underline"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Save this to Profile
            </button>
        )}

        {/* Saved Cards */}
        {profile.savedContexts && profile.savedContexts.length > 0 && (
            <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Saved Contexts</h3>
                <div className="grid grid-cols-1 gap-2">
                    {profile.savedContexts.map(ctx => (
                        <div 
                            key={ctx.id}
                            onClick={() => toggleContextCard(ctx.id)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                selectedContextIds.includes(ctx.id) 
                                ? 'bg-indigo-50 border-primary ring-1 ring-primary' 
                                : 'bg-white border-slate-200 hover:border-indigo-300'
                            }`}
                        >
                            <div className="flex items-start">
                                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center mr-3 ${selectedContextIds.includes(ctx.id) ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                                    {selectedContextIds.includes(ctx.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <p className={`text-sm ${selectedContextIds.includes(ctx.id) ? 'text-indigo-900' : 'text-slate-700'}`}>{ctx.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <button
          onClick={handleStartSession}
          disabled={!hasContent || words.length === 0}
          className="mt-auto w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
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
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
               Word {learnState.currentWordIndex + 1} / {learnState.learningQueue.length}
             </span>
             <div className="flex gap-1 mt-1">
                 <div className={`h-1 w-6 rounded ${learnState.wordSubStep === 'explanation' ? 'bg-primary' : 'bg-slate-200'}`}></div>
                 <div className={`h-1 w-6 rounded ${learnState.wordSubStep === 'shadowing' ? 'bg-primary' : 'bg-slate-200'}`}></div>
                 <div className={`h-1 w-6 rounded ${learnState.wordSubStep === 'creation' ? 'bg-primary' : 'bg-slate-200'}`}></div>
             </div>
           </div>
           <button onClick={resetSession} className="text-sm text-slate-400 hover:text-red-500">Exit</button>
        </div>

        {isLoading && !explanation && (
            <div className="flex-1 flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-slate-500">Preparing lesson...</p>
            </div>
        )}

        {explanation && (
            <div className="flex-1 flex flex-col space-y-6 overflow-y-auto pb-24">
                
                {/* 1. Explanation View */}
                {learnState.wordSubStep === 'explanation' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center relative group">
                            <h1
                              className="text-5xl font-extrabold text-primary mb-2 cursor-pointer hover:text-indigo-700 transition-colors"
                              onClick={() => openDictionary(currentWord.text)}
                              title="Click to see full dictionary definition"
                            >
                              {currentWord.text}
                            </h1>

                            {/* Phonetic + Play Button */}
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <span className="text-lg text-slate-500 font-mono">{explanation.phonetic}</span>
                                {/* ✅ Larger, more visible play button */}
                                <button
                                  onClick={() => speak(currentWord.text)}
                                  className="p-3 bg-indigo-100 hover:bg-indigo-200 rounded-full transition-all shadow-sm active:scale-95"
                                  title="Play pronunciation"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>

                            <div className="text-xl text-slate-700">
                                <ClickableText text={explanation.meaning} />
                            </div>
                            <div className="absolute top-2 right-2 text-xs text-slate-300 opacity-50">Tap words to define</div>
                        </div>
                        
                        <div
                          onClick={() => setShowTranslation(!showTranslation)}
                          className="bg-blue-50 p-6 rounded-2xl relative cursor-pointer active:scale-95 transition-all hover:bg-blue-100"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-blue-500 uppercase">Example</span>
                                <div className="flex gap-2">
                                  {/* Copy Button */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleCopyText(explanation.example); }}
                                    className={`${copiedText === explanation.example ? 'text-green-600' : 'text-blue-600 hover:text-blue-800'} p-1 bg-white/50 rounded-full transition-colors`}
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
                                    className="text-blue-600 hover:text-blue-800 p-1 bg-white/50 rounded-full"
                                    title="Play audio"
                                  >
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                  </button>
                                </div>
                            </div>
                            
                            <div className="text-lg text-slate-800 italic leading-relaxed">
                                "<ClickableText text={explanation.example} />"
                            </div>
                            
                            {showTranslation ? (
                                <p className="mt-3 pt-3 border-t border-blue-200 text-slate-600 animate-fade-in font-medium">
                                    {explanation.exampleTranslation}
                                </p>
                            ) : (
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-xs text-blue-400 flex items-center bg-white/50 px-2 py-1 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Copy to ask AI
                                    </span>
                                    <span className="text-xs text-blue-400 flex items-center bg-white/50 px-2 py-1 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                                        Tap for Chinese
                                    </span>
                                </div>
                            )}
                        </div>

                        <button
                          onClick={handleNextStep}
                          disabled={isLoading}
                          className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Practice Pronunciation &rarr;
                        </button>
                    </div>
                )}

                {/* 2. Shadowing View */}
                {learnState.wordSubStep === 'shadowing' && (
                    <div className="animate-fade-in space-y-6">
                         <div className="text-center">
                             <h2 className="text-2xl font-bold text-slate-900 mb-2">Shadowing</h2>
                             <p className="text-slate-500">Read the example sentence aloud.</p>
                         </div>

                         <div className="bg-blue-50 p-6 rounded-2xl">
                             <div className="text-lg text-slate-800 italic mb-4">
                                 "<ClickableText text={explanation.example} />"
                             </div>
                             <button onClick={() => speak(explanation.example)} className="flex items-center text-sm text-blue-600 font-medium">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                 Listen Again
                             </button>
                         </div>

                         <div className="flex flex-col items-center">
                            {isLoading ? (
                                <div className="flex flex-col items-center space-y-4">
                                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-500 font-medium">Evaluating your pronunciation...</p>
                                </div>
                            ) : !shadowingFeedback ? (
                                <>
                                    <div className="flex flex-col items-center space-y-4 w-full">
                                        {/* Target sentence hint */}
                                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 w-full max-w-md">
                                            <p className="text-xs text-blue-600 font-semibold mb-2">📢 READ THIS ALOUD:</p>
                                            <p className="text-blue-900 font-medium text-center">
                                                "<span
                                                  className="cursor-pointer hover:text-blue-600 transition-colors underline decoration-dotted"
                                                  onClick={() => openDictionary(currentWord.text)}
                                                  title="Click to see dictionary definition"
                                                >
                                                  {currentWord.text}
                                                </span>"
                                            </p>
                                            <p className="text-xs text-blue-500 mt-2 text-center">
                                                Speak clearly and click Stop when done
                                            </p>
                                        </div>

                                        <button
                                          onClick={handleToggleRecording}
                                          disabled={isLoading}
                                          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 animate-pulse shadow-red-200' : 'bg-primary shadow-indigo-200'} shadow-xl disabled:opacity-50`}
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
                                        <p className="mt-4 text-slate-400 font-medium">
                                            {isRecording ? "🔴 Recording... Tap to Stop" : isTranscribing ? "⏳ Processing..." : "Tap to Start Recording"}
                                        </p>
                                    </div>
                                    {isTranscribing && (
                                        <div className="mt-4 p-3 bg-blue-50 rounded-lg max-w-md animate-pulse">
                                            <p className="text-blue-600 text-sm">⏳ Transcribing your speech...</p>
                                        </div>
                                    )}
                                    {transcript && !isRecording && !isTranscribing && (
                                        <div className="mt-4 p-3 bg-slate-100 rounded-lg max-w-md">
                                            <p className="text-xs text-slate-500 mb-1">You said:</p>
                                            <p className="text-slate-700 italic">"{transcript}"</p>
                                        </div>
                                    )}
                                    {/* ✅ Skip button - allows skipping without recording */}
                                    <button
                                      onClick={handleSkipShadowing}
                                      className="mt-6 px-6 py-2 text-slate-500 hover:text-primary font-medium text-sm underline transition"
                                    >
                                      Skip (Don't mark as learned) →
                                    </button>
                                </>
                            ) : (
                                <div className="w-full space-y-4">
                                     <div className={`p-4 rounded-xl ${shadowingFeedback.isCorrect ? 'bg-green-100 border-green-200' : 'bg-orange-100 border-orange-200'} border`}>
                                         <p className="font-bold text-lg mb-1">{shadowingFeedback.isCorrect ? "✅ Good Job!" : "⚠️ Try Again"}</p>
                                         <p className="text-sm opacity-90">{shadowingFeedback.feedback}</p>
                                     </div>

                                     {/* ✅ Sentence Comparison */}
                                     <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                                         <div>
                                             <p className="text-xs font-bold text-slate-400 uppercase mb-1">Target</p>
                                             <p className="text-slate-700 italic">"{explanation.example}"</p>
                                         </div>
                                         <div className="border-t border-slate-100"></div>
                                         <div>
                                             <p className="text-xs font-bold text-slate-400 uppercase mb-1">You said</p>
                                             <p className="text-slate-700 italic">"{transcript}"</p>
                                         </div>
                                     </div>

                                     <div className="flex gap-3">
                                         <button onClick={() => { setShadowingFeedback(null); setTranscript(''); }} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition">Retry</button>
                                         <button onClick={handleSkipShadowing} className="flex-1 py-3 bg-slate-100 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-200 transition">Skip</button>
                                         <button onClick={handleNextFromShadowing} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-indigo-700 transition">Next &rarr;</button>
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
                             <h2 className="text-2xl font-bold text-slate-900 mb-2">Active Usage</h2>
                             <p className="text-slate-500">
                               Make your own sentence using{' '}
                               <strong
                                 className="text-primary cursor-pointer hover:text-indigo-700 transition-colors underline decoration-dotted"
                                 onClick={() => openDictionary(currentWord.text)}
                                 title="Click to see dictionary definition"
                               >
                                 {currentWord.text}
                               </strong>.
                             </p>
                         </div>

                         <div className="flex flex-col items-center">
                            {isLoading ? (
                                <div className="flex flex-col items-center space-y-4">
                                    <div className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-500 font-medium">Evaluating your sentence...</p>
                                </div>
                            ) : !evaluation ? (
                                <>
                                    <div className="flex flex-col items-center space-y-4 w-full">
                                        {/* Prompt hint */}
                                        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 w-full max-w-md">
                                            <p className="text-xs text-emerald-600 font-semibold mb-2">💡 TASK:</p>
                                            <p className="text-emerald-900 font-medium text-center">
                                                Create a sentence using{' '}
                                                <span
                                                  className="font-bold cursor-pointer hover:text-emerald-600 transition-colors underline decoration-dotted"
                                                  onClick={() => openDictionary(currentWord.text)}
                                                  title="Click to see dictionary definition"
                                                >
                                                  "{currentWord.text}"
                                                </span>
                                            </p>
                                            <p className="text-xs text-emerald-500 mt-2 text-center">
                                                Speak your sentence clearly, then tap Stop
                                            </p>
                                        </div>

                                        <button
                                          onClick={handleToggleRecording}
                                          disabled={isLoading}
                                          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 animate-pulse shadow-red-200' : 'bg-secondary shadow-emerald-200'} shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
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
                                        <p className="mt-4 text-slate-400 font-medium">{isRecording ? "🔴 Recording... Tap to Stop" : isTranscribing ? "⏳ Processing..." : "Tap to Start Recording"}</p>
                                    </div>
                                    {isTranscribing && (
                                        <div className="mt-4 p-3 bg-blue-50 rounded-lg max-w-md animate-pulse">
                                            <p className="text-blue-600 text-sm">⏳ Transcribing your speech...</p>
                                        </div>
                                    )}
                                    {transcript && !isRecording && !isTranscribing && (
                                        <div className="mt-4 p-3 bg-slate-100 rounded-lg max-w-md">
                                            <p className="text-xs text-slate-500 mb-1">You said:</p>
                                            <p className="text-slate-700 italic">"{transcript}"</p>
                                        </div>
                                    )}
                                    {/* ✅ Skip button - allows skipping without recording */}
                                    <button
                                      onClick={handleSkipCreation}
                                      className="mt-6 px-6 py-2 text-slate-500 hover:text-secondary font-medium text-sm underline transition"
                                    >
                                      Skip (Don't mark as learned) →
                                    </button>
                                </>
                            ) : (
                                <div className="w-full space-y-4">
                                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                         <span className="text-xs font-bold text-slate-400 uppercase">You Said</span>
                                         <p className="text-slate-800 mt-1">"{transcript}"</p>
                                     </div>

                                     <div className={`p-4 rounded-xl ${evaluation.isCorrect ? 'bg-green-100 border-green-200 text-green-800' : 'bg-orange-100 border-orange-200 text-orange-800'} border`}>
                                         <p className="font-bold">{evaluation.isCorrect ? "Valid Usage!" : "Needs Improvement"}</p>
                                         <p className="text-sm mt-1">{evaluation.feedback}</p>
                                     </div>

                                     {evaluation.betterWay && (
                                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                            <span className="text-xs font-bold text-indigo-400 uppercase">Better Way</span>
                                            <p className="text-indigo-900 mt-1">{evaluation.betterWay}</p>
                                        </div>
                                     )}

                                     <div className="flex gap-3">
                                         <button onClick={() => { setEvaluation(null); setTranscript(''); }} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition">Retry</button>
                                         <button onClick={handleSkipCreation} className="flex-1 py-3 bg-slate-100 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-200 transition">Skip</button>
                                         <button onClick={handleNextFromCreation} className="flex-1 py-3 bg-secondary text-white rounded-xl font-bold hover:bg-emerald-700 transition">Next &rarr;</button>
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

  // ✅ Review Step - Practice sentences before conversation
  if (learnState.currentStep === 'review') {
    const currentWord = learnState.learningQueue[learnState.currentWordIndex];

    if (!currentWord || !currentWord.userSentence || !currentWord.userSentenceTranslation) {
      // Skip words without sentences
      nextReviewWord(false);
      return null;
    }

    const handleReviewComplete = async (stats: { retryCount: number, skipped: boolean }) => {
      // Update review stats for this word
      updateReviewStats(currentWord.id, stats);

      // Check if all words reviewed
      if (learnState.currentWordIndex >= learnState.learningQueue.length - 1) {
        // All review done, generate scene and move to conversation
        setIsLoading(true);
        try {
          const scene = await generateConversationScene(
            profile,
            learnState.dailyContext,
            learnState.learningQueue.map(w => w.text),
            learnState.userSentences
          );
          completeLearningPhase(scene);
        } catch (error) {
          console.error(error);
          alert("Failed to generate conversation scene. Please try again.");
        } finally {
          setIsLoading(false);
        }
      } else {
        // Move to next word
        nextReviewWord(true);
      }
    };

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4 animate-fade-in p-6">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center">
            <p className="text-xl font-bold text-slate-800">准备对话场景</p>
            <p className="text-slate-500 mt-2">正在生成个性化对话...</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <ReviewWord
          word={currentWord.text}
          originalSentence={currentWord.userSentence}
          chineseTranslation={currentWord.userSentenceTranslation}
          onNext={handleReviewComplete}
        />
        <DictionaryModal />
      </>
    );
  }

  if (learnState.currentStep === 'conversation') {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4 animate-fade-in p-6">
                 <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                 <div className="text-center">
                     <p className="text-xl font-bold text-slate-800">Analyzing Conversation</p>
                     <p className="text-slate-500 mt-2">Generating your feedback and summary...</p>
                 </div>
            </div>
        )
    }
    return (
      <>
        <LiveSession
          profile={profile}
          context={learnState.dailyContext}
          words={learnState.learningQueue.map(w => w.text)}
          scene={learnState.generatedScene || "A casual conversation."}
          onComplete={handleConversationComplete}
          onCancel={resetSession}
        />
        <DictionaryModal />
      </>
    );
  }

  if (learnState.currentStep === 'summary' && learnState.sessionSummary) {
      return (
          <>
          <div className="max-w-xl mx-auto p-6 flex flex-col h-full overflow-y-auto pb-24">
              <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h1 className="text-3xl font-bold text-slate-900">Session Complete!</h1>
                  <p className="text-slate-500">Here is how you did.</p>
              </div>

              <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                      <h3 className="font-bold text-slate-800 mb-3">Feedback</h3>
                      <p className="text-slate-600 leading-relaxed">{learnState.sessionSummary.feedback}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 p-5 rounded-2xl border border-green-100">
                          <h3 className="font-bold text-green-800 mb-2">Used Active Words</h3>
                          <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                              {learnState.sessionSummary.usedWords.length > 0 ? 
                                learnState.sessionSummary.usedWords.map(w => <li key={w}>{w}</li>) :
                                <li>None yet!</li>
                              }
                          </ul>
                      </div>
                      <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
                          <h3 className="font-bold text-orange-800 mb-2">Missed Opportunities</h3>
                          <ul className="list-disc list-inside text-sm text-orange-700 space-y-1">
                              {learnState.sessionSummary.missedWords.length > 0 ? 
                                learnState.sessionSummary.missedWords.map(w => <li key={w}>{w}</li>) :
                                <li>Great! Used all.</li>
                              }
                          </ul>
                      </div>
                  </div>

                  <button 
                    onClick={resetSession}
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition"
                  >
                      Back to Home
                  </button>
              </div>
          </div>
          <DictionaryModal />
          </>
      )
  }

  return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
};
