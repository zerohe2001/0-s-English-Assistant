import React from 'react';

interface VoiceOrTextInputProps {
  // Recording state
  isRecording: boolean;
  isTranscribing?: boolean;
  transcript?: string;
  onStartRecording: () => void;
  onStopRecording: () => void;

  // Text input state
  textInput: string;
  onTextInputChange: (value: string) => void;
  onTextSubmit: () => void;

  // UI customization
  placeholder?: string;
  recordingPrompt?: string;
  disabled?: boolean;

  // Optional actions
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
}

/**
 * Reusable voice recording or text input component
 * Used in both Learn (SentenceCreation) and Review (ReviewWord)
 */
const VoiceOrTextInput: React.FC<VoiceOrTextInputProps> = ({
  isRecording,
  isTranscribing = false,
  transcript,
  onStartRecording,
  onStopRecording,
  textInput,
  onTextInputChange,
  onTextSubmit,
  placeholder = "Type your translation here...",
  recordingPrompt = "Click to start recording",
  disabled = false,
  onSecondaryAction,
  secondaryActionLabel,
}) => {
  return (
    <div className="space-y-6">
      {/* Recording UI */}
      {!isRecording && !transcript && (
        <div className="flex flex-col items-center py-12">
          <button
            onClick={onStartRecording}
            disabled={disabled}
            className="w-20 h-20 rounded-full bg-gray-900 hover:bg-gray-700 transition-all flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </button>
          <p className="mt-4 text-small text-gray-500">{recordingPrompt}</p>

          {/* Text Input Alternative */}
          <div className="w-full max-w-md mt-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="text-tiny text-gray-500 uppercase">Or Type</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>
            <div className="space-y-2">
              <textarea
                value={textInput}
                onChange={(e) => onTextInputChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-3 border border-gray-300 rounded text-small outline-none focus:border-gray-500 resize-none h-24"
                disabled={disabled || isRecording}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onTextSubmit();
                  }
                }}
              />
              <button
                onClick={onTextSubmit}
                disabled={disabled || isRecording || !textInput.trim()}
                className="w-full py-2 bg-gray-900 text-white rounded text-small font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recording in progress */}
      {isRecording && (
        <div className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-red-500 animate-pulse flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </div>
          </div>

          {transcript && (
            <div className="p-4 bg-gray-100 rounded border border-gray-300">
              <div className="text-tiny text-gray-500 mb-2">Recognizing...</div>
              <div className="text-gray-900">"{transcript}"</div>
            </div>
          )}

          <button
            onClick={onStopRecording}
            className="w-full py-2 bg-gray-900 hover:bg-gray-700 text-white rounded text-small font-medium transition-colors"
          >
            Stop Recording
          </button>
        </div>
      )}

      {/* Transcribing state */}
      {isTranscribing && (
        <div className="mt-4 p-3 bg-gray-100 rounded max-w-md animate-pulse border border-gray-300">
          <p className="text-gray-700 text-small">Transcribing your speech...</p>
        </div>
      )}

      {/* Transcript display (after recording complete) */}
      {transcript && !isRecording && !isTranscribing && (
        <div className="mt-4 p-3 bg-gray-100 rounded max-w-md border border-gray-300">
          <p className="text-tiny text-gray-500 mb-1">You said:</p>
          <p className="text-gray-900 italic">"{transcript}"</p>
        </div>
      )}

      {/* Optional secondary action (e.g., Skip, Listen to original) */}
      {onSecondaryAction && secondaryActionLabel && (
        <button
          onClick={onSecondaryAction}
          className="flex items-center gap-2 text-small text-gray-500 hover:text-gray-700 transition-colors mx-auto"
        >
          {secondaryActionLabel}
        </button>
      )}
    </div>
  );
};

export default VoiceOrTextInput;
