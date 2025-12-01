
import React from 'react';
import { useStore } from '../store';

interface ClickableTextProps {
  text: string;
  className?: string;
}

const ClickableText: React.FC<ClickableTextProps> = ({ text, className = '' }) => {
  const { openDictionary } = useStore();

  const handleWordClick = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    openDictionary(word);
  };

  // Split text into words and non-words (punctuation/spaces)
  // Regex captures delimiters so we can reconstruct the sentence
  const parts = text.split(/([^\w'])+/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        // If part contains word characters, make it clickable
        // Allow apostrophes inside words (e.g., don't, it's)
        if (/\w/.test(part)) {
          return (
            <span
              key={i}
              onClick={(e) => handleWordClick(e, part)}
              className="cursor-pointer hover:bg-yellow-100 hover:text-yellow-800 rounded transition-colors"
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

export default ClickableText;
