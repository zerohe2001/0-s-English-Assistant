import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, SavedContext, Word } from '../types';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

interface ContextInputProps {
  profile: UserProfile;
  words: Word[];
  learningQueue: Word[];
  onStartSession: (context: string) => void;
  onSaveContext: (text: string) => void;
  openDictionary: (word: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ContextInput: React.FC<ContextInputProps> = ({
  profile,
  words,
  learningQueue,
  onStartSession,
  onSaveContext,
  openDictionary,
  showToast,
}) => {
  const navigate = useNavigate();
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [manualContext, setManualContext] = useState('');

  const { isRecording: isListeningContext, toggleRecording } = useVoiceRecorder({
    onTranscript: (transcript) => {
      console.log(`✅ Context transcript:`, transcript);
      setManualContext(prev => {
        const spacer = prev ? ' ' : '';
        return prev + spacer + transcript;
      });
    },
    onError: (error) => {
      showToast(error, "error");
    },
  });

  const handleSaveContext = () => {
    if (!manualContext.trim()) return;
    onSaveContext(manualContext);
    setManualContext('');
    showToast("Context saved to Profile!", "success");
  };

  const toggleContextCard = (id: string) => {
    if (selectedContextIds.includes(id)) {
      setSelectedContextIds(selectedContextIds.filter(cid => cid !== id));
    } else {
      setSelectedContextIds([...selectedContextIds, id]);
    }
  };

  const handleStartSession = () => {
    // Combine selected contexts with manual input
    const selectedTexts = profile.savedContexts
      .filter(ctx => selectedContextIds.includes(ctx.id))
      .map(ctx => ctx.text)
      .join(' ');

    const finalContext = [selectedTexts, manualContext.trim()]
      .filter(Boolean)
      .join(' ');

    onStartSession(finalContext);
  };

  const hasContent = manualContext.trim().length > 0 || selectedContextIds.length > 0;

  // Calculate which words will be learned
  const previewWords = learningQueue && learningQueue.length > 0
    ? learningQueue  // Already selected (from Vocabulary page)
    : words.filter(w => !w.learned).slice(0, 5).length > 0
      ? words.filter(w => !w.learned).slice(0, 5)  // Default: first 5 unlearned
      : [...words].sort(() => 0.5 - Math.random()).slice(0, 5);  // Fallback: random 5

  return (
    <div className="max-w-lg mx-auto p-6 flex flex-col h-full overflow-y-auto pb-24">
      <header className="mb-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-4"
          aria-label="Go back to home"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-small font-medium">Back</span>
        </button>

        <h2 className="text-h1 text-gray-900 mb-2">What's the plan?</h2>
        <p className="text-body text-gray-500">Describe your day or choose a saved scenario.</p>
      </header>

      {/* Words Preview - Show which words will be learned */}
      {previewWords && previewWords.length > 0 && (
        <div className="mb-6 bg-gray-100 p-4 rounded border border-gray-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-small font-medium text-gray-900 uppercase tracking-wide">
              Words for this session
            </h3>
            <span className="text-tiny bg-white px-2 py-1 rounded text-gray-700 font-medium border border-gray-300">
              {previewWords.length} {previewWords.length === 1 ? 'word' : 'words'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {previewWords.map((word, index) => (
              <span
                key={word.id}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-gray-900 rounded font-medium text-small border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => openDictionary(word.text)}
                title="Click to see dictionary definition"
              >
                <span className="text-tiny text-gray-500 font-medium">{index + 1}.</span>
                {word.text}
              </span>
            ))}
          </div>
          <p className="text-tiny text-gray-500 mt-3">
            Tip: Select specific words in the Vocabulary page
          </p>
        </div>
      )}

      {/* Input Area */}
      <div className="relative mb-6">
        <textarea
          className="w-full p-4 pr-12 border border-gray-300 rounded outline-none text-body h-32 resize-none focus:border-gray-500"
          placeholder="e.g. I'm going to Costco to buy groceries..."
          value={manualContext}
          onChange={(e) => setManualContext(e.target.value)}
        />
        <button
          onClick={toggleRecording}
          className={`absolute bottom-4 right-4 p-2 rounded-full transition-all ${isListeningContext ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {manualContext.trim() && (
        <button
          onClick={handleSaveContext}
          className="text-small text-gray-900 font-medium flex items-center mb-6 hover:text-gray-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Save this to Profile
        </button>
      )}

      {/* Saved Cards */}
      {profile.savedContexts && profile.savedContexts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-small font-medium text-gray-500 uppercase tracking-wide mb-3">Saved Contexts</h3>
          <div className="grid grid-cols-1 gap-2">
            {profile.savedContexts.map(ctx => (
              <div
                key={ctx.id}
                onClick={() => toggleContextCard(ctx.id)}
                className={`p-4 rounded border cursor-pointer transition-all ${
                  selectedContextIds.includes(ctx.id)
                    ? 'bg-gray-100 border-gray-900'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start">
                  <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center mr-3 ${selectedContextIds.includes(ctx.id) ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
                    {selectedContextIds.includes(ctx.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <p className={`text-small ${selectedContextIds.includes(ctx.id) ? 'text-gray-900' : 'text-gray-700'}`}>
                    {ctx.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleStartSession}
        disabled={!hasContent || words.length === 0}
        className="mt-auto w-full bg-gray-900 text-white py-4 rounded font-medium text-body hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {words.length === 0 ? "Add Words First" : "Start Session"}
      </button>
    </div>
  );
};
