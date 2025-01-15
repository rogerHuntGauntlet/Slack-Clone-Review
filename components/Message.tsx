import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { MessageSquare, Share2, Smile, FileText, ChevronDown, ChevronUp, MoreVertical, Pencil, Trash2, X, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import type { MessageType } from '../types/database';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import CodeBlock from './CodeBlock';

const AVAILABLE_REACTIONS = ['👍', '❤️', '😂', '🎉', '🚀', '👀', '💯', '🙌', '🤔', '🔥'];

interface MessageProps {
  message: MessageType;
  currentUser: { id: string; email: string };
  onReplyClick?: (message: MessageType) => void;
  className?: string;
  isThreadView?: boolean;
}

// Helper function to parse code blocks
const parseCodeBlocks = (content: string) => {
  const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index)
      });
    }

    // Add code block
    parts.push({
      type: 'code',
      language: match[1] || 'plaintext',
      content: match[2].trim()
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex)
    });
  }

  return parts;
};

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
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if ((message.reply_count ?? 0) > 0 && (showReplies || isThreadView)) {
      loadReplies();
    }
  }, [message.id, showReplies, isThreadView]);

  // Add realtime subscription for message updates
  useEffect(() => {
    const channel = supabase
      .channel(`message-${message.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `id=eq.${message.id}`
        },
        (payload: {
          eventType: 'INSERT' | 'UPDATE' | 'DELETE';
          new: MessageType;
          old: MessageType;
        }) => {
          if (payload.eventType === 'UPDATE') {
            // Update the message content in the UI
            setEditedContent(payload.new.content);
            if (!isEditing) {
              message.content = payload.new.content;
              message.is_edited = payload.new.is_edited;
              message.updated_at = payload.new.updated_at;
            }
          } else if (payload.eventType === 'DELETE') {
            // Hide the message in the UI
            const messageElement = document.getElementById(`message-${message.id}`);
            if (messageElement) {
              messageElement.style.display = 'none';
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [message.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        setShowReactionPicker(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.setSelectionRange(editInputRef.current.value.length, editInputRef.current.value.length);
    }
  }, [isEditing]);

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

  const handleEdit = async () => {
    if (!editedContent.trim()) return;
    
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          content: editedContent.trim(),
          updated_at: new Date().toISOString(),
          is_edited: true
        })
        .eq('id', message.id);

      if (error) throw error;
      
      setIsEditing(false);
      setShowMenu(false);
      toast.success('Message updated');
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update message');
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', message.id)
        .eq('user_id', currentUser.id);

      if (error) throw error;
      
      setShowDeleteConfirm(false);
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedContent(message.content || '');
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
      id={`message-${message.id}`}
      className={`flex gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 relative group ${className}`}
    >
      <div className="flex-shrink-0">
        {message.user?.avatar_url ? (
          <Image
            src={message.user.avatar_url}
            alt={message.user?.username || 'User avatar'}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
              {(message.user?.username || 'U')[0].toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 break-words">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">
            {message.user?.username || 'Unknown User'}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(message.created_at).toLocaleTimeString()}
          </span>
          {message.is_edited && (
            <span className="text-xs text-gray-400 dark:text-gray-500">(edited)</span>
          )}
        </div>

        {isEditing ? (
          <textarea
            ref={editInputRef}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full mt-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 break-words"
          />
        ) : (
          <div className="mt-1 text-gray-900 dark:text-white whitespace-pre-wrap break-words">
            <div className="mt-1 space-y-2">
              {parseCodeBlocks(message.content || '').map((part, index) => (
                part.type === 'code' ? (
                  <CodeBlock
                    key={index}
                    code={part.content}
                    language={part.language || 'plaintext'}
                    isEditable={message.user_id === currentUser.id}
                    onUpdate={(newCode) => {
                      // Handle code update logic here
                      const parts = parseCodeBlocks(message.content || '');
                      parts[index].content = newCode;
                      const newContent = parts.map(p => 
                        p.type === 'code' 
                          ? `\`\`\`${p.language || 'plaintext'}\n${p.content}\n\`\`\``
                          : p.content
                      ).join('');
                      setEditedContent(newContent);
                      handleEdit();
                    }}
                  />
                ) : (
                  <div key={index} className="whitespace-pre-wrap">
                    {part.content}
                  </div>
                )
              ))}
            </div>
          </div>
        )}

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
                ) : attachment.file_type === 'video/webm' ? (
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-w-2xl">
                    <video
                      src={attachment.file_url}
                      className="w-full h-full object-contain"
                      controls
                      preload="metadata"
                    />
                  </div>
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
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center gap-1"
              title="Reply in thread"
            >
              <MessageSquare size={20} />
              {message.reply_count > 0 && (
                <span className="text-xs font-medium">{message.reply_count}</span>
              )}
            </button>
          )}
        </div>

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

      {message.user_id === currentUser.id && (
        <div className="relative ml-auto" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <button
                onClick={() => {
                  setIsEditing(true);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Message
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Message;
