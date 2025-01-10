'use client'

import { FC, useState, useEffect, useRef, ChangeEvent } from 'react'
import { Send, Paperclip, Smile, X, Image, FileText, Film, Music, Camera } from 'lucide-react'
import Message from './Message'
import EmojiPicker from 'emoji-picker-react'
import ScrollToTopButton from './ScrollToTopButton'
import { supabase } from '../lib/supabase'
import { getMessages, sendMessage, sendReply } from '../lib/supabase'
import ChatHeader from './ChatHeader'
import { useDropzone } from 'react-dropzone'
import debounce from 'lodash/debounce'
import type { EmojiClickData } from 'emoji-picker-react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface ChatAreaProps {
  activeWorkspace: string;
  activeChannel: string;
  currentUser: { id: string; email: string };
  onSwitchChannel: (channelId: string) => void;
  userWorkspaces: string[];
}

interface MessageType {
  id: string;
  user_id: string;
  channel: string;
  content: string;
  created_at: string;
  parent_id?: string;
  reactions?: { [key: string]: string[] };
  user: {
    id: string;
    username: string;
    avatar_url: string;
  };
  replies?: MessageType[];
  has_attachment?: boolean;
  file_attachments?: {
    id: string;
    file_name: string;
    file_type: string;
    file_url: string;
  }[];
}

interface SearchResult {
  channelId: string;
  messageId: string;
  content: string;
  sender: string;
  timestamp: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/*', 'application/pdf', 'text/plain', 'video/*', 'audio/*'];

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)
  const attachmentMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
    fetchChannelName()
    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' }, 
        (payload: { new: MessageType }) => {
          const newMessage = payload.new
          if (newMessage.channel === activeChannel) {
            setMessages(prevMessages => [...prevMessages, newMessage])
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [activeChannel])

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

  const fetchMessages = async () => {
    try {
      const fetchedMessages = await getMessages(activeChannel)
      setMessages(fetchedMessages)
      setError(null)
    } catch (err) {
      console.error('Error fetching messages:', err)
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
    if ((newMessage.trim() || selectedFiles.length > 0) && currentUser) {
      try {
        const fileUrls = await Promise.all(selectedFiles.map(file => uploadFile(file)))
        const sentMessage = await sendMessage(
          activeChannel, 
          currentUser.id, 
          newMessage.trim(), 
          fileUrls.join(',')
        )
        setMessages(prevMessages => [...prevMessages, sentMessage])
        setNewMessage('')
        setSelectedFiles([])
        setError(null)
        localStorage.removeItem(`draft_${activeChannel}`)
        chatContainerRef.current?.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      } catch (err) {
        console.error('Error sending message:', err)
        setError('Failed to send message. Please try again.')
      }
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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <ChatHeader
        channelName={channelName}
        isDM={false}
        onSearchResult={handleSearchResult}
        userWorkspaces={userWorkspaces}
      />
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold mb-2">Search Results:</h3>
          <ul className="flex-grow overflow-y-auto space-y-1 pr-2 custom-scrollbar">
            {searchResults.map((result, index) => (
              <li
                key={index}
                onClick={() => handleSelectSearchResult(result)}
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded"
              >
                <p className="font-semibold">{result.sender} in #{channelName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{result.content}</p>
                <p className="text-xs text-gray-500">{result.timestamp}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            currentUser={currentUser}
            onReply={handleReply}
            onReaction={(messageId, emoji) => {
              console.log('Reaction:', messageId, emoji)
            }}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative">
        <div className="absolute bottom-full left-0 right-0">
          <div className={`bg-gray-50 dark:bg-gray-800 rounded-t-lg transform transition-all duration-300 ease-in-out ${
            (isTyping || selectedFiles.length > 0) ? 'opacity-100' : 'opacity-0 translate-y-2 h-0 overflow-hidden'
          }`}>
            {isTyping && (
              <div className="text-sm text-gray-500 dark:text-gray-400 px-4 py-2">
                Someone is typing...
              </div>
            )}
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 py-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-1 text-xs">
                    {getFileIcon(file.type)}
                    <span className="ml-1 truncate max-w-[100px]">{file.name}</span>
                    <button type="button" onClick={() => removeFile(index)} className="ml-1 text-red-500 hover:text-red-700">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSendMessage} className="bg-gray-100 dark:bg-gray-800 p-4">
          {/* Hidden file inputs */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => handleFileInput(e, 'image')}
          />
          <input
            type="file" 
            ref={cameraInputRef}
            className="hidden"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileInput(e, 'camera')}
          />
          <input
            type="file"
            ref={documentInputRef} 
            className="hidden"
            accept=".pdf,.txt"
            onChange={(e) => handleFileInput(e, 'document')}
          />

          <div className="flex items-end gap-4">
            <div className="flex-1 relative">
              {/* Attachment button */}
              <div className="absolute -top-10 left-0">
                <button
                  type="button"
                  className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  title="Add attachment"
                >
                  <Paperclip size={18} />
                </button>

                {showAttachmentMenu && (
                  <div 
                    className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-2 z-50"
                    ref={attachmentMenuRef}
                  >
                    <button
                      type="button"
                      className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
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
                      className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
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
                      className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
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
              </div>

              <textarea
                value={newMessage}
                onChange={(e) => handleTextAreaChange(e)}
                placeholder="Type your message..."
                className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none min-h-[80px]"
                rows={3}
              />
            </div>

            {/* Send and emoji buttons */}
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={!newMessage.trim() && selectedFiles.length === 0}
                className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white transition-colors"
              >
                <Send size={20} />
              </button>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
              >
                <Smile size={20} />
              </button>
            </div>

            {/* Emoji picker popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-24 right-8 z-50 shadow-lg rounded-lg">
                <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white dark:bg-gray-700 rotate-45" />
                <EmojiPicker
                  onEmojiClick={(emojiObject: EmojiClickData) => {
                    setNewMessage(newMessage + emojiObject.emoji)
                    setShowEmojiPicker(false)
                  }}
                />
              </div>
            )}
          </div>
        </form>
      </div>
      <ScrollToTopButton />
    </div>
  )
}

export default ChatArea
