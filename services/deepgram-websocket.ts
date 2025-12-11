/**
 * Deepgram WebSocket-based real-time speech recognition
 * Provides < 300ms latency with streaming transcription
 */

import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

export class DeepgramWebSocketRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private deepgramConnection: any = null;
  private isRecording = false;
  private onTranscript: ((text: string, isFinal: boolean) => void) | null = null;
  private onError: ((error: Error) => void) | null = null;
  private accumulatedTranscript = '';
  private connectionClosed = false;  // ✅ Track if connection was closed intentionally

  /**
   * Initialize the recorder with microphone access
   */
  async initialize(): Promise<void> {
    // Skip if already initialized with active stream
    if (this.stream && this.stream.active) {
      console.log('✅ Microphone already initialized');
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone access granted');
    } catch (error) {
      console.error('❌ Microphone access denied:', error);
      throw new Error('Microphone access is required for speech recognition');
    }
  }

  /**
   * Start recording with real-time WebSocket streaming
   */
  async start(
    onTranscript: (text: string, isFinal: boolean) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    if (!this.stream) {
      throw new Error('Recorder not initialized. Call initialize() first.');
    }

    if (this.isRecording) {
      console.warn('⚠️ Already recording');
      return;
    }

    this.onTranscript = onTranscript;
    this.onError = onError || null;
    this.accumulatedTranscript = '';
    this.connectionClosed = false;  // ✅ Reset connection closed flag

    const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY || process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error('Deepgram API key not found');
    }

    try {
      // ✅ Create Deepgram client
      const deepgram = createClient(apiKey);

      // ✅ Create live transcription connection with MAXIMUM SPEED settings
      this.deepgramConnection = deepgram.listen.live({
        model: 'nova-2',
        language: 'en',
        smart_format: true,
        interim_results: true, // ✅ Enable real-time partial results
        endpointing: 200, // ✅ 200ms pause detection (optimized from 300ms)
        utterance_end_ms: 800, // ✅ 800ms silence ends utterance (optimized from 1000ms)
        vad_turnoff: 300, // ✅ Voice activity detection for faster silence detection
      });

      // ✅ Handle connection open
      this.deepgramConnection.on(LiveTranscriptionEvents.Open, () => {
        console.log('🔴 Deepgram WebSocket connected');

        // Start MediaRecorder to capture audio
        this.startMediaRecorder();
      });

      // ✅ Handle real-time transcripts
      this.deepgramConnection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript || '';
        const isFinal = data.is_final;

        if (transcript) {
          console.log(`📝 Transcript (${isFinal ? 'FINAL' : 'interim'}):`, transcript);

          if (isFinal) {
            // Final result - accumulate it
            this.accumulatedTranscript += (this.accumulatedTranscript ? ' ' : '') + transcript;
            if (this.onTranscript) {
              this.onTranscript(this.accumulatedTranscript, true);
            }
          } else {
            // Interim result - show temporary
            if (this.onTranscript) {
              const tempTranscript = this.accumulatedTranscript +
                (this.accumulatedTranscript ? ' ' : '') + transcript;
              this.onTranscript(tempTranscript, false);
            }
          }
        }
      });

      // ✅ Handle errors
      this.deepgramConnection.on(LiveTranscriptionEvents.Error, (error: any) => {
        console.error('❌ Deepgram error:', error);
        if (this.onError) {
          this.onError(new Error(error.message || 'Deepgram connection error'));
        }
      });

      // ✅ Handle connection close
      this.deepgramConnection.on(LiveTranscriptionEvents.Close, () => {
        console.log('🔌 Deepgram WebSocket closed');

        // ✅ FIX: Notify user if connection closed unexpectedly during recording
        if (this.isRecording && !this.connectionClosed && this.onError) {
          this.onError(new Error('Connection lost. Please try recording again.'));
          this.isRecording = false;
        }
      });

      this.isRecording = true;
      console.log('🎙️ WebSocket recording started');

    } catch (error: any) {
      console.error('❌ Failed to start WebSocket recording:', error);
      throw error;
    }
  }

  /**
   * Start MediaRecorder and stream audio to Deepgram
   */
  private startMediaRecorder(): void {
    if (!this.stream || !this.deepgramConnection) return;

    // Get supported MIME type
    const mimeType = this.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

    // Send audio data to Deepgram as it becomes available
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.deepgramConnection) {
        // ✅ Send audio chunk directly to Deepgram WebSocket
        this.deepgramConnection.send(event.data);
      }
    };

    // Start recording with OPTIMIZED timeslice for MAXIMUM speed
    this.mediaRecorder.start(100); // ✅ Send data every 100ms for ultra-low latency (optimized from 250ms)
    console.log('🔴 MediaRecorder started with', mimeType, '- 100ms chunks');
  }

  /**
   * Stop recording and close WebSocket
   */
  stop(): void {
    if (!this.isRecording) {
      console.warn('⚠️ Not currently recording');
      return;
    }

    // ✅ Mark as intentionally closed
    this.connectionClosed = true;

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Close Deepgram connection
    if (this.deepgramConnection) {
      this.deepgramConnection.finish();
      this.deepgramConnection = null;
    }

    this.isRecording = false;
    console.log('⏹️ WebSocket recording stopped');
  }

  /**
   * Get supported MIME type for MediaRecorder
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('📼 Selected MIME type:', type);
        return type;
      }
    }

    console.warn('⚠️ No supported MIME type found, using default');
    return '';
  }

  /**
   * Check if currently recording
   */
  get recording(): boolean {
    return this.isRecording;
  }

  /**
   * Get accumulated final transcript
   */
  get transcript(): string {
    return this.accumulatedTranscript;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stop();

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.mediaRecorder = null;
    this.onTranscript = null;
    this.onError = null;
    this.accumulatedTranscript = '';
    this.connectionClosed = false;  // ✅ Reset flag
    console.log('🧹 WebSocket recorder cleaned up');
  }
}
