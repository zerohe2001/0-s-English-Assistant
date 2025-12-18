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
      const errorMsg = 'Deepgram API key not configured. Please add VITE_DEEPGRAM_API_KEY to your environment variables.';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }
    console.log('✅ Deepgram API key found:', apiKey.substring(0, 10) + '...');

    try {
      // ✅ Create Deepgram client
      console.log('🔧 Creating Deepgram client...');
      const deepgram = createClient(apiKey);

      // ✅ Create live transcription connection with MAXIMUM SPEED settings
      console.log('🔧 Creating live transcription connection...');
      this.deepgramConnection = deepgram.listen.live({
        model: 'nova-2',
        language: 'en',
        smart_format: true,
        interim_results: true, // ✅ Enable real-time partial results
        endpointing: 200, // ✅ 200ms pause detection (optimized from 300ms)
        utterance_end_ms: 800, // ✅ 800ms silence ends utterance (optimized from 1000ms)
        vad_turnoff: 300, // ✅ Voice activity detection for faster silence detection
      });

      console.log('🔧 Deepgram connection object created:', this.deepgramConnection);

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
        console.error('❌ Deepgram error (full details):', error);
        console.error('❌ Error type:', typeof error);
        console.error('❌ Error properties:', Object.keys(error));
        console.error('❌ Error message:', error?.message);
        console.error('❌ Error code:', error?.code);
        console.error('❌ Status code:', error?.statusCode);
        console.error('❌ Error string:', String(error));

        // ✅ DEBUG: Log the inner error object
        if (error?.error) {
          console.error('❌ Inner error object:', error.error);
          console.error('❌ Inner error type:', typeof error.error);
          console.error('❌ Inner error constructor:', error.error.constructor?.name);
          console.error('❌ Inner error message:', error.error.message);
          console.error('❌ Inner error code:', error.error.code);
          console.error('❌ Inner error reason:', error.error.reason);
        }

        // ✅ DEBUG: Log WebSocket state
        console.error('❌ ReadyState:', error?.readyState);
        console.error('❌ URL:', error?.url);

        // ✅ Provide user-friendly error messages based on error type
        let userMessage = 'Speech recognition error. Please try again.';

        if (error?.error?.includes?.('401') || error?.statusCode === 401) {
          userMessage = 'Invalid Deepgram API key. Please check your configuration.';
        } else if (error?.error?.includes?.('402') || error?.statusCode === 402) {
          userMessage = 'Deepgram quota exceeded. Please check your account balance.';
        } else if (error?.error?.includes?.('403') || error?.statusCode === 403) {
          userMessage = 'Deepgram access denied. Please verify your API permissions.';
        } else if (!navigator.onLine) {
          userMessage = 'No internet connection. Please check your network.';
        }

        if (this.onError) {
          this.onError(new Error(userMessage));
        }
      });

      // ✅ Handle connection close
      this.deepgramConnection.on(LiveTranscriptionEvents.Close, (closeEvent: any) => {
        console.log('🔌 Deepgram WebSocket closed');
        console.log('🔧 Close event:', closeEvent);

        // ✅ FIX: Notify user if connection closed unexpectedly during recording
        if (this.isRecording && !this.connectionClosed && this.onError) {
          this.onError(new Error('Connection lost. Please try recording again.'));
          this.isRecording = false;
        }
      });

      // ✅ Debug: Log all Deepgram events to understand what's happening
      this.deepgramConnection.on(LiveTranscriptionEvents.Metadata, (metadata: any) => {
        console.log('📊 Deepgram metadata:', metadata);
      });

      this.deepgramConnection.on(LiveTranscriptionEvents.Warning, (warning: any) => {
        console.warn('⚠️ Deepgram warning:', warning);
      });

      console.log('🔧 All event listeners attached');
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
