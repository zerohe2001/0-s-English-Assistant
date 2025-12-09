import React, { useState } from 'react';
import { useStore } from '../store';

interface AddArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string) => void;
}

const AddArticleModal: React.FC<AddArticleModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { showToast } = useStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showToast('Please enter both title and content', 'warning');
      return;
    }

    onSubmit(title.trim(), content.trim());

    // Reset form
    setTitle('');
    setContent('');
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded border border-gray-300 w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-300">
          <h2 className="text-h2 text-gray-900">Add New Article</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Title Input */}
            <div>
              <label className="block text-small font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., The Art of Learning"
                className="w-full px-3 py-2 border border-gray-300 rounded text-small outline-none focus:border-gray-500"
                autoFocus
              />
            </div>

            {/* Content Textarea */}
            <div className="flex-1 flex flex-col">
              <label className="block text-small font-medium text-gray-700 mb-2">
                Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your article content here..."
                className="flex-1 min-h-[300px] px-3 py-2 border border-gray-300 rounded text-small outline-none focus:border-gray-500 resize-none"
              />
              <p className="text-tiny text-gray-500 mt-2">
                {content.length} characters
              </p>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-300">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 text-small font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-900 text-white rounded text-small font-medium hover:bg-gray-700 transition-colors"
            >
              Add Article
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddArticleModal;
