
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
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'ended'>('connecting');
  const [micActive, setMicActive] = useState(true);
  const [transcriptDisplay, setTranscriptDisplay] = useState<{role: string, text: string} | null>(null);
  
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

    return () => {
      isComponentMounted.current = false;
      cleanup();
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
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      inputContextRef.current = new AudioContextClass({ sampleRate: 16000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemInstruction = `
      You are a friendly conversation partner helping an English learner.
      
      USER PROFILE:
      Name: ${profile.name}, Job: ${profile.occupation}
      
      SCENE:
      ${scene}
      
      GOAL:
      Help user practice these words: ${words.join(', ')}.
      
      BEHAVIOR:
      1. Roleplay the character in the scene.
      2. Speak naturally, keep turns short (1-3 sentences).
      3. If user struggles, give a hint.
      4. Gently correct major errors but keep flow.
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
          onopen: () => {
            console.log("Gemini Live Connected");
            if (isComponentMounted.current) {
                setStatus('connected');
                setupAudioInput(stream, sessionPromise);
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
                setTranscriptDisplay({ role: 'AI', text: currentOutputTransRef.current });
             } else if (message.serverContent?.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                currentInputTransRef.current += text;
                setTranscriptDisplay({ role: 'You', text: currentInputTransRef.current });
             }

             // 3. Turn Complete
             if (message.serverContent?.turnComplete) {
                if (currentInputTransRef.current.trim()) {
                    historyRef.current.push({ role: 'user', text: currentInputTransRef.current.trim() });
                    currentInputTransRef.current = '';
                }
                if (currentOutputTransRef.current.trim()) {
                    historyRef.current.push({ role: 'model', text: currentOutputTransRef.current.trim() });
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

    } catch (e) {
      console.error("Failed to start session:", e);
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
    <div className="flex flex-col items-center justify-center h-full space-y-8 p-6 bg-slate-900 text-white rounded-xl relative overflow-hidden">
      <div className={`absolute inset-0 bg-primary opacity-10 transition-opacity duration-1000 ${status === 'connected' ? 'animate-pulse' : ''}`}></div>
      
      <div className="z-10 text-center space-y-2 max-w-lg">
        <h2 className="text-2xl font-bold">Roleplay Conversation</h2>
        <div className="text-slate-300 text-sm leading-relaxed">
            <ClickableText text={scene} />
        </div>
      </div>

      <div className="relative z-10 w-48 h-48 flex items-center justify-center">
         {status === 'connecting' && (
             <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
         )}
         {status === 'connected' && (
             <div className="relative w-32 h-32 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.5)]">
                 <div className={`absolute inset-0 bg-white rounded-full opacity-20 ${micActive ? 'animate-ping' : ''}`}></div>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                 </svg>
             </div>
         )}
         {status === 'error' && (
             <div className="text-red-500 font-bold">Connection Failed</div>
         )}
      </div>
      
      {/* Live Transcript Snippet */}
      <div className="z-10 h-16 w-full max-w-md text-center flex items-center justify-center">
        {transcriptDisplay && (
            <p className="text-slate-400 text-sm animate-fade-in">
                <span className="font-bold text-slate-300">{transcriptDisplay.role}:</span> {transcriptDisplay.text.slice(-50)}...
            </p>
        )}
      </div>

      <div className="z-10 flex gap-4">
        <button 
          onClick={toggleMic}
          className={`p-4 rounded-full transition-colors ${micActive ? 'bg-secondary text-white' : 'bg-gray-600 text-gray-300'}`}
          disabled={status !== 'connected'}
        >
          {micActive ? 'Mute' : 'Unmute'}
        </button>
        <button 
          onClick={handleEnd}
          className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors font-semibold px-8"
        >
          End & Get Feedback
        </button>
      </div>
    </div>
  );
};

export default LiveSession;
