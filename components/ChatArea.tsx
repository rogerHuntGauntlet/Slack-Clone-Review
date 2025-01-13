'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';
import { 
  X, 
  FileText, 
  BoldIcon, 
  ItalicIcon, 
  StrikethroughIcon, 
  CodeIcon, 
  ListIcon, 
  ListOrderedIcon, 
  PaperclipIcon, 
  SendIcon 
} from 'lucide-react';
import type { MessageType, FileAttachment } from '../types/database';
import type { ChatAreaProps } from '@/types/components';
import Message from './Message';
import ReplyModal from './ReplyModal';

interface MessageWithUserProfile extends MessageType {
  user_profiles: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

interface StorageBucket {
  id: string;
  name: string;
  owner: string;
  created_at: string;
  updated_at: string;
  public: boolean;
}

const ChatArea: React.FC<ChatAreaProps> = ({ 
  activeWorkspace,
  activeChannel,
  currentUser,
  onSwitchChannel,
  userWorkspaces,
  onThreadStateChange
}) => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [threadMessage, setThreadMessage] = useState<MessageType | null>(null);
  const [threadMessages, setThreadMessages] = useState<MessageType[]>([]);
  const [newThreadMessage, setNewThreadMessage] = useState('');
  const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>([]);
  const [threadFileAttachments, setThreadFileAttachments] = useState<FileAttachment[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MessageType | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showThreadView, setShowThreadView] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClientComponentClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadMessagesEndRef = useRef<HTMLDivElement>(null);
  const mainChatRef = useRef<HTMLDivElement>(null);
  const threadChatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change and shouldScrollToBottom is true
  useEffect(() => {
    if (shouldScrollToBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldScrollToBottom]);

  // Scroll to bottom when thread messages change
  useEffect(() => {
    if (threadMessagesEndRef.current) {
      threadMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threadMessages]);

  // Check if user is near bottom when scrolling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const div = e.currentTarget;
    const isNearBottom = div.scrollHeight - div.scrollTop - div.clientHeight < 100;
    setIsNearBottom(isNearBottom);
    setShouldScrollToBottom(isNearBottom);
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isThreadMessage: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAttachments: FileAttachment[] = [];
    const maxSize = 5 * 1024 * 1024; // 5MB

    try {
      // Process files
      for (const file of Array.from(files)) {
        if (file.size > maxSize) {
          toast.error(`${file.name} is too large (max 5MB)`);
          continue;
        }

        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

          const { error: uploadError, data } = await supabase.storage
            .from('chat_attachments')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            toast.error(`Failed to add ${file.name}`);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('chat_attachments')
            .getPublicUrl(fileName);

          newAttachments.push({
            file_name: file.name,
            file_type: file.type,
            file_url: publicUrl
          });

          toast.success(`Added ${file.name}`);
        } catch (error) {
          console.error('Upload error:', error);
          toast.error(`Failed to add ${file.name}`);
        }
      }

      if (newAttachments.length > 0) {
        if (isThreadMessage) {
          setThreadFileAttachments(prev => [...prev, ...newAttachments]);
        } else {
          setFileAttachments(prev => [...prev, ...newAttachments]);
        }
      }
    } catch (error) {
      console.error('Error handling file upload:', error);
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  console.log('ChatArea render - Current state:', {
    channelId: activeChannel,
    messageCount: messages.length,
    loading,
    currentUser,
    threadView: showThreadView
  });

  useEffect(() => {
    if (activeChannel) {
      console.log('ChatArea: Channel ID changed, setting up...', activeChannel);
      fetchMessages();

      // Set up realtime subscription
      const channel = supabase
        .channel(`messages:${activeChannel}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `channel_id=eq.${activeChannel}`
          },
          async (payload: {
            new: {
              id: string;
              channel_id: string;
              content: string;
              created_at: string;
              user_id: string;
              parent_id: string | null;
            };
          }) => {
            console.log('Realtime: New message received:', payload);
            
            // Fetch the complete message with user data
            const { data: newMessage, error } = await supabase
              .from('messages')
              .select(`
                *,
                user_profiles!user_id (
                  id,
                  username,
                  avatar_url
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('Realtime: Error fetching new message details:', error);
              return;
            }

            if (newMessage) {
              console.log('Realtime: Adding new message to state:', newMessage);
              // Transform the new message to match the expected format
              const transformedMessage = {
                ...(newMessage as MessageWithUserProfile),
                user: newMessage.user_profiles
              };

              // If it's a reply and we're viewing that thread, add it to thread messages
              if (transformedMessage.parent_id && threadMessage?.id === transformedMessage.parent_id) {
                setThreadMessages(prev => [...prev, transformedMessage]);
              }
              // If it's a main message or we're not viewing its thread, add it to main messages
              else if (!transformedMessage.parent_id) {
                setMessages(prev => [...prev, transformedMessage]);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `channel_id=eq.${activeChannel}`
          },
          async (payload: {
            new: {
              id: string;
              channel_id: string;
            };
          }) => {
            console.log('Realtime: Message updated:', payload);
            
            // Fetch the complete updated message
            const { data: updatedMessage, error } = await supabase
              .from('messages')
              .select(`
                *,
                user:user_profiles!user_id (
                  id,
                  username,
                  avatar_url
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('Error fetching updated message:', error);
              return;
            }

            // Update the message in state
            setMessages(prev => prev.map(msg => 
              msg.id === payload.new.id 
                ? { ...msg, ...updatedMessage }
                : msg
            ));

            // Also update thread messages if necessary
            setThreadMessages(prev => prev.map(msg => 
              msg.id === payload.new.id 
                ? { ...msg, ...updatedMessage }
                : msg
            ));

            // Update thread message if it's the one being updated
            if (threadMessage?.id === payload.new.id) {
              setThreadMessage(prev => 
                prev ? { ...prev, ...updatedMessage } : null
              );
            }
          }
        )
        .subscribe();

      return () => {
        console.log('ChatArea: Cleaning up subscription for channel:', activeChannel);
        channel.unsubscribe();
      };
    }
  }, [activeChannel, threadMessage?.id]);

  const fetchMessages = async () => {
    if (!activeChannel) {
      console.log('fetchMessages: No channel ID provided');
      return;
    }

    try {
      setLoading(true);
      
      const query = supabase
        .from('messages')
        .select(`
          *,
          user_profiles!user_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq('channel_id', activeChannel)
        .is('parent_id', null)  // Only fetch main messages, not replies
        .order('created_at', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
        return;
      }

      // Transform the data to match the expected format
      const transformedData = (data as MessageWithUserProfile[] || []).map(message => ({
        ...message,
        user: message.user_profiles
      }));

      console.log('Fetched messages:', transformedData);
      setMessages(transformedData);
    } catch (error) {
      console.error('Error in fetchMessages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchThreadMessages = async (parentId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          user_profiles!user_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching thread messages:', error);
        toast.error('Failed to load thread messages');
        return;
      }

      // Transform the data to match the expected format
      const transformedData = (data as MessageWithUserProfile[] || []).map(message => ({
        ...message,
        user: message.user_profiles
      }));

      setThreadMessages(transformedData);
    } catch (error) {
      console.error('Error in fetchThreadMessages:', error);
      toast.error('Failed to load thread messages');
    }
  };

  const handleSendMessage = async (e: React.FormEvent, isThreadMessage: boolean = false) => {
    e.preventDefault();
    const content = isThreadMessage ? newThreadMessage : newMessage;
    const attachments = isThreadMessage ? threadFileAttachments : fileAttachments;

    if (!content.trim() && attachments.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content: content.trim(),
          channel_id: activeChannel,
          user_id: currentUser.id,
          file_attachments: attachments,
          parent_id: isThreadMessage ? threadMessage?.id : null
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        return;
      }

      console.log('Message sent:', data);
      if (isThreadMessage) {
        setNewThreadMessage('');
        setThreadFileAttachments([]);
      } else {
        setNewMessage('');
        setFileAttachments([]);
        // Reset textarea height to default
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.style.height = '64px';
        }
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      toast.error('Failed to send message');
    }
  };

  const handleSendReply = async (content: string) => {
    if (!selectedMessage) return;
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          channel_id: activeChannel,
          user_id: currentUser.id,
          parent_id: selectedMessage.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending reply:', error);
        toast.error('Failed to send reply');
        return;
      }

      console.log('Reply sent:', data);
      setShowReplyModal(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error in handleSendReply:', error);
      toast.error('Failed to send reply');
    }
  };

  const handleSubmit = async (e: React.FormEvent, isThreadMessage: boolean = false) => {
    e.preventDefault();
    await handleSendMessage(e, isThreadMessage);
  };

  const handleKeyPress = async (e: React.KeyboardEvent<HTMLTextAreaElement>, isThreadMessage: boolean = false) => {
    // Handle list continuation on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      const textarea = e.currentTarget;
      const text = textarea.value;
      const cursorPos = textarea.selectionStart;
      const currentLine = text.substring(0, cursorPos).split('\n').pop() || '';

      // Check for list patterns
      const bulletMatch = currentLine.match(/^(\s*)[•-]\s(.*)/);
      const numberMatch = currentLine.match(/^(\s*)\d+\.\s(.*)/);

      if (bulletMatch || numberMatch) {
        e.preventDefault();
        const [, indent, content] = bulletMatch || numberMatch || [];
        
        // If line is empty, end the list
        if (!content.trim()) {
          const newText = text.substring(0, cursorPos - (currentLine.length + 1)) + text.substring(cursorPos);
          if (isThreadMessage) {
            setNewThreadMessage(newText);
          } else {
            setNewMessage(newText);
          }
          return;
        }

        // Continue the list
        const nextItem = bulletMatch ? `${indent}- ` : `${indent}${(text.substring(0, cursorPos).match(/\n/g) || []).length + 1}. `;
        const newText = text.substring(0, cursorPos) + '\n' + nextItem + text.substring(cursorPos);
        if (isThreadMessage) {
          setNewThreadMessage(newText);
        } else {
          setNewMessage(newText);
        }
        return;
      }
    }

    // Handle Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const text = textarea.value;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // If text is selected, indent/outdent all selected lines
      if (start !== end) {
        const selectedText = text.substring(start, end);
        const lines = selectedText.split('\n');
        const newLines = lines.map(line => 
          e.shiftKey ? line.replace(/^\s{2}/, '') : '  ' + line
        );
        const newText = text.substring(0, start) + newLines.join('\n') + text.substring(end);
        if (isThreadMessage) {
          setNewThreadMessage(newText);
        } else {
          setNewMessage(newText);
        }
        return;
      }

      // If no text is selected, just add/remove indentation at cursor
      const newText = e.shiftKey
        ? text.substring(0, start).replace(/\s{2}$/, '') + text.substring(end)
        : text.substring(0, start) + '  ' + text.substring(end);
      if (isThreadMessage) {
        setNewThreadMessage(newText);
      } else {
        setNewMessage(newText);
      }
      return;
    }

    // Original Enter handling for sending message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const content = isThreadMessage ? newThreadMessage : newMessage;
      const attachments = isThreadMessage ? threadFileAttachments : fileAttachments;
      if (!content.trim() && attachments.length === 0) return;
      await handleSendMessage(e as any, isThreadMessage);
    }

    // Handle formatting shortcuts
    if (e.ctrlKey || e.metaKey) {
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const text = e.currentTarget.value;
      const before = text.substring(0, start);
      const selection = text.substring(start, end);
      const after = text.substring(end);

      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          setNewMessage(`${before}**${selection}**${after}`);
          break;
        case 'i':
          e.preventDefault();
          setNewMessage(`${before}*${selection}*${after}`);
          break;
        case 'e':  // Ctrl+E for strikethrough
          e.preventDefault();
          setNewMessage(`${before}~~${selection}~~${after}`);
          break;
        case 'k':  // Ctrl+K for code
          e.preventDefault();
          setNewMessage(`${before}\`${selection}\`${after}`);
          break;
      }
    }
  };

  const handleThreadClick = async (message: MessageType) => {
    setThreadMessage(message);
    setShowThreadView(true);
    onThreadStateChange?.(true);
    await fetchThreadMessages(message.id);
  };

  const handleOpenThread = async (message: MessageType) => {
    setThreadMessage(message);
    onThreadStateChange?.(true);
    // Fetch thread messages
    const { data: threadMessages, error } = await supabase
      .from('messages')
      .select('*, user:users(*)')
      .eq('parent_id', message.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching thread messages:', error);
      return;
    }

    setThreadMessages(threadMessages || []);
  };

  const handleCloseThread = () => {
    setThreadMessage(null);
    setThreadMessages([]);
    onThreadStateChange?.(false);
  };

  const handleFormat = (before: string, after: string) => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const beforeText = text.substring(0, start);
      const selection = text.substring(start, end);
      const afterText = text.substring(end);
      setNewMessage(`${beforeText}${before}${selection}${after}${afterText}`);
      textarea.focus();
    }
  };

  const handleListFormat = (format: 'bullet' | 'number') => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const selection = text.substring(start, end);
      const after = text.substring(end);
      const lines = selection ? selection.split('\n') : [''];
      const formattedList = lines.map(line => {
        if (format === 'bullet') {
          return `- ${line}`;
        } else if (format === 'number') {
          return `${lines.indexOf(line) + 1}. ${line}`;
        }
      }).join('\n');
      setNewMessage(`${before}${formattedList}${after}`);
      textarea.focus();
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    handleFileUpload(e, false);
  };

  const handleTextAreaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setNewMessage(textarea.value);
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate new height based on content
    const newHeight = Math.min(Math.max(64, textarea.scrollHeight), 250);
    textarea.style.height = `${newHeight}px`;
  };

  return (
    <div className="flex h-full min-w-0 max-w-full">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 max-w-full">
        <div 
          className="flex-1 overflow-y-auto p-4 min-w-0" 
          ref={mainChatRef}
          onScroll={handleScroll}
        >
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : (
            <div className="space-y-4 min-w-0">
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  currentUser={currentUser}
                  onReplyClick={handleThreadClick}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="px-4 pb-4 pt-2 min-w-0">
          <form onSubmit={(e) => handleSubmit(e, false)} className="flex flex-col gap-2">
            {/* Formatting Toolbar */}
            <div className="flex items-center space-x-2 px-4 py-2 border-t dark:border-gray-700">
              <button
                type="button"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                onClick={() => handleFormat('**', '**')}
                title="Bold (Ctrl+B)"
              >
                <BoldIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                onClick={() => handleFormat('*', '*')}
                title="Italic (Ctrl+I)"
              >
                <ItalicIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                onClick={() => handleFormat('~~', '~~')}
                title="Strikethrough (Ctrl+E)"
              >
                <StrikethroughIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                onClick={() => handleFormat('`', '`')}
                title="Code (Ctrl+K)"
              >
                <CodeIcon className="w-5 h-5" />
              </button>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />
              <button
                type="button"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                onClick={() => handleListFormat('bullet')}
                title="Bullet List"
              >
                <ListIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                onClick={() => handleListFormat('number')}
                title="Numbered List"
              >
                <ListOrderedIcon className="w-5 h-5" />
              </button>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />
              <button
                type="button"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative"
                onClick={handleFileClick}
                title="Attach File"
              >
                <PaperclipIcon className="w-5 h-5" />
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                  multiple
                />
              </button>
              <button
                type="button"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                onClick={handleSendMessage}
                disabled={!newMessage.trim() && fileAttachments.length === 0}
              >
                <SendIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
              <textarea
                value={newMessage}
                onChange={handleTextAreaInput}
                onKeyDown={(e) => handleKeyPress(e, false)}
                placeholder={isUploading ? "Uploading files..." : "Message #general"}
                className="flex-1 p-2 bg-transparent focus:outline-none min-h-[64px] max-h-[250px] resize-none rounded-l overflow-y-auto"
                rows={2}
              />
              <button
                type="submit"
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 mr-1"
                disabled={isUploading || (!newMessage.trim() && fileAttachments.length === 0)}
              >
                <svg viewBox="0 0 20 20" className="w-5 h-5 rotate-90 fill-current">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11h2v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                </svg>
              </button>
            </div>
            {fileAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {fileAttachments.map((file, index) => (
                  <div key={index} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 text-sm">
                    <span className="truncate max-w-[200px]">{file.file_name}</span>
                    <button
                      type="button"
                      onClick={() => setFileAttachments(prev => prev.filter((_, i) => i !== index))}
                      className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      disabled={isUploading}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Thread View */}
      {showThreadView && threadMessage && (
        <div className="w-96 border-l dark:border-gray-700 flex flex-col h-full">
          <div className="p-4 border-b dark:border-gray-700 flex items-center gap-2">
            <h3 className="text-lg font-semibold">Thread</h3>
            <button
              onClick={() => {
                setShowThreadView(false);
                setThreadMessage(null);
                setThreadMessages([]);
                setNewThreadMessage('');
                setThreadFileAttachments([]);
                onThreadStateChange?.(false);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <X size={16} />
            </button>
          </div>

          <div 
            className="flex-1 overflow-y-auto p-4" 
            ref={threadChatRef}
          >
            <Message
              message={threadMessage}
              currentUser={currentUser}
              isThreadView
            />
            <div className="mt-4 space-y-4">
              {threadMessages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  currentUser={currentUser}
                  isThreadView
                />
              ))}
              <div ref={threadMessagesEndRef} />
            </div>
          </div>

          {/* Thread Reply Input */}
          <div className="px-4 pb-4 pt-2">
            <form onSubmit={(e) => handleSubmit(e, true)} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
                <label className={`cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l ${isUploading ? 'animate-pulse' : ''}`}>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, true)}
                    disabled={isUploading}
                  />
                  <FileText 
                    size={20} 
                    className={`${threadFileAttachments.length > 0 ? 'text-blue-500' : isUploading ? 'text-yellow-500' : 'text-gray-400'}`} 
                  />
                </label>
                <textarea
                  value={newThreadMessage}
                  onChange={(e) => setNewThreadMessage(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, true)}
                  placeholder={isUploading ? "Uploading files..." : "Reply in thread..."}
                  className="flex-1 p-2 bg-transparent focus:outline-none min-h-[44px] max-h-[200px] resize-none"
                  rows={1}
                />
                <button
                  type="submit"
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 mr-1"
                  disabled={isUploading || (!newThreadMessage.trim() && threadFileAttachments.length === 0)}
                >
                  <svg viewBox="0 0 20 20" className="w-5 h-5 rotate-90 fill-current">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11h2v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                  </svg>
                </button>
              </div>
              {threadFileAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {threadFileAttachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 text-sm">
                      <span className="truncate max-w-[200px]">{file.file_name}</span>
                      <button
                        type="button"
                        onClick={() => setThreadFileAttachments(prev => prev.filter((_, i) => i !== index))}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        disabled={isUploading}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatArea;
