import { useState, useRef, useEffect } from 'react';
import { DeepgramRecorder } from '../services/deepgram-recorder';

export interface VoiceRecorderOptions {
  onTranscript: (transcript: string) => void;
  onError: (error: string) => void;
}

export const useVoiceRecorder = ({ onTranscript, onError }: VoiceRecorderOptions) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
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

    // Cleanup: Force cleanup on unmount to prevent memory leaks
    return () => {
      if (recorderRef.current) {
        recorderRef.current.cleanup();
        recorderRef.current = null;
        console.log('🧹 Voice recorder cleaned up');
      }
    };
  }, []);

  const startRecording = async () => {
    if (!recorderRef.current) {
      onError("Speech recognition not available. Please check your microphone permissions.");
      return;
    }

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
        (transcriptText: string) => {
          console.log(`✅ Deepgram transcript:`, transcriptText);
          setTranscript(transcriptText);
          setIsTranscribing(false);
          onTranscript(transcriptText);
        },
        (error: Error) => {
          console.error('❌ Deepgram error:', error);
          onError(`Speech recognition failed: ${error.message}`);
          setIsRecording(false);
          setIsTranscribing(false);
        }
      );
    } catch (e) {
      console.error("Failed to start recording:", e);
      setIsRecording(false);
      onError("Failed to access microphone. Please check your browser permissions.");
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current) {
      return;
    }

    recorderRef.current.stop();
    setIsRecording(false);
    setIsTranscribing(true); // Show "Processing..." state
  };

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  return {
    isRecording,
    isTranscribing,
    transcript,
    setTranscript,
    startRecording,
    stopRecording,
    toggleRecording,
    recorderRef,
  };
};
