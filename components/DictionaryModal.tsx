
import React, { useEffect } from 'react';
import { useStore } from '../store';
import { speak, preloadAudio } from '../services/tts';

const DictionaryModal = () => {
  const { dictionary, closeDictionary, addWord, words } = useStore();
  const { isOpen, isLoading, word, data, error } = dictionary;

  // Check if word is already in vocabulary
  const isInVocabulary = word ? words.some(w => w.text.toLowerCase() === word.toLowerCase()) : false;

  // Preload audio when dictionary opens with a word
  useEffect(() => {
    if (isOpen && word && !isLoading && !error) {
      console.log('⏳ Preloading audio for word:', word);
      preloadAudio(word);
    }
  }, [isOpen, word, isLoading, error]);

  if (!isOpen) return null;

  const playAudio = (text: string) => {
    speak(text);
  };

  const handleAddToVocabulary = () => {
    if (!word) return;
    if (isInVocabulary) {
      alert('This word is already in your vocabulary!');
      return;
    }
    addWord(word);
    // Optional: close the dictionary or show feedback
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 pointer-events-auto backdrop-blur-sm transition-opacity"
        onClick={closeDictionary}
      ></div>

      {/* Modal Content */}
      <div className="bg-white w-full max-w-md max-h-[80vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl transform transition-transform pointer-events-auto animate-slide-up">
        <div className="flex justify-between items-start mb-4">
           <div className="flex-1">
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => playAudio(word || "")}>
                <h3 className="text-2xl font-bold text-slate-900 capitalize">{word}</h3>
                <button className="p-1.5 hover:bg-indigo-50 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              {data?.phonetic && <p className="text-slate-500 font-mono mt-1">{data.phonetic}</p>}
           </div>
           <button
             onClick={closeDictionary}
             className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 ml-2"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
             </svg>
           </button>
        </div>

        {isLoading ? (
           <div className="flex justify-center py-8">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
           </div>
        ) : error ? (
           <div className="text-center py-6 text-slate-500">
               <p>{error}</p>
               <p className="text-xs mt-2">Try selecting a different word.</p>
           </div>
        ) : (
           <div className="space-y-4">
              {data?.meanings.map((m, i) => (
                  <div key={i} className="space-y-2 border-b border-slate-100 pb-3 last:border-0">
                      <span className="inline-block bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                          {m.partOfSpeech}
                      </span>
                      <ul className="space-y-3 mt-1">
                          {m.definitions.map((def, j) => (
                              <li key={j} className="text-slate-800 text-sm leading-relaxed">
                                  <div className="text-slate-700">{def.definitionEN}</div>
                                  {def.definitionCN && <div className="text-slate-500 text-xs mt-0.5 italic">{def.definitionCN}</div>}
                              </li>
                          ))}
                      </ul>
                  </div>
              ))}

              {/* Add to Vocabulary Button */}
              <button
                onClick={handleAddToVocabulary}
                disabled={isInVocabulary}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  isInVocabulary
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-indigo-700 shadow-sm'
                }`}
              >
                {isInVocabulary ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Already in Vocabulary
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add to Vocabulary
                  </span>
                )}
              </button>
           </div>
        )}
      </div>
    </div>
  );
};

export default DictionaryModal;
