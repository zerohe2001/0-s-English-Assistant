import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import ClickableText from '../components/ClickableText';
import DictionaryModal from '../components/DictionaryModal';

export const Vocabulary = () => {
  const { words, addWord, removeWord, bulkAddWords, startLearningWithWords, setDailyContext } = useStore();
  const [newWord, setNewWord] = useState('');
  const [isBulk, setIsBulk] = useState(false);
  const [activeTab, setActiveTab] = useState<'unlearned' | 'learned'>('unlearned'); // ✅ Tab state
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]); // ✅ Selected words for learning
  const navigate = useNavigate();

  // ✅ Filter words by learned status
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

  // ✅ Toggle word selection
  const toggleWordSelection = (wordId: string) => {
    if (selectedWordIds.includes(wordId)) {
      setSelectedWordIds(selectedWordIds.filter(id => id !== wordId));
    } else {
      setSelectedWordIds([...selectedWordIds, wordId]);
    }
  };

  // ✅ Start learning with selected words
  const handleStartLearningSelected = () => {
    if (selectedWordIds.length === 0) {
      alert('Please select at least one word to learn.');
      return;
    }

    // Set empty context (user will be prompted in Learn page)
    setDailyContext('');
    // Start learning with selected words
    startLearningWithWords(selectedWordIds);
    // Clear selection
    setSelectedWordIds([]);
    // Navigate to Learn page
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Vocabulary</h1>
        <p className="text-slate-600 mt-2">Add words you want to make active.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-col space-y-2">
           <div className="flex justify-between items-center mb-2">
             <label className="text-sm font-medium text-slate-700">
               {isBulk ? 'Paste list (comma or new line separated)' : 'Add a word'}
             </label>
             <button 
               type="button" 
               onClick={() => setIsBulk(!isBulk)}
               className="text-xs text-primary underline"
             >
               {isBulk ? 'Switch to Single Mode' : 'Switch to Bulk Mode'}
             </button>
           </div>
           
           {isBulk ? (
             <textarea 
               value={newWord}
               onChange={(e) => setNewWord(e.target.value)}
               placeholder="ambitious, resilient, meticulous..."
               className="w-full px-4 py-2 border rounded-lg h-32 outline-none focus:ring-2 focus:ring-primary"
             />
           ) : (
             <div className="flex gap-2">
               <input 
                 value={newWord}
                 onChange={(e) => setNewWord(e.target.value)}
                 placeholder="e.g. procrastination"
                 className="flex-1 px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
               />
               <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-medium">Add</button>
             </div>
           )}
           
           {isBulk && (
             <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-medium self-end">
               Import Words
             </button>
           )}
        </div>
      </form>

      {/* ✅ Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('unlearned')}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === 'unlearned'
              ? 'border-b-2 border-primary text-primary'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          To Learn ({unlearnedWords.length})
        </button>
        <button
          onClick={() => setActiveTab('learned')}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === 'learned'
              ? 'border-b-2 border-green-500 text-green-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Learned ✅ ({learnedWords.length})
        </button>
      </div>

      <div className="space-y-3">
        {activeTab === 'unlearned' ? (
          unlearnedWords.length === 0 ? (
            <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No words to learn. Add some above!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {unlearnedWords.map((word) => {
                const isSelected = selectedWordIds.includes(word.id);
                return (
                  <div
                    key={word.id}
                    onClick={() => toggleWordSelection(word.id)}
                    className={`bg-white p-3 rounded-lg border shadow-sm flex items-center gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 bg-indigo-50'
                        : 'border-slate-100 hover:border-indigo-200'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-slate-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Word text */}
                    <span className={`flex-1 font-medium ${isSelected ? 'text-primary' : 'text-slate-800'}`}>
                      {word.text}
                    </span>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWord(word.id);
                      }}
                      className="flex-shrink-0 text-slate-400 hover:text-red-500 p-1 transition-colors"
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
            <div className="text-center py-10 text-green-100 bg-green-50 rounded-xl border border-dashed border-green-200">
              <p className="text-green-600 font-medium">No learned words yet!</p>
              <p className="text-green-500 text-sm mt-2">Complete the learning flow and click "Next" to mark words as learned.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {learnedWords.map((word) => (
                <div key={word.id} className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200 shadow-sm">
                  {/* Word Header */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">✅</span>
                      <span className="font-bold text-green-800 text-lg">
                        {word.text}
                      </span>
                    </div>
                    <button
                      onClick={() => removeWord(word.id)}
                      className="text-green-300 hover:text-red-500 p-1 transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  {/* User's Sentence */}
                  {word.userSentence && (
                    <div className="space-y-2">
                      <div className="bg-white p-3 rounded-lg border border-green-100">
                        <div className="text-xs font-bold text-green-600 uppercase mb-1">Your Sentence</div>
                        <div className="text-slate-800">
                          <ClickableText text={word.userSentence} />
                        </div>
                      </div>

                      {word.userSentenceTranslation && (
                        <div className="bg-green-100/50 p-3 rounded-lg border border-green-100">
                          <div className="text-xs font-bold text-green-700 uppercase mb-1">中文翻译</div>
                          <div className="text-green-900">
                            <ClickableText text={word.userSentenceTranslation} />
                          </div>
                        </div>
                      )}

                      {/* Review Stats */}
                      {word.reviewStats && (
                        <div className="flex items-center gap-2 text-xs text-green-600">
                          {word.reviewStats.skipped ? (
                            <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full font-semibold">⏭️ Skipped</span>
                          ) : word.reviewStats.retryCount >= 3 ? (
                            <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full font-semibold">🔄 Retry {word.reviewStats.retryCount}x</span>
                          ) : word.reviewStats.retryCount > 0 ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-semibold">🔄 Retry {word.reviewStats.retryCount}x</span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">✨ Perfect!</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* No Sentence */}
                  {!word.userSentence && (
                    <div className="text-sm text-green-600/60 italic">
                      No practice sentence recorded
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ✅ Floating action button - appears when words are selected */}
      {selectedWordIds.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-40 px-4 pb-4 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <button
              onClick={handleStartLearningSelected}
              className="w-full bg-primary hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Start Learning ({selectedWordIds.length} {selectedWordIds.length === 1 ? 'word' : 'words'})</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
