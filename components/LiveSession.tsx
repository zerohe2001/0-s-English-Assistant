
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { UserProfile, ChatMessage } from '../types';
import { arrayBufferToBase64, base64ToUint8Array } from '../services/audioUtils';
import ClickableText from './ClickableText';

interface LiveSessionProps {
  profile: UserProfile;
  context: string;
  words: string[];
  scene: string;
  onComplete: (history: ChatMessage[]) => void;
  onCancel: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ profile, context, words, scene, onComplete, onCancel }) => {
  console.log('🎬 LiveSession component rendering. Scene:', scene);

  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'ended'>('connecting');
  const [micActive, setMicActive] = useState(true);
  const [transcriptDisplay, setTranscriptDisplay] = useState<{role: string, text: string} | null>(null);
  const [displayHistory, setDisplayHistory] = useState<ChatMessage[]>([]); // ✅ Show chat history in UI
  const [connectionTimeout, setConnectionTimeout] = useState(false); // ✅ Show timeout warning

  console.log('🎬 LiveSession current status:', status);
  
  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const isComponentMounted = useRef(true);

  // Gemini & State
  const aiRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null); // To store the actual session object
  
  // Chat History Management
  const historyRef = useRef<ChatMessage[]>([]);
  const currentInputTransRef = useRef('');
  const currentOutputTransRef = useRef('');

  useEffect(() => {
    isComponentMounted.current = true;
    startSession();

    // ✅ Timeout warning after 10 seconds
    const timeoutId = setTimeout(() => {
      if (status === 'connecting') {
        console.warn('⚠️ Connection taking longer than expected...');
        setConnectionTimeout(true);
      }
    }, 10000);

    return () => {
      isComponentMounted.current = false;
      cleanup();
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = () => {
    // Close Gemini Session
    if (sessionRef.current) {
        try {
            sessionRef.current.close();
        } catch (e) {
            console.error("Error closing session", e);
        }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const startSession = async () => {
    try {
      console.log('🚀 Starting LiveSession...');
      setStatus('connecting');

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      inputContextRef.current = new AudioContextClass({ sampleRate: 16000 });

      console.log('🎤 Requesting microphone access...');
      // Request microphone permission (browser will remember this)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;
      console.log('✅ Microphone access granted');

      console.log('🤖 Connecting to Gemini Live API...');
      aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemInstruction = `
      You are a friendly conversation partner helping an English learner.

      USER PROFILE:
      Name: ${profile.name}, Job: ${profile.occupation}

      SCENE:
      ${scene}

      GOAL:
      Help user practice these words: ${words.join(', ')}.

      CRITICAL RULES:
      1. START the conversation immediately with a greeting (1 sentence).
      2. Keep EVERY response to EXACTLY 1 sentence (max 10-15 words).
      3. Aim for 6-7 total exchanges, then naturally wrap up.
      4. Roleplay the character in the scene.
      5. If user struggles, give a SHORT hint.
      6. Gently correct major errors but keep flow.
      7. Keep it conversational and brief - like real quick chat.

      Example opening:
      - "Hi! What can I get you today?"
      - "Welcome! How can I help you?"

      Example responses:
      - "Sure, what size would you like?"
      - "That sounds great, anything else?"
      - "No problem, have a nice day!"
      `;

      const sessionPromise = aiRef.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          inputAudioTranscription: { model: "gemini-2.5-flash-native-audio-preview-09-2025" },
          outputAudioTranscription: { model: "gemini-2.5-flash-native-audio-preview-09-2025" },
        },
        callbacks: {
          onopen: async () => {
            console.log("✅ Gemini Live Connected - setting status to 'connected'");
            if (isComponentMounted.current) {
                setStatus('connected');
                console.log("✅ Status set to 'connected', component mounted:", isComponentMounted.current);
                setupAudioInput(stream, sessionPromise);

                // ✅ Trigger AI to start conversation with a greeting
                const session = await sessionPromise;
                setTimeout(() => {
                  console.log("🎤 Sending empty message to trigger AI greeting...");
                  // Send empty text to trigger AI's first response
                  session.send({ text: "" });
                }, 500);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
             if (!isComponentMounted.current) return;
             
             // 1. Audio Output
             const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (audioData && audioContextRef.current) {
                await playAudioChunk(audioData);
             }

             // 2. Transcription
             if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                currentOutputTransRef.current += text;
                if (isComponentMounted.current) {
                    setTranscriptDisplay({ role: 'AI', text: currentOutputTransRef.current });
                }
             } else if (message.serverContent?.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                currentInputTransRef.current += text;
                if (isComponentMounted.current) {
                    setTranscriptDisplay({ role: 'You', text: currentInputTransRef.current });
                }
             }

             // 3. Turn Complete
             if (message.serverContent?.turnComplete) {
                if (currentInputTransRef.current.trim()) {
                    const userMessage = { role: 'user', text: currentInputTransRef.current.trim() };
                    historyRef.current.push(userMessage);
                    setDisplayHistory([...historyRef.current]); // ✅ Update UI
                    currentInputTransRef.current = '';
                }
                if (currentOutputTransRef.current.trim()) {
                    const aiMessage = { role: 'model', text: currentOutputTransRef.current.trim() };
                    historyRef.current.push(aiMessage);
                    setDisplayHistory([...historyRef.current]); // ✅ Update UI
                    currentOutputTransRef.current = '';
                }
             }
          },
          onclose: () => {
            console.log("Gemini Live Closed");
            if (isComponentMounted.current) setStatus('ended');
          },
          onerror: (err) => {
            console.error("Gemini Live Error", err);
            if (isComponentMounted.current) setStatus('error');
          }
        }
      });
      
      // Store resolved session for cleanup
      sessionPromise.then(session => {
        if (isComponentMounted.current) {
            sessionRef.current = session;
        } else {
            session.close();
        }
      });

    } catch (e: any) {
      console.error("Failed to start session:", e);

      // Provide helpful error messages
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        alert('❌ Microphone access denied!\n\nPlease:\n1. Click the 🔒 lock icon in your browser address bar\n2. Allow microphone access\n3. Refresh the page');
      } else if (e.name === 'NotFoundError') {
        alert('❌ No microphone found!\n\nPlease connect a microphone and try again.');
      } else {
        alert(`❌ Failed to start conversation: ${e.message}\n\nPlease try again.`);
      }

      setStatus('error');
    }
  };

  const setupAudioInput = (stream: MediaStream, sessionPromise: Promise<any>) => {
    if (!inputContextRef.current) return;

    const source = inputContextRef.current.createMediaStreamSource(stream);
    sourceRef.current = source;
    
    const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (!micActive) return;

      const inputData = e.inputBuffer.getChannelData(0);
      
      const l = inputData.length;
      const int16 = new Int16Array(l);
      for (let i = 0; i < l; i++) {
        int16[i] = inputData[i] * 32768;
      }
      
      const base64Data = arrayBufferToBase64(int16.buffer);
      
      sessionPromise.then(session => {
         session.sendRealtimeInput({
            media: {
                mimeType: 'audio/pcm;rate=16000',
                data: base64Data
            }
         });
      });
    };

    source.connect(processor);
    processor.connect(inputContextRef.current.destination);
  };

  const playAudioChunk = async (base64Audio: string) => {
    if (!audioContextRef.current) return;

    try {
      const uint8Array = base64ToUint8Array(base64Audio);
      const int16Data = new Int16Array(uint8Array.buffer);
      const float32Data = new Float32Array(int16Data.length);
      
      for(let i=0; i<int16Data.length; i++) {
          float32Data[i] = int16Data[i] / 32768.0;
      }

      const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
      audioBuffer.copyToChannel(float32Data, 0);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      const currentTime = audioContextRef.current.currentTime;
      const startTime = Math.max(currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;

    } catch (e) {
      console.error("Error playing audio chunk", e);
    }
  };

  const toggleMic = () => {
    setMicActive(!micActive);
  };
  
  const handleEnd = () => {
      // Flush remaining transcripts
      if (currentInputTransRef.current.trim()) {
          historyRef.current.push({ role: 'user', text: currentInputTransRef.current.trim() });
      }
      if (currentOutputTransRef.current.trim()) {
          historyRef.current.push({ role: 'model', text: currentOutputTransRef.current.trim() });
      }
      onComplete(historyRef.current);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white relative">
      {/* DEBUG: Always visible test element */}
      <div className="bg-purple-600 text-white p-2 text-center text-sm font-bold">
        🔍 LiveSession Loaded - Status: {status}
      </div>

      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-slate-700">
        <h2 className="text-lg font-bold text-center">🎭 Roleplay</h2>
        <div className="text-slate-400 text-xs text-center mt-1 max-h-12 overflow-y-auto line-clamp-2">
          <ClickableText text={scene} />
        </div>
      </div>

      {/* Status Banner - Always visible for debugging */}
      <div className="flex-shrink-0">
        {status === 'connecting' && (
          <div className="bg-yellow-600 text-white p-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Connecting to AI...</span>
            </div>
            {connectionTimeout && (
              <p className="text-xs mt-2">
                Taking longer than expected. Check console (F12) for errors.
              </p>
            )}
          </div>
        )}
        {status === 'connected' && (
          <div className="bg-green-600 text-white p-3 text-center font-semibold flex items-center justify-center gap-2">
            <div className={`w-3 h-3 rounded-full bg-white ${micActive ? 'animate-pulse' : 'opacity-50'}`}></div>
            <span className="text-sm">{micActive ? '🎤 Microphone Active!' : '🔇 Muted'}</span>
          </div>
        )}
        {status === 'error' && (
          <div className="bg-red-600 text-white p-3 text-center font-semibold">
            <p className="text-sm">❌ Connection Failed</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs underline"
            >
              Tap to Reload
            </button>
          </div>
        )}
        {status === 'ended' && (
          <div className="bg-slate-600 text-white p-3 text-center font-semibold">
            <p className="text-sm">Session Ended</p>
          </div>
        )}
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {displayHistory.length === 0 && status === 'connected' && (
          <div className="text-center text-slate-300 py-4">
            <p className="text-xl mb-2">👋 Ready!</p>
            <p className="text-sm font-semibold">AI will speak first...</p>
            <p className="text-xs text-slate-500 mt-1">Then you reply</p>
          </div>
        )}

        {displayHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-100'
            }`}>
              <div className="text-xs opacity-70 mb-1">
                {msg.role === 'user' ? 'You' : 'AI'}
              </div>
              <div className="text-sm">{msg.text}</div>
            </div>
          </div>
        ))}

        {/* Current speaking indicator */}
        {transcriptDisplay && (
          <div className={`flex ${transcriptDisplay.role === 'You' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg opacity-60 ${
              transcriptDisplay.role === 'You'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-600 text-slate-100'
            }`}>
              <div className="text-xs mb-1 flex items-center gap-1">
                {transcriptDisplay.role}
                <span className="inline-block w-1 h-1 rounded-full bg-current animate-pulse"></span>
                <span className="inline-block w-1 h-1 rounded-full bg-current animate-pulse" style={{animationDelay: '0.2s'}}></span>
                <span className="inline-block w-1 h-1 rounded-full bg-current animate-pulse" style={{animationDelay: '0.4s'}}></span>
              </div>
              <div className="text-sm italic">{transcriptDisplay.text}</div>
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex-shrink-0 p-4 border-t border-slate-700 flex gap-3 justify-center">
        <button
          onClick={toggleMic}
          className={`px-6 py-3 rounded-lg transition-all font-semibold ${
            micActive
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-slate-600 hover:bg-slate-700 text-slate-300'
          }`}
          disabled={status !== 'connected'}
        >
          {micActive ? '🎤 Mute' : '🔇 Unmute'}
        </button>
        <button
          onClick={handleEnd}
          className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-all font-semibold"
        >
          🛑 End & Get Feedback
        </button>
      </div>
    </div>
  );
};

export default LiveSession;
