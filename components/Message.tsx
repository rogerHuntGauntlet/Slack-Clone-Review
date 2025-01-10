import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { MessageSquare, Share2, Smile } from 'lucide-react';
import { useTheme } from 'next-themes';
import type { MessageType } from '../types/database';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉'];

interface MessageProps {
  message: MessageType;
  currentUser: { id: string; email: string };
  onReplyClick?: (message: MessageType) => void;
  onReactionSelect?: (messageId: string, reaction: string) => void;
  className?: string;
  isThread?: boolean;
}

const Message: React.FC<MessageProps> = ({
  message,
  currentUser,
  onReplyClick,
  onReactionSelect,
  className = ''
}) => {
  const [showEmojiSelector, setShowEmojiSelector] = useState(false);
  const emojiSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiSelectorRef.current && !emojiSelectorRef.current.contains(event.target as Node)) {
        setShowEmojiSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReactionClick = (emoji: string) => {
    if (onReactionSelect) {
      onReactionSelect(message.id, emoji);
      setShowEmojiSelector(false);
    }
  };

  const getReactionCount = (emoji: string) => {
    return (message.reactions?.[emoji] || []).length;
  };

  const hasUserReacted = (emoji: string) => {
    return message.reactions?.[emoji]?.includes(currentUser.id) || false;
  };

  return (
    <div className={`p-4 rounded-lg ${className}`} id={`message-${message.id}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Image
            src={message.user?.avatar_url || '/default-avatar.png'}
            alt={message.user?.username || 'Unknown User'}
            width={40}
            height={40}
            className="rounded-full"
          />
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">{message.user?.username || 'Unknown User'}</span>
            <span className="text-xs text-gray-500">
              {message.created_at ? new Date(message.created_at).toLocaleString() : ''}
            </span>
          </div>

          <p className="mt-1 text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
            {message.content}
          </p>

          {message.file_attachments && message.file_attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.file_attachments.map((attachment) => (
                <div 
                  key={attachment.id} 
                  className="inline-block max-w-xs"
                >
                  {attachment.file_type.startsWith('image/') ? (
                    <a 
                      href={attachment.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={attachment.file_url}
                        alt={attachment.file_name}
                        className="max-h-60 rounded-lg object-cover shadow-sm hover:shadow-md transition-shadow duration-200"
                      />
                    </a>
                  ) : (
                    <a
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <div className="flex-shrink-0 text-gray-500 dark:text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="text-sm text-blue-600 dark:text-blue-400 truncate">
                        {attachment.file_name}
                      </span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-2 mt-2">
            <div className="relative">
              <button
                onClick={() => setShowEmojiSelector(!showEmojiSelector)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <Smile size={20} />
              </button>

              {showEmojiSelector && (
                <div 
                  ref={emojiSelectorRef}
                  className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-2 z-50 flex gap-1"
                >
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReactionClick(emoji)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {onReplyClick && (
              <button
                onClick={() => onReplyClick(message)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <MessageSquare size={20} />
              </button>
            )}
          </div>

          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {EMOJI_OPTIONS.map(emoji => {
                const count = getReactionCount(emoji);
                if (count > 0) {
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReactionClick(emoji)}
                      className={`px-2 py-1 rounded-full text-sm ${
                        hasUserReacted(emoji)
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      } hover:bg-opacity-80 transition-colors`}
                    >
                      {emoji} {count}
                    </button>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;
