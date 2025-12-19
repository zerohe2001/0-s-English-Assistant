import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import ClickableText from '../components/ClickableText';
import DictionaryModal from '../components/DictionaryModal';

export const Vocabulary = () => {
  const { words, addWord, removeWord, bulkAddWords, startLearningWithWords, setDailyContext, showToast } = useStore();
  const [newWord, setNewWord] = useState('');
  const [isBulk, setIsBulk] = useState(false);
  const [activeTab, setActiveTab] = useState<'unlearned' | 'learned'>('unlearned');
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const navigate = useNavigate();

  const unlearnedWords = words.filter(w => !w.learned);
  const learnedWords = words.filter(w => w.learned);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;

    if (isBulk) {
      bulkAddWords(newWord);
    } else {
      addWord(newWord);
    }
    setNewWord('');
    setIsBulk(false);
  };

  const toggleWordSelection = (wordId: string) => {
    if (selectedWordIds.includes(wordId)) {
      setSelectedWordIds(selectedWordIds.filter(id => id !== wordId));
    } else {
      setSelectedWordIds([...selectedWordIds, wordId]);
    }
  };

  const handleStartLearningSelected = () => {
    if (selectedWordIds.length === 0) {
      showToast('Please select at least one word to learn.', 'info');
      return;
    }

    setDailyContext('');
    startLearningWithWords(selectedWordIds);
    setSelectedWordIds([]);
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 pb-24">
      <header className="mb-6">
        <h1 className="text-h1 text-gray-900">Vocabulary</h1>
        <p className="text-body text-gray-500 mt-2">Add words you want to make active.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white p-4 rounded border border-gray-300 mb-6">
        <div className="flex flex-col space-y-3">
           <div className="flex justify-between items-center">
             <label className="text-small font-medium text-gray-700">
               {isBulk ? 'Paste list (comma or new line separated)' : 'Add a word'}
             </label>
             <button
               type="button"
               onClick={() => setIsBulk(!isBulk)}
               className="text-tiny text-gray-500 hover:text-gray-700"
             >
               {isBulk ? 'Single mode' : 'Bulk mode'}
             </button>
           </div>

           {isBulk ? (
             <textarea
               value={newWord}
               onChange={(e) => setNewWord(e.target.value)}
               placeholder="ambitious, resilient, meticulous..."
               className="w-full px-3 py-2 border border-gray-300 rounded text-small outline-none focus:border-gray-500 h-32"
             />
           ) : (
             <div className="flex gap-2">
               <input
                 value={newWord}
                 onChange={(e) => setNewWord(e.target.value)}
                 placeholder="e.g. procrastination"
                 className="flex-1 px-3 py-2 border border-gray-300 rounded text-small outline-none focus:border-gray-500"
               />
               <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded text-small font-medium hover:bg-gray-700">Add</button>
             </div>
           )}

           {isBulk && (
             <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded text-small font-medium hover:bg-gray-700 self-end">
               Import Words
             </button>
           )}
        </div>
      </form>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-300 mb-6">
        <button
          onClick={() => setActiveTab('unlearned')}
          className={`px-4 py-2 text-small font-medium border-b transition-colors ${
            activeTab === 'unlearned'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          To Learn ({unlearnedWords.length})
        </button>
        <button
          onClick={() => setActiveTab('learned')}
          className={`px-4 py-2 text-small font-medium border-b transition-colors ${
            activeTab === 'learned'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Learned ({learnedWords.length})
        </button>
      </div>

      <div className="space-y-3">
        {activeTab === 'unlearned' ? (
          unlearnedWords.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-gray-100 rounded border border-gray-300">
              No words to learn. Add some above!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {unlearnedWords.map((word) => {
                const isSelected = selectedWordIds.includes(word.id);
                return (
                  <div
                    key={word.id}
                    onClick={() => toggleWordSelection(word.id)}
                    className={`bg-white p-3 rounded border flex items-center gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-gray-900 bg-gray-100'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-gray-900 border-gray-900'
                        : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Word text */}
                    <span className={`flex-1 text-small font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                      {word.text}
                    </span>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWord(word.id);
                      }}
                      className="flex-shrink-0 text-gray-400 hover:text-red-600 p-1 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          learnedWords.length === 0 ? (
            <div className="text-center py-10 bg-gray-100 rounded border border-gray-300">
              <p className="text-gray-700 font-medium">No learned words yet!</p>
              <p className="text-gray-500 text-small mt-2">Complete the learning flow to mark words as learned.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {learnedWords.map((word) => (
                <div key={word.id} className="bg-white p-4 rounded border border-gray-300">
                  {/* Word Header */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-h3 text-gray-900">
                      {word.text}
                    </span>
                    <button
                      onClick={() => removeWord(word.id)}
                      className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  {/* User's Sentence */}
                  {word.userSentence && (
                    <div className="space-y-2">
                      <div className="bg-gray-100 p-3 rounded border border-gray-300">
                        <div className="text-tiny text-gray-500 uppercase mb-1">Your Sentence</div>
                        <div className="text-small text-gray-900">
                          <ClickableText text={word.userSentence} />
                        </div>
                      </div>

                      {word.userSentenceTranslation && (
                        <div className="bg-gray-100 p-3 rounded border border-gray-300">
                          <div className="text-tiny text-gray-500 uppercase mb-1">中文翻译</div>
                          <div className="text-small text-gray-900">
                            {word.userSentenceTranslation}
                          </div>
                        </div>
                      )}

                      {/* Review Stats */}
                      {word.reviewStats && (
                        <div className="flex items-center gap-2 text-tiny">
                          {word.reviewStats.skipped ? (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded border border-gray-300">Skipped</span>
                          ) : word.reviewStats.retryCount > 0 ? (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded border border-gray-300">Retry {word.reviewStats.retryCount}x</span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded border border-gray-300">Perfect</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* No Sentence */}
                  {!word.userSentence && (
                    <div className="text-small text-gray-500 italic">
                      No practice sentence recorded
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Floating action button */}
      {selectedWordIds.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-40 px-4 pb-4 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <button
              onClick={handleStartLearningSelected}
              className="w-full bg-gray-900 hover:bg-gray-700 text-white py-3 rounded text-small font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span>Start Learning ({selectedWordIds.length} {selectedWordIds.length === 1 ? 'word' : 'words'})</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <DictionaryModal />
    </div>
  );
};
