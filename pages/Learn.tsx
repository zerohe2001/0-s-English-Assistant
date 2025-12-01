
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { generateWordExplanation, evaluateUserSentence, evaluateShadowing, generateConversationScene, generateSessionSummary } from '../services/gemini';
import LiveSession from '../components/LiveSession';
import ClickableText from '../components/ClickableText';
import { WordExplanation, SentenceEvaluation } from '../types';

// Helper for Speech Recognition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const Learn = () => {
  const { 
    profile, 
    learnState, 
    setDailyContext, 
    startLearning, 
    setWordSubStep,
    nextWord, 
    completeLearningPhase,
    setSessionSummary,
    resetSession,
    words,
    addSavedContext
  } = useStore();

  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState<WordExplanation | null>(null);
  
  // Input State
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [manualContext, setManualContext] = useState('');
  const [isListeningContext, setIsListeningContext] = useState(false);
  
  // Practice State
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [evaluation, setEvaluation] = useState<SentenceEvaluation | null>(null);
  const [shadowingFeedback, setShadowingFeedback] = useState<{isCorrect: boolean, feedback: string} | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Rec
  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        
        // If we are in context input step
        if (learnState.currentStep === 'input-context') {
             setManualContext(prev => {
                 const spacer = prev ? ' ' : '';
                 return prev + spacer + text;
             });
             setIsListeningContext(false);
        } else {
             // Normal practice flow
             setTranscript(text);
             handleSpeechResult(text);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error("Speech rec error", event);
        setIsRecording(false);
        setIsListeningContext(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setIsListeningContext(false);
      };

      recognitionRef.current = recognition;
    }
  }, [learnState.currentStep]); // Re-bind if step changes

  const currentWord = learnState.learningQueue[learnState.currentWordIndex];

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
    setIsLoading(true);
    setExplanation(null);
    try {
      const result = await generateWordExplanation(currentWord.text, profile, learnState.dailyContext);
      setExplanation(result);
      speak(result.example);
    } catch (e) {
      console.error(e);
      alert("Failed to load word data. Check API Key or Connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const speak = (text: string) => {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
  };

  const handleToggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported in this browser. Please use Chrome or Safari.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      setIsRecording(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start recording:", e);
        setIsRecording(false);
      }
    }
  };

  const handleToggleContextMic = () => {
     if (!recognitionRef.current) {
         alert("Speech recognition not supported.");
         return;
     }
     if (isListeningContext) {
         recognitionRef.current.stop();
     } else {
         setIsListeningContext(true);
         try {
             recognitionRef.current.start();
         } catch(e) {
             setIsListeningContext(false);
         }
     }
  }

  const handleSpeechResult = async (text: string) => {
      setIsLoading(true);
      try {
        if (learnState.wordSubStep === 'shadowing') {
            // Check shadowing
            if (!explanation) return;
            const result = await evaluateShadowing(explanation.example, text);
            setShadowingFeedback(result);
        } else if (learnState.wordSubStep === 'creation') {
            // Check sentence creation
            const result = await evaluateUserSentence(currentWord.text, text, learnState.dailyContext);
            setEvaluation(result);
        }
      } catch (error) {
          console.error("Evaluation failed", error);
          alert("Failed to evaluate speech. Please try again.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleNextStep = async () => {
      if (learnState.wordSubStep === 'explanation') {
          setWordSubStep('shadowing');
      } else if (learnState.wordSubStep === 'shadowing') {
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

  const handleStartSession = () => {
      // Combine manual text and selected cards
      const selectedTexts = profile.savedContexts
        .filter(c => selectedContextIds.includes(c.id))
        .map(c => c.text);
      
      const combined = [manualContext, ...selectedTexts].join('. ').trim();
      
      if (!combined) {
          alert("Please provide some context to start.");
          return;
      }
      
      setDailyContext(combined);
      startLearning();
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
    );
  }

  if (learnState.currentStep === 'learning') {
    return (
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
                            <h1 className="text-5xl font-extrabold text-primary mb-4">{currentWord.text}</h1>
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
                                <button 
                                  onClick={(e) => { e.stopPropagation(); speak(explanation.example); }} 
                                  className="text-blue-600 hover:text-blue-800 p-1 bg-white/50 rounded-full"
                                >
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                </button>
                            </div>
                            
                            <div className="text-lg text-slate-800 italic leading-relaxed">
                                "<ClickableText text={explanation.example} />"
                            </div>
                            
                            {showTranslation ? (
                                <p className="mt-3 pt-3 border-t border-blue-200 text-slate-600 animate-fade-in font-medium">
                                    {explanation.exampleTranslation}
                                </p>
                            ) : (
                                <div className="mt-4 flex items-center justify-end">
                                    <span className="text-xs text-blue-400 flex items-center bg-white/50 px-2 py-1 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                                        Tap card for Chinese
                                    </span>
                                </div>
                            )}
                        </div>

                        <button onClick={handleNextStep} className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition">
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
                            {!shadowingFeedback ? (
                                <>
                                    <button 
                                      onClick={handleToggleRecording}
                                      className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 animate-pulse shadow-red-200' : 'bg-primary shadow-indigo-200'} shadow-xl`}
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
                                    <p className="mt-4 text-slate-400 font-medium">{isRecording ? "Tap to Stop" : "Tap to Speak"}</p>
                                </>
                            ) : (
                                <div className="w-full space-y-4">
                                     <div className={`p-4 rounded-xl ${shadowingFeedback.isCorrect ? 'bg-green-100 border-green-200' : 'bg-orange-100 border-orange-200'} border`}>
                                         <p className="font-bold text-lg mb-1">{shadowingFeedback.isCorrect ? "Good Job!" : "Try Again"}</p>
                                         <p className="text-sm opacity-90">{shadowingFeedback.feedback}</p>
                                     </div>
                                     <div className="text-center p-2 text-slate-500 text-sm">You said: "{transcript}"</div>
                                     
                                     <div className="flex gap-3">
                                         <button onClick={() => { setShadowingFeedback(null); setTranscript(''); }} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-600">Retry</button>
                                         {shadowingFeedback.isCorrect && (
                                            <button onClick={handleNextStep} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold">Use It &rarr;</button>
                                         )}
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
                             <p className="text-slate-500">Make your own sentence using <strong className="text-primary">{currentWord.text}</strong>.</p>
                         </div>

                         <div className="flex flex-col items-center">
                            {!evaluation ? (
                                <>
                                    <button 
                                      onClick={handleToggleRecording}
                                      className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 animate-pulse shadow-red-200' : 'bg-secondary shadow-emerald-200'} shadow-xl`}
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
                                    <p className="mt-4 text-slate-400 font-medium">{isRecording ? "Tap to Stop" : "Tap to Create Sentence"}</p>
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
                                     
                                     <div className="flex gap-3 mt-2">
                                         <button onClick={() => { setEvaluation(null); setTranscript(''); }} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-600">Try Again</button>
                                         <button onClick={handleNextStep} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold">
                                             {learnState.currentWordIndex < learnState.learningQueue.length - 1 ? 'Next Word' : 'Finish & Chat'} &rarr;
                                         </button>
                                     </div>
                                </div>
                            )}
                         </div>
                    </div>
                )}
            </div>
        )}
      </div>
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
      <LiveSession
        profile={profile}
        context={learnState.dailyContext}
        words={learnState.learningQueue.map(w => w.text)}
        scene={learnState.generatedScene || "A casual conversation."}
        onComplete={handleConversationComplete}
        onCancel={resetSession}
      />
    );
  }

  if (learnState.currentStep === 'summary' && learnState.sessionSummary) {
      return (
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
      )
  }

  return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
};
