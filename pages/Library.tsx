import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import AddArticleModal from '../components/AddArticleModal';
import DictionaryModal from '../components/DictionaryModal';
import { ContextLibrary } from '../components/Settings/ContextLibrary';
import { audioCache } from '../services/audioCache';

export const Library = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'words' | 'articles' | 'contexts') || 'words';
  const [activeTab, setActiveTab] = useState<'words' | 'articles' | 'contexts'>(initialTab);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    words,
    addWord,
    removeWord,
    bulkAddWords,
    readingState,
    addArticle,
    removeArticle,
    setCurrentArticle,
    updateArticleAudioStatus,
    showToast,
  } = useStore();

  const [newWord, setNewWord] = useState('');
  const [isBulk, setIsBulk] = useState(false);
  const [wordFilter, setWordFilter] = useState<'all' | 'learned' | 'unlearned'>('all');

  // Initialize IndexedDB
  useEffect(() => {
    audioCache.initialize().catch(console.error);
  }, []);

  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  // Filter words
  const filteredWords = words.filter(w => {
    if (wordFilter === 'learned') return w.learned;
    if (wordFilter === 'unlearned') return !w.learned;
    return true;
  });

  const handleSubmitWord = (e: React.FormEvent) => {
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

  const handleAddArticle = async (title: string, content: string) => {
    addArticle(title, content);

    // Generate audio for the new article
    setTimeout(() => {
      const newArticle = readingState.articles[0];
      if (newArticle) {
        generateAudioForArticle(newArticle.id, newArticle.content);
      }
    }, 100);
  };

  const generateAudioForArticle = async (articleId: string, text: string) => {
    try {
      updateArticleAudioStatus(articleId, 'generating');

      const apiUrl = `/api/tts?text=${encodeURIComponent(text)}&voice=en-US-AvaMultilingualNeural`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`TTS API failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const estimatedDuration = text.length * 0.05;

      await audioCache.saveAudio(articleId, audioBlob);
      updateArticleAudioStatus(articleId, 'ready', articleId, estimatedDuration);
    } catch (error) {
      console.error('Failed to generate audio:', error);
      updateArticleAudioStatus(articleId, 'failed');
    }
  };

  const handleArticleClick = (articleId: string) => {
    const article = readingState.articles.find(a => a.id === articleId);
    if (!article) return;

    if (article.audioStatus === 'generating') {
      showToast('Audio is still generating. Please wait...', 'info');
      return;
    }

    if (article.audioStatus === 'failed') {
      const retry = confirm('Audio generation failed. Retry?');
      if (retry) {
        generateAudioForArticle(article.id, article.content);
      }
      return;
    }

    setCurrentArticle(articleId);
    navigate(`/reading/${articleId}`);
  };

  const handleDeleteArticle = async (e: React.MouseEvent, articleId: string) => {
    e.stopPropagation();
    const confirmed = window.confirm('Delete this article?');
    if (!confirmed) return;

    try {
      await audioCache.deleteAudio(articleId);
    } catch (error) {
      console.error('Failed to delete audio cache:', error);
    }

    removeArticle(articleId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <span className="text-tiny text-gray-700">Ready</span>;
      case 'generating':
        return <span className="text-tiny text-gray-500">Generating...</span>;
      case 'failed':
        return <span className="text-tiny text-red-600">Failed</span>;
      default:
        return <span className="text-tiny text-gray-500">Pending</span>;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 pb-24">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-h1 text-gray-900">Library</h1>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-300">
        <button
          onClick={() => setActiveTab('words')}
          className={`px-4 py-2 text-small font-medium border-b transition-colors ${
            activeTab === 'words'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Words
        </button>
        <button
          onClick={() => setActiveTab('articles')}
          className={`px-4 py-2 text-small font-medium border-b transition-colors ${
            activeTab === 'articles'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Articles
        </button>
        <button
          onClick={() => setActiveTab('contexts')}
          className={`px-4 py-2 text-small font-medium border-b transition-colors ${
            activeTab === 'contexts'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Contexts
        </button>
      </div>

      {/* Words Tab */}
      {activeTab === 'words' && (
        <div className="space-y-4">
          {/* Add Word Form */}
          <form onSubmit={handleSubmitWord} className="bg-white border border-gray-300 rounded p-4">
            <div className="flex justify-between items-center mb-3">
              <label className="text-small font-medium text-gray-900">
                {isBulk ? 'Add multiple words' : 'Add a word'}
              </label>
              <button
                type="button"
                onClick={() => setIsBulk(!isBulk)}
                className="text-tiny text-gray-500 hover:underline"
              >
                {isBulk ? 'Single mode' : 'Bulk mode'}
              </button>
            </div>

            {isBulk ? (
              <textarea
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="ambitious, resilient, meticulous..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-small outline-none focus:border-gray-500 h-24 mb-3"
              />
            ) : (
              <input
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="e.g. procrastination"
                className="w-full px-3 py-2 border border-gray-300 rounded text-small outline-none focus:border-gray-500 mb-3"
              />
            )}

            <button
              type="submit"
              className="w-full py-2 bg-gray-900 text-white text-small font-medium rounded hover:bg-gray-700 transition-colors"
            >
              Add {isBulk ? 'Words' : 'Word'}
            </button>
          </form>

          {/* Word Filter & Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              {(['all', 'unlearned', 'learned'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setWordFilter(filter)}
                  className={`px-3 py-1 text-tiny rounded transition-colors ${
                    wordFilter === filter
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter === 'learned' ? 'Learned' : 'To Learn'}
                </button>
              ))}
            </div>

            <button
              onClick={() => navigate('/vocabulary')}
              className="px-3 py-1 bg-gray-900 text-white text-tiny rounded hover:bg-gray-700 transition-colors font-medium"
            >
              Select to Learn
            </button>
          </div>

          {/* Words List */}
          {filteredWords.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-small">No words yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWords.map(word => (
                <div
                  key={word.id}
                  className="bg-white border border-gray-300 rounded p-3 hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-body text-gray-900">{word.text}</p>
                    <p className="text-tiny text-gray-500 mt-1">
                      {word.learned && word.nextReviewDate ? (
                        <>Review on {new Date(word.nextReviewDate).toLocaleDateString()}</>
                      ) : (
                        <>Added {new Date(word.addedAt).toLocaleDateString()}</>
                      )}
                      {word.learned && ' • Learned'}
                    </p>
                  </div>
                  <button
                    onClick={() => removeWord(word.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors ml-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Articles Tab */}
      {activeTab === 'articles' && (
        <div className="space-y-4">
          {/* Add Article Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full py-3 bg-gray-900 text-white text-small font-medium rounded hover:bg-gray-700 transition-colors"
          >
            + Add Article
          </button>

          {/* Articles List */}
          {readingState.articles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-small">No articles yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {readingState.articles.map(article => (
                <div
                  key={article.id}
                  onClick={() => handleArticleClick(article.id)}
                  className="bg-white border border-gray-300 rounded p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-h3 text-gray-900 flex-1">{article.title}</h3>
                    <button
                      onClick={(e) => handleDeleteArticle(e, article.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors ml-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <p className="text-small text-gray-500 line-clamp-2 mb-3">
                    {article.content}
                  </p>

                  <div className="flex items-center justify-between text-tiny text-gray-500">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(article.audioStatus)}
                    </div>
                    <span>{formatDate(article.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contexts Tab */}
      {activeTab === 'contexts' && (
        <div className="space-y-4">
          <ContextLibrary />
        </div>
      )}

      {/* Add Article Modal */}
      <AddArticleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddArticle}
      />

      {/* Dictionary Modal */}
      <DictionaryModal />
    </div>
  );
};
