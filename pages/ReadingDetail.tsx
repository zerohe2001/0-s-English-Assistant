import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { audioCache } from '../services/audioCache';
import ClickableText from '../components/ClickableText';
import DictionaryModal from '../components/DictionaryModal';

export const ReadingDetail = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const {
    readingState,
    setPlaybackState,
    setPlaybackRate,
    updateLastPlayed,
  } = useStore();

  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const updateIntervalRef = useRef<number | null>(null);

  // Find current article
  const article = readingState.articles.find(a => a.id === articleId);

  // Load audio on mount
  useEffect(() => {
    if (!article) {
      setError('Article not found');
      setIsLoading(false);
      return;
    }

    loadAudio();

    return () => {
      // Cleanup on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [articleId]);

  const loadAudio = async () => {
    if (!article || !articleId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Check if audio is ready
      if (article.audioStatus !== 'ready') {
        throw new Error('Audio not ready. Please go back and wait for generation to complete.');
      }

      // Load audio from IndexedDB
      const audioBlob = await audioCache.getAudio(articleId);
      if (!audioBlob) {
        throw new Error('Audio not found in cache');
      }

      // Create audio element
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioElement = new Audio(audioUrl);
      audioElement.volume = 0.85;

      // Wait for metadata to load
      await new Promise((resolve, reject) => {
        audioElement.onloadedmetadata = resolve;
        audioElement.onerror = reject;
      });

      audioRef.current = audioElement;
      setAudio(audioElement);
      setIsLoading(false);

      // Update last played timestamp
      updateLastPlayed(articleId);

      console.log(`✅ Audio loaded successfully for article: ${articleId}`);
    } catch (err) {
      console.error('❌ Failed to load audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audio');
      setIsLoading(false);
    }
  };

  // Handle play/pause
  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (readingState.isPlaying) {
      audioRef.current.pause();
      setPlaybackState(false);
    } else {
      audioRef.current.play();
      setPlaybackState(true);

      // Start updating current time
      if (!updateIntervalRef.current) {
        updateIntervalRef.current = window.setInterval(() => {
          if (audioRef.current) {
            const currentTime = audioRef.current.currentTime;
            const sentenceIndex = getCurrentSentenceIndex(currentTime);
            setPlaybackState(true, currentTime, sentenceIndex);

            // Auto-scroll to current sentence
            scrollToSentence(sentenceIndex);
          }
        }, 100); // Update every 100ms
      }
    }
  };

  // Handle audio ended
  useEffect(() => {
    if (!audioRef.current) return;

    const handleEnded = () => {
      setPlaybackState(false, 0, 0);
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };

    audioRef.current.addEventListener('ended', handleEnded);

    return () => {
      audioRef.current?.removeEventListener('ended', handleEnded);
    };
  }, [audio]);

  // Get current sentence index based on time
  const getCurrentSentenceIndex = (time: number): number => {
    if (!article?.sentenceTimes) return 0;

    for (let i = 0; i < article.sentenceTimes.length; i++) {
      const { start, end } = article.sentenceTimes[i];
      if (time >= start && time < end) {
        return i;
      }
    }

    // If time is past all sentences, return last index
    return article.sentenceTimes.length - 1;
  };

  // Scroll to current sentence
  const scrollToSentence = (index: number) => {
    const element = document.getElementById(`sentence-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Jump to previous sentence
  const previousSentence = () => {
    if (!audioRef.current || !article?.sentenceTimes) return;

    const currentIndex = readingState.currentSentenceIndex;
    const prevIndex = Math.max(0, currentIndex - 1);
    const prevTime = article.sentenceTimes[prevIndex].start;

    audioRef.current.currentTime = prevTime;
    setPlaybackState(readingState.isPlaying, prevTime, prevIndex);
    scrollToSentence(prevIndex);
  };

  // Jump to next sentence
  const nextSentence = () => {
    if (!audioRef.current || !article?.sentenceTimes) return;

    const currentIndex = readingState.currentSentenceIndex;
    const nextIndex = Math.min(article.sentences.length - 1, currentIndex + 1);
    const nextTime = article.sentenceTimes[nextIndex].start;

    audioRef.current.currentTime = nextTime;
    setPlaybackState(readingState.isPlaying, nextTime, nextIndex);
    scrollToSentence(nextIndex);
  };

  // Change playback speed
  const cyclePlaybackRate = () => {
    const rates = [0.75, 1.0, 1.25, 1.5];
    const currentIndex = rates.indexOf(readingState.playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];

    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
    setPlaybackRate(newRate);
  };

  // Handle progress bar change
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || !article?.sentenceTimes) return;

    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;

    const sentenceIndex = getCurrentSentenceIndex(newTime);
    setPlaybackState(readingState.isPlaying, newTime, sentenceIndex);
    scrollToSentence(sentenceIndex);
  };

  // Format time (seconds to mm:ss)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!article) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <p className="text-h2 text-gray-700 mb-4">Article not found</p>
          <button
            onClick={() => navigate('/reading')}
            className="px-4 py-2 bg-gray-900 text-white rounded text-small font-medium"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading audio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <p className="text-h2 text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/reading')}
            className="px-4 py-2 bg-gray-900 text-white rounded text-small font-medium"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  const duration = audioRef.current?.duration || 0;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-4 border-b border-gray-300 flex items-center gap-3">
        <button
          onClick={() => navigate('/reading')}
          className="text-gray-500 hover:text-gray-900"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-h2 text-gray-900 truncate">{article.title}</h1>
      </div>

      {/* Reading Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 pb-32">
        <div className="max-w-3xl mx-auto space-y-3">
          {article.sentences.map((sentence, index) => {
            const isCurrentSentence = index === readingState.currentSentenceIndex && readingState.isPlaying;

            return (
              <p
                key={index}
                id={`sentence-${index}`}
                className={`text-body leading-relaxed transition-all duration-200 ${
                  isCurrentSentence
                    ? 'bg-gray-100 border-l-2 border-gray-900 pl-4 py-2'
                    : 'text-gray-700 py-1'
                }`}
              >
                <ClickableText text={sentence} />
              </p>
            );
          })}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-300 p-4">
        {/* Progress Bar */}
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={readingState.currentTime}
          onChange={handleProgressChange}
          className="w-full mb-2 accent-gray-900"
        />

        {/* Time Display */}
        <div className="flex justify-between text-tiny text-gray-500 mb-4">
          <span>{formatTime(readingState.currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={previousSentence}
            className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            onClick={togglePlayPause}
            className="w-16 h-16 bg-gray-900 hover:bg-gray-700 text-white rounded-full flex items-center justify-center transition-colors"
          >
            {readingState.isPlaying ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={nextSentence}
            className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>

          <button
            onClick={cyclePlaybackRate}
            className="w-14 h-12 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-small font-semibold transition-colors"
          >
            {readingState.playbackRate}x
          </button>
        </div>
      </div>

      {/* Dictionary Modal */}
      <DictionaryModal />
    </div>
  );
};
