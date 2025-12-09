import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import AddArticleModal from '../components/AddArticleModal';
import DictionaryModal from '../components/DictionaryModal';
import { audioCache } from '../services/audioCache';

export const Reading = () => {
  const navigate = useNavigate();
  const {
    readingState,
    addArticle,
    removeArticle,
    setCurrentArticle,
    updateArticleAudioStatus,
    showToast,
  } = useStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);

  useEffect(() => {
    audioCache.initialize().catch(console.error);
  }, []);

  const handleAddArticle = async (title: string, content: string) => {
    addArticle(title, content);

    setTimeout(() => {
      const newArticle = readingState.articles[0];
      if (newArticle) {
        generateAudioForArticle(newArticle.id, newArticle.content);
      }
    }, 100);
  };

  const generateAudioForArticle = async (articleId: string, text: string) => {
    try {
      setGeneratingAudioId(articleId);
      updateArticleAudioStatus(articleId, 'generating');

      console.log(`🎵 Generating TTS audio for article: ${articleId}`);

      const apiUrl = `/api/tts?text=${encodeURIComponent(text)}&voice=en-US-AvaMultilingualNeural`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`TTS API failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const estimatedDuration = text.length * 0.05;

      await audioCache.saveAudio(articleId, audioBlob);
      updateArticleAudioStatus(articleId, 'ready', articleId, estimatedDuration);

      console.log(`✅ Audio generated and cached for article: ${articleId}`);
    } catch (error) {
      console.error('❌ Failed to generate audio:', error);
      updateArticleAudioStatus(articleId, 'failed');
    } finally {
      setGeneratingAudioId(null);
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

    const confirmed = window.confirm('Delete this article? Audio cache will also be removed.');
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
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-tiny rounded border border-gray-300">Ready</span>;
      case 'generating':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-tiny rounded border border-gray-300">Generating...</span>;
      case 'failed':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-tiny rounded border border-red-300">Failed</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-500 text-tiny rounded border border-gray-300">Pending</span>;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const estimateReadTime = (text: string) => {
    const words = text.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h1 text-gray-900">Reading</h1>
          <p className="text-body text-gray-500 mt-2">Your listening library</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </header>

      {/* Articles List */}
      {readingState.articles.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-h2 text-gray-900 mb-2">No articles yet</h2>
          <p className="text-small text-gray-500 max-w-sm mb-6">
            Add your first article to start listening practice
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2 bg-gray-900 text-white rounded text-small font-medium hover:bg-gray-700 transition-colors"
          >
            Add Article
          </button>
        </div>
      ) : (
        // Articles Grid
        <div className="space-y-3">
          {readingState.articles.map((article) => (
            <div
              key={article.id}
              onClick={() => handleArticleClick(article.id)}
              className="bg-white rounded border border-gray-300 p-4 space-y-3 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {/* Title and Delete Button */}
              <div className="flex items-start justify-between">
                <h3 className="text-h3 text-gray-900 flex-1 pr-2">
                  {article.title}
                </h3>
                <button
                  onClick={(e) => handleDeleteArticle(e, article.id)}
                  className="text-gray-400 hover:text-red-600 transition-colors p-1"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Content Preview */}
              <p className="text-gray-500 text-small line-clamp-2">
                {article.content}
              </p>

              {/* Metadata */}
              <div className="flex items-center justify-between text-tiny text-gray-500">
                <div className="flex items-center gap-3">
                  {getStatusBadge(article.audioStatus)}
                  <span>{estimateReadTime(article.content)}</span>
                </div>
                <span>{formatDate(article.createdAt)}</span>
              </div>
            </div>
          ))}
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
