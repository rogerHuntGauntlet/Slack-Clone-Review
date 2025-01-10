import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { MessageSquare, Share2, Smile, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from 'next-themes';
import type { MessageType } from '../types/database';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const AVAILABLE_REACTIONS = ['👍', '❤️', '😂', '🎉', '🚀', '👀', '💯', '🙌', '🤔', '🔥'];

interface MessageProps {
  message: MessageType;
  currentUser: { id: string; email: string };
  onReplyClick?: (message: MessageType) => void;
  className?: string;
  isThreadView?: boolean;
}

const Message: React.FC<MessageProps> = ({
  message,
  currentUser,
  onReplyClick,
  className = '',
  isThreadView = false
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [replies, setReplies] = useState<MessageType[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const reactionPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((message.reply_count ?? 0) > 0 && (showReplies || isThreadView)) {
      loadReplies();
    }
  }, [message.id, showReplies, isThreadView]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        setShowReactionPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadReplies = async () => {
    setIsLoadingReplies(true);
    try {
      const { data: replies, error } = await supabase
        .from('messages')
        .select(`
          *,
          user:user_profiles!user_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq('parent_id', message.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setReplies(replies || []);
    } catch (error) {
      console.error('Error loading replies:', error);
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const handleReaction = async (emoji: string) => {
    try {
      const { data, error } = await supabase.rpc('handle_reaction', {
        p_message_id: message.id,
        p_user_id: currentUser.id,
        p_emoji: emoji
      });
      
      if (error) {
        console.error('Error adding reaction:', error);
        toast.error('Failed to add reaction');
        return;
      }

      // Update will happen through realtime subscription
      setShowReactionPicker(false);
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast.error('Failed to add reaction');
    }
  };

  if (!message || !message.id) {
    console.error('Invalid message data:', message);
    return null;
  }

  const reactions = message.reactions || {};
  const hasReplies = (message.reply_count ?? 0) > 0;

  return (
    <div 
      className={`p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${className}`} 
      id={`message-${message.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="relative w-10 h-10">
            <Image
              src={message.user?.avatar_url || `https://www.gravatar.com/avatar/${message.user?.id || '0'}?d=mp&f=y`}
              alt={message.user?.username || 'Unknown User'}
              width={40}
              height={40}
              className="rounded-full w-10 h-10 object-cover"
              unoptimized={message.user?.avatar_url?.startsWith('https://www.gravatar.com')}
              priority={true}
            />
          </div>
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">{message.user?.username || 'Unknown User'}</span>
            <span className="text-xs text-gray-500">
              {message.created_at ? new Date(message.created_at).toLocaleString() : ''}
            </span>
          </div>

          <p className="mt-1 text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
            {message.content || ''}
          </p>

          {message.file_attachments && message.file_attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.file_attachments.map((attachment, index) => (
                <div 
                  key={`${message.id}-attachment-${index}`}
                  className="inline-block max-w-xs"
                >
                  {attachment.file_type?.startsWith('image/') ? (
                    <a 
                      key={`image-${index}`}
                      href={attachment.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={attachment.file_url}
                        alt={attachment.file_name || 'Attachment'}
                        className="max-h-60 rounded-lg object-cover shadow-sm hover:shadow-md transition-shadow duration-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </a>
                  ) : (
                    <a
                      key={`file-${index}`}
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-blue-600 dark:text-blue-400 truncate">
                        {attachment.file_name || 'Download attachment'}
                      </span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reactions */}
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(reactions).map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={`inline-flex items-center px-2 py-1 rounded-full text-sm
                  ${(users as string[]).includes(currentUser.id)
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  } hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
              >
                <span>{emoji}</span>
                <span className="ml-1 text-xs font-medium">{(users as string[]).length}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 mt-2">
            <div className="relative" ref={reactionPickerRef}>
              <button
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                title="Add reaction"
              >
                <Smile size={20} />
              </button>
              {showReactionPicker && (
                <div className="absolute bottom-full left-0 z-50 p-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg border dark:border-gray-700">
                  <div className="flex gap-2">
                    {AVAILABLE_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(emoji)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <span className="text-xl">{emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {onReplyClick && (
              <button
                onClick={() => onReplyClick(message)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                title="Reply in thread"
              >
                <MessageSquare size={20} />
              </button>
            )}
          </div>

          {/* Thread Replies */}
          {hasReplies && !isThreadView && (
            <div className="mt-2">
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                {showReplies ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}
              </button>
              {showReplies && (
                <div className="mt-2 ml-4 border-l-2 border-gray-200 dark:border-gray-700">
                  {isLoadingReplies ? (
                    <div className="p-2 text-sm text-gray-500">Loading replies...</div>
                  ) : (
                    <div className="space-y-2">
                      {replies.map((reply) => (
                        <Message
                          key={reply.id}
                          message={reply}
                          currentUser={currentUser}
                          className="pl-4"
                          isThreadView={true}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Thread View Replies */}
          {hasReplies && isThreadView && (
            <div className="mt-2 ml-4 border-l-2 border-gray-200 dark:border-gray-700">
              {isLoadingReplies ? (
                <div className="p-2 text-sm text-gray-500">Loading replies...</div>
              ) : (
                <div className="space-y-2">
                  {replies.map((reply) => (
                    <Message
                      key={reply.id}
                      message={reply}
                      currentUser={currentUser}
                      className="pl-4"
                      isThreadView={true}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;
