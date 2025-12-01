/**
 * Deepgram-based speech recognition using MediaRecorder
 * Replaces browser's Web Speech API with Deepgram's accurate Nova-3 model
 */

export class DeepgramRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private onTranscript: ((text: string) => void) | null = null;
  private onError: ((error: Error) => void) | null = null;
  private isRecording = false;

  /**
   * Initialize the recorder with microphone access
   */
  async initialize(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone access granted');
    } catch (error) {
      console.error('❌ Microphone access denied:', error);
      throw new Error('Microphone access is required for speech recognition');
    }
  }

  /**
   * Start recording audio
   */
  start(onTranscript: (text: string) => void, onError?: (error: Error) => void): void {
    if (!this.stream) {
      throw new Error('Recorder not initialized. Call initialize() first.');
    }

    if (this.isRecording) {
      console.warn('⚠️ Already recording');
      return;
    }

    this.onTranscript = onTranscript;
    this.onError = onError || null;
    this.audioChunks = [];

    // Create MediaRecorder with supported format
    const mimeType = this.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = async () => {
      console.log('🎙️ Recording stopped, processing audio...');
      await this.processAudio();
    };

    // Start recording with timeslice to collect data in chunks
    // This ensures we get data even if recording is very short
    this.mediaRecorder.start(100); // Collect data every 100ms
    this.isRecording = true;
    console.log('🔴 Recording started with', mimeType);
  }

  /**
   * Stop recording and transcribe
   */
  stop(): void {
    if (!this.mediaRecorder || !this.isRecording) {
      console.warn('⚠️ Not currently recording');
      return;
    }

    this.mediaRecorder.stop();
    this.isRecording = false;
    console.log('⏹️ Recording stop requested');
  }

  /**
   * Process recorded audio and send to Deepgram API
   */
  private async processAudio(): Promise<void> {
    const startTime = performance.now();

    try {
      if (this.audioChunks.length === 0) {
        throw new Error('No audio data recorded');
      }

      // Combine chunks into a single blob
      const blobStart = performance.now();
      const audioBlob = new Blob(this.audioChunks, { type: this.audioChunks[0].type });
      const blobTime = performance.now() - blobStart;
      console.log('📦 Audio blob created:', {
        size: audioBlob.size,
        type: audioBlob.type,
        chunks: this.audioChunks.length
      });
      console.log('⏱️ Blob creation took:', blobTime.toFixed(2), 'ms');

      // Validate audio blob
      if (audioBlob.size < 100) {
        throw new Error(`Audio too short: only ${audioBlob.size} bytes. Please speak for at least 1 second.`);
      }

      if (!audioBlob.type) {
        console.warn('⚠️ Audio blob has no MIME type, this may cause issues');
      }

      // Send to Deepgram API
      const fetchStart = performance.now();
      const response = await fetch('/api/stt', {
        method: 'POST',
        headers: {
          'Content-Type': audioBlob.type,
        },
        body: audioBlob,
      });
      const fetchTime = performance.now() - fetchStart;
      console.log('⏱️ API request took:', fetchTime.toFixed(2), 'ms');

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ STT API error response:', errorData);
        throw new Error(errorData.message || errorData.error || 'Transcription failed');
      }

      const { transcript } = await response.json();
      const totalTime = performance.now() - startTime;
      console.log('✅ Deepgram transcript:', transcript);
      console.log('⏱️ Total processing time:', totalTime.toFixed(2), 'ms');

      // Call transcript callback
      if (this.onTranscript && transcript) {
        this.onTranscript(transcript);
      } else if (!transcript) {
        console.warn('⚠️ Empty transcript received');
      }
    } catch (error: any) {
      console.error('❌ Deepgram transcription error:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  /**
   * Get supported MIME type for MediaRecorder
   * Prioritize formats that Deepgram handles best
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',  // Best quality and widely supported
      'audio/webm',              // Fallback webm
      'audio/ogg;codecs=opus',   // Alternative
      'audio/mp4',               // Last resort
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
   * Cleanup resources
   */
  cleanup(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.mediaRecorder = null;
    this.audioChunks = [];
    this.onTranscript = null;
    this.onError = null;
    this.isRecording = false;
    console.log('🧹 Recorder cleaned up');
  }
}
