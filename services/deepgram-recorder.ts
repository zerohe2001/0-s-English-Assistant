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

    this.mediaRecorder.start();
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
    try {
      if (this.audioChunks.length === 0) {
        throw new Error('No audio data recorded');
      }

      // Combine chunks into a single blob
      const audioBlob = new Blob(this.audioChunks, { type: this.audioChunks[0].type });
      console.log('📦 Audio blob size:', audioBlob.size, 'bytes');

      // Send to Deepgram API
      const response = await fetch('/api/stt', {
        method: 'POST',
        headers: {
          'Content-Type': audioBlob.type,
        },
        body: audioBlob,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Transcription failed');
      }

      const { transcript } = await response.json();
      console.log('✅ Deepgram transcript:', transcript);

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
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    // Fallback to default
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
