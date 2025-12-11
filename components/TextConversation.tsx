import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { correctUserAnswer } from '../services/gemini';
import ClickableText from './ClickableText';

interface TextConversationProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function TextConversation({ onComplete, onCancel }: TextConversationProps) {
  const { learnState, addConversationMessage, nextConversationQuestion } = useStore();
  const { conversation } = learnState;

  const [userInput, setUserInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [streamingText, setStreamingText] = useState(''); // ✅ For streaming display

  // ✅ FIX: Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  if (!conversation) {
    return null;
  }

  const handleSubmit = async () => {
    if (!userInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setStreamingText(''); // ✅ Clear previous streaming text

    try {
      // Add user's message
      addConversationMessage({
        role: 'user',
        text: userInput
      });

      // ✅ Get AI correction with streaming
      const correction = await correctUserAnswer(
        conversation.currentQuestion,
        userInput,
        (chunk) => {
          // ✅ FIX: Only update state if component is still mounted
          if (isMountedRef.current) {
            setStreamingText(prev => prev + chunk);
          }
        }
      );

      // ✅ FIX: Check if component is still mounted before state updates
      if (!isMountedRef.current) {
        console.log('⚠️ Component unmounted during AI processing');
        return;
      }

      // Clear streaming text
      setStreamingText('');

      // Add correction as AI message
      addConversationMessage({
        role: 'ai',
        text: '',
        correction: {
          correctedText: correction.correctedText,
          feedback: correction.feedback
        }
      });

      // Clear input
      setUserInput('');

      // Move to next question or complete
      if (conversation.questionIndex + 1 >= conversation.totalQuestions) {
        // ✅ FIX: Complete immediately, no unnecessary delay
        onComplete();
      } else {
        // Move to next question
        nextConversationQuestion();
      }

    } catch (error) {
      console.error('Failed to process answer:', error);

      // ✅ FIX: Only show alert and update state if component is still mounted
      if (isMountedRef.current) {
        alert('Failed to process your answer. Please try again.');
        setStreamingText(''); // ✅ Clear on error
      }
    } finally {
      // ✅ FIX: Only update state if component is still mounted
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-h2 text-gray-900">Conversation Practice</h2>
          <button
            onClick={onCancel}
            className="text-small text-gray-500 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
        <div className="flex items-center gap-2 text-tiny text-gray-500">
          <span>Question {conversation.questionIndex + 1} of {conversation.totalQuestions}</span>
          <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 transition-all duration-300"
              style={{ width: `${((conversation.questionIndex + 1) / conversation.totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {/* ✅ Show streaming response while loading */}
        {streamingText && (
          <div className="ml-8">
            <div className="bg-gray-100 p-4 rounded space-y-2 animate-pulse">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5"></div>
                <div className="flex-1">
                  <p className="text-small font-medium text-gray-900">Analyzing...</p>
                  <p className="text-tiny text-gray-600 mt-1 whitespace-pre-wrap">{streamingText}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {conversation.messages.map((msg, index) => (
          <div key={index} className={`${msg.role === 'ai' ? '' : 'ml-8'}`}>
            {msg.role === 'ai' ? (
              // AI Question
              msg.correction ? (
                // AI Correction
                <div className="bg-gray-100 p-4 rounded space-y-2">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-small font-medium text-gray-900">Corrected:</p>
                      <p className="text-body text-gray-700 mt-1">"{msg.correction.correctedText}"</p>
                    </div>
                  </div>
                  <div className="pl-7 text-small text-gray-600">
                    {msg.correction.feedback}
                  </div>
                </div>
              ) : (
                // AI Question
                <div className="bg-white border border-gray-300 p-4 rounded">
                  <p className="text-tiny text-gray-500 mb-1">AI asks:</p>
                  <ClickableText text={msg.text} className="text-body text-gray-900" />
                </div>
              )
            ) : (
              // User Answer
              <div className="bg-gray-900 text-white p-4 rounded">
                <p className="text-tiny opacity-70 mb-1">You answered:</p>
                <p className="text-body">{msg.text}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Area */}
      {conversation.isWaitingForAnswer && (
        <div className="border-t border-gray-300 pt-4">
          <div className="flex gap-2">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your answer here... (Press Enter to submit)"
              className="flex-1 p-3 border border-gray-300 rounded text-body resize-none focus:outline-none focus:border-gray-900"
              rows={3}
              disabled={isSubmitting}
            />
            <button
              onClick={handleSubmit}
              disabled={!userInput.trim() || isSubmitting}
              className="px-6 bg-gray-900 text-white rounded text-small font-medium hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors self-end"
            >
              {isSubmitting ? 'Checking...' : 'Submit'}
            </button>
          </div>
          <p className="text-tiny text-gray-500 mt-2">
            Tip: Press Enter to submit, Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  );
}
