'use client'

import { FC, useState, useEffect, useRef, ChangeEvent } from 'react'
import { Send, Paperclip, Smile, X, Image, FileText, Film, Music, Camera } from 'lucide-react'
import Message from './Message'
import ScrollToTopButton from './ScrollToTopButton'
import { supabase } from '../lib/supabase'
import ChatHeader from './ChatHeader'
import debounce from 'lodash/debounce'
import type { MessageType } from '../types/database'
import { useTheme } from 'next-themes'
import ReplyModal from './ReplyModal'
import { sendReply } from '../lib/supabase'

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉'];

interface SearchResult {
  channelId: string;
  messageId: string;
  content: string;
  sender: string;
  timestamp: string;
}

interface ChatAreaProps {
  activeWorkspace: string;
  activeChannel: string;
  currentUser: { id: string; email: string };
  onSwitchChannel: (channelId: string) => void;
  userWorkspaces: string[];
}

const ChatArea: FC<ChatAreaProps> = ({ activeWorkspace, activeChannel, currentUser, onSwitchChannel, userWorkspaces }) => {
  const [messages, setMessages] = useState<MessageType[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [channelName, setChannelName] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [replyingTo, setReplyingTo] = useState<MessageType | null>(null)
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MessageType | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)
  const attachmentMenuRef = useRef<HTMLDivElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const { theme: appTheme } = useTheme()

  const debouncedFetchMessages = useRef(
    debounce(() => {
      fetchMessages();
    }, 5000)
  ).current;

  useEffect(() => {
    fetchMessages();
    fetchChannelName();
    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' }, 
        async (payload: { new: MessageType }) => {
          debouncedFetchMessages();
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe();
      debouncedFetchMessages.cancel();
    }
  }, [activeChannel]);

  useEffect(() => {
    const savedDraft = localStorage.getItem(`draft_${activeChannel}`)
    if (savedDraft) {
      setNewMessage(savedDraft)
    }
  }, [activeChannel])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (chatContainerRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && !lastMessage.parent_id) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const fetchMessages = async () => {
    try {
      console.log('Fetching messages for channel:', activeChannel)
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          user:users!messages_user_id_fkey (
            id,
            username,
            avatar_url
          )
        `)
        .eq('channel', activeChannel || '')
        .is('is_direct_message', false)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Raw messages:', messages)

      // Transform the messages
      const transformedMessages = messages.map((message: MessageType) => ({
        ...message,
        user: message.user || { 
          id: message.user_id,
          username: 'Unknown User',
          avatar_url: null
        }
      }))

      console.log('Transformed messages:', transformedMessages)
      setMessages(transformedMessages)
    } catch (error) {
      console.error('Error fetching messages:', error)
      setError('Failed to load messages. Please try again.')
    }
  }

  const fetchChannelName = async () => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('name')
        .eq('id', activeChannel)
        .single()

      if (error) throw error;
      setChannelName(data.name)
    } catch (err) {
      console.error('Error fetching channel name:', err)
      setError('Failed to load channel name. Please try again.')
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() && selectedFiles.length === 0) return

    try {
      // Upload files first if any
      const fileAttachments = await Promise.all(
        selectedFiles.map(async (file) => {
          const fileUrl = await uploadFile(file)
          return {
            file_name: file.name,
            file_type: file.type,
            file_url: fileUrl
          }
        })
      )

      // Send message with file attachments
      const { data: message, error } = await supabase
        .from('messages')
        .insert([
          {
            content: newMessage.trim(),
            channel: activeChannel,
            user_id: currentUser.id,
            file_attachments: fileAttachments.length > 0 ? fileAttachments : null
          }
        ])
        .select(`
          *,
          user:users!messages_user_id_fkey (
            id,
            username,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      // Clear input and files
      setNewMessage('')
      setSelectedFiles([])
      localStorage.removeItem(`draft_${activeChannel}`)

      // Scroll to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    } catch (error) {
      console.error('Error sending message:', error)
      setError('Failed to send message. Please try again.')
    }
  }

  const handleReply = async (parentId: string, content: string) => {
    if (content && currentUser) {
      try {
        const sentReply = await sendReply(activeChannel, currentUser.id, parentId, content)
        setMessages(prevMessages => prevMessages.map(message => 
          message.id === parentId 
            ? { ...message, replies: [...(message.replies || []), sentReply] }
            : message
        ))
        setError(null)
      } catch (err) {
        console.error('Error sending reply:', err)
        setError('Failed to send reply. Please try again.')
      }
    }
  }

  const handleSearchResult = (result: SearchResult) => {
    setSearchResults(prevResults => [...prevResults, result]);
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    if (result.channelId !== activeChannel) {
      onSwitchChannel(result.channelId);
    }
    
    setTimeout(() => {
      const messageElement = document.getElementById(`message-${result.messageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.classList.add('bg-yellow-100', 'dark:bg-yellow-900');
        setTimeout(() => {
          messageElement.classList.remove('bg-yellow-100', 'dark:bg-yellow-900');
        }, 3000);
      }
    }, 100);

    setSearchResults([]);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>, type: 'image' | 'camera' | 'document') => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      if (type === 'image') return file.type.startsWith('image/')
      if (type === 'camera') return file.type.startsWith('image/')
      if (type === 'document') return file.type === 'application/pdf' || file.type === 'text/plain'
      return false
    })
    
    setSelectedFiles(prev => [...prev, ...validFiles])
    e.target.value = '' // Reset input
  }

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const { data, error } = await supabase.storage
      .from('message_attachments')
      .upload(fileName, file)

    if (error) {
      console.error('Error uploading file:', error)
      throw error
    }

    const { data: publicUrlData } = supabase.storage
      .from('message_attachments')
      .getPublicUrl(fileName)

    return publicUrlData.publicUrl
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index))
  }

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNewMessage(value)
    setIsTyping(true)
    debouncedSaveDraft(value)
    debouncedStopTyping()
  }

  const debouncedSaveDraft = debounce((value: string) => {
    localStorage.setItem(`draft_${activeChannel}`, value)
  }, 500)

  const debouncedStopTyping = debounce(() => {
    setIsTyping(false)
  }, 1000)

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image size={24} />;
    if (fileType === 'application/pdf' || fileType === 'text/plain') return <FileText size={24} />;
    if (fileType.startsWith('video/')) return <Film size={24} />;
    if (fileType.startsWith('audio/')) return <Music size={24} />;
    return <Paperclip size={24} />;
  }

  const handleReplyClick = (message: MessageType) => {
    setSelectedMessage(message);
    setReplyModalOpen(true);
  };

  const handleReplySubmit = async (parentId: string, content: string) => {
    try {
      await sendReply(activeChannel, currentUser.id, parentId, content);
      // Refresh messages after reply
      fetchMessages();
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const handleReaction = async (messageId: string, reaction: string) => {
    const messageToUpdate = messages.find(m => m.id === messageId);
    if (!messageToUpdate) return;

    try {
      const currentReactions = messageToUpdate.reactions || {};
      const userReactions = currentReactions[reaction] || [];
      const hasReacted = userReactions.includes(currentUser.id);

      if (hasReacted) {
        // Remove reaction
        const updatedReactions = {
          ...currentReactions,
          [reaction]: userReactions.filter(id => id !== currentUser.id)
        };

        await supabase
          .from('messages')
          .update({ reactions: updatedReactions })
          .eq('id', messageId);

        // Update local state
        setMessages(prevMessages => 
          prevMessages.map(m => 
            m.id === messageId 
              ? {
                  ...m,
                  reactions: updatedReactions
                }
              : m
          )
        );
      } else {
        // Add reaction
        const updatedReactions = {
          ...currentReactions,
          [reaction]: [...userReactions, currentUser.id]
        };

        await supabase
          .from('messages')
          .update({ reactions: updatedReactions })
          .eq('id', messageId);

        // Update local state
        setMessages(prevMessages => 
          prevMessages.map(m => 
            m.id === messageId 
              ? {
                  ...m,
                  reactions: updatedReactions
                }
              : m
          )
        );
      }
      debouncedFetchMessages();
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-gray-900 transition-all duration-300">
      <ChatHeader
        channelName={channelName}
        isDM={false}
        onSearchResult={handleSearchResult}
        userWorkspaces={userWorkspaces}
      />
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mx-2" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 w-full max-w-[calc(100%-1rem)] mx-auto">
          <h3 className="text-lg font-semibold mb-2">Search Results:</h3>
          <ul className="flex-grow overflow-y-auto space-y-1 pr-2 custom-scrollbar">
            {searchResults.map((result, index) => (
              <li
                key={index}
                onClick={() => handleSelectSearchResult(result)}
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded"
              >
                <p className="font-semibold truncate">{result.sender} in #{channelName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{result.content}</p>
                <p className="text-xs text-gray-500">{result.timestamp}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-2 custom-scrollbar w-full max-w-[calc(100%-0.5rem)] mx-auto space-y-px">
        {messages.map((message, index) => (
          <Message
            key={message.id}
            message={message}
            currentUser={currentUser}
            onReplyClick={handleReplyClick}
            onReactionSelect={handleReaction}
            className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-gray-50 dark:bg-gray-800/50'}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative w-full max-w-[calc(100%-0.5rem)] mx-auto">
        <form onSubmit={handleSendMessage} className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileInput(e, 'image')} />
          <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileInput(e, 'camera')} />
          <input type="file" ref={documentInputRef} className="hidden" accept=".pdf,.txt" onChange={(e) => handleFileInput(e, 'document')} />

          <div className="max-w-[95%] mx-auto">
            <div className="relative flex flex-col rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm">
              {selectedFiles.length > 0 && (
                <div className="p-3 border-b border-gray-200 dark:border-gray-600 flex gap-2 flex-wrap">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="w-20 h-20 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-50 dark:bg-gray-800">
                        {file.type.startsWith('image/') ? (
                          <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText size={24} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end p-2">
                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => handleTextAreaChange(e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder="Send a message..."
                    className="w-full p-2 pr-24 bg-transparent border-0 outline-none text-gray-900 dark:text-white resize-none min-h-[44px] max-h-[300px] text-sm whitespace-pre-wrap"
                    rows={3}
                    style={{
                      height: newMessage.split('\n').length > 1 ? 'auto' : '44px',
                      minHeight: '44px'
                    }}
                  />
                  
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <button
                      type="button"
                      className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile size={20} />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors relative"
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                    >
                      <Paperclip size={20} />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!newMessage.trim() && selectedFiles.length === 0}
                  className="ml-2 p-2 rounded-full bg-[#007a5a] hover:bg-[#148567] disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white transition-colors flex-shrink-0"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>

            {showAttachmentMenu && (
              <div 
                className="absolute bottom-full right-12 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-2 min-w-[200px]"
                ref={attachmentMenuRef}
              >
                <button
                  type="button"
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachmentMenu(false);
                  }}
                >
                  <Image size={18} />
                  <span>Upload image</span>
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                  onClick={() => {
                    cameraInputRef.current?.click();
                    setShowAttachmentMenu(false);
                  }}
                >
                  <Camera size={18} />
                  <span>Take photo</span>
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                  onClick={() => {
                    documentInputRef.current?.click();
                    setShowAttachmentMenu(false);
                  }}
                >
                  <FileText size={18} />
                  <span>Upload document</span>
                </button>
              </div>
            )}
            {showEmojiPicker && (
              <div 
                className="absolute bottom-full right-12 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-2 z-50 grid grid-cols-5 gap-2"
                ref={emojiPickerRef}
              >
                {EMOJI_OPTIONS.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setNewMessage(prev => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xl"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>
      </div>
      <ScrollToTopButton />
      {replyModalOpen && selectedMessage && (
        <ReplyModal
          isOpen={replyModalOpen}
          onClose={() => setReplyModalOpen(false)}
          parentMessage={selectedMessage}
          onReply={handleReplySubmit}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}

export default ChatArea
