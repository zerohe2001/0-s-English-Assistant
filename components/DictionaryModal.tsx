
import React from 'react';
import { useStore } from '../store';

const DictionaryModal = () => {
  const { dictionary, closeDictionary } = useStore();
  const { isOpen, isLoading, word, data, error } = dictionary;

  if (!isOpen) return null;

  const playAudio = (url?: string) => {
    if (url) {
      new Audio(url).play();
    }
  };

  // Find first audio
  const audioUrl = data?.phonetics.find(p => p.audio)?.audio;

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
           <div>
              <h3 className="text-2xl font-bold text-slate-900 capitalize">{word}</h3>
              {data?.phonetic && <p className="text-slate-500 font-mono">{data.phonetic}</p>}
           </div>
           <button 
             onClick={closeDictionary}
             className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"
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
              {audioUrl && (
                  <button 
                    onClick={() => playAudio(audioUrl)}
                    className="flex items-center gap-2 text-primary font-medium hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors w-fit"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      Listen
                  </button>
              )}

              {data?.meanings.map((m, i) => (
                  <div key={i} className="space-y-2">
                      <span className="inline-block bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                          {m.partOfSpeech}
                      </span>
                      <ul className="space-y-2">
                          {m.definitions.slice(0, 3).map((def, j) => (
                              <li key={j} className="text-slate-700 text-sm leading-relaxed">
                                  <span className="text-slate-400 mr-2">•</span>
                                  {def.definition}
                              </li>
                          ))}
                      </ul>
                  </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
};

export default DictionaryModal;
