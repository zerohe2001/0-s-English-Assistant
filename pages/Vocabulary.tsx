import React, { useState } from 'react';
import { useStore } from '../store';

export const Vocabulary = () => {
  const { words, addWord, removeWord, bulkAddWords } = useStore();
  const [newWord, setNewWord] = useState('');
  const [isBulk, setIsBulk] = useState(false);

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

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Your List ({words.length})</h2>
        {words.length === 0 ? (
          <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No words yet. Add some to start learning!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {words.map((word) => (
              <div key={word.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex justify-between items-center">
                <span className={`font-medium ${word.learned ? 'text-green-600' : 'text-slate-800'}`}>
                  {word.text}
                </span>
                <button 
                  onClick={() => removeWord(word.id)}
                  className="text-slate-400 hover:text-red-500 p-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
