'use client'

import { FC, useState, useEffect, useRef, ChangeEvent } from 'react'
import { Send, Paperclip, Smile, X, Image, FileText, Film, Music } from 'lucide-react'
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
  currentUser: any;
  onSwitchChannel: (channelId: string) => void;
  userWorkspaces: string[];
  onToggleExpand?: () => void;
  isExpanded?: boolean;
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

const ChatArea: FC<ChatAreaProps> = ({ 
  activeWorkspace, 
  activeChannel, 
  currentUser, 
  onSwitchChannel,
  userWorkspaces,
  onToggleExpand,
  isExpanded = false
}) => {
  const [messages, setMessages] = useState<MessageType[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [channelName, setChannelName] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

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

  useEffect(() => {
    if (chatContainerRef.current) {
      // Only auto-scroll if the new message is not a reply
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage?.parent_id) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((newMessage.trim() || selectedFiles.length > 0) && currentUser) {
      try {
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

        const sentMessage = await sendMessage(
          activeChannel, 
          currentUser.id, 
          newMessage.trim(),
          JSON.stringify(fileAttachments)
        )

        setMessages(prevMessages => [...prevMessages, {
          ...sentMessage,
          file_attachments: fileAttachments
        }])
        
        setNewMessage('')
        setSelectedFiles([])
        setError(null)
        localStorage.removeItem(`draft_${activeChannel}`)
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
        
        // Create the reply with proper user information
        const replyWithUser = {
          ...sentReply,
          parent_id: parentId,
          user: {
            id: currentUser.id,
            username: currentUser.email.split('@')[0], // Use email username as display name
            avatar_url: '/placeholder.svg?height=40&width=40'
          }
        }
        
        // Update the messages state to include the new reply
        setMessages(prevMessages => prevMessages.map(message => 
          message.id === parentId 
            ? { 
                ...message, 
                replies: [...(message.replies || []), replyWithUser]
              }
            : message.id === sentReply.parent_id
              ? {
                  ...message,
                  replies: [...(message.replies || []), replyWithUser]
                }
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

  const onDrop = (acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => file.size <= MAX_FILE_SIZE);
    const invalidFiles = acceptedFiles.filter(file => file.size > MAX_FILE_SIZE);
    
    setSelectedFiles(prevFiles => [...prevFiles, ...validFiles]);
    
    if (invalidFiles.length > 0) {
      setError(`Some files were not added because they exceed the 5MB limit: ${invalidFiles.map(f => f.name).join(', ')}`);
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxSize: MAX_FILE_SIZE
  })

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
    
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 1500) // Longer timeout for smoother experience
  }

  const debouncedSaveDraft = debounce((value: string) => {
    localStorage.setItem(`draft_${activeChannel}`, value)
  }, 500)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image size={24} />;
    if (fileType.startsWith('video/')) return <Film size={24} />;
    if (fileType.startsWith('audio/')) return <Music size={24} />;
    if (fileType === 'application/pdf' || fileType === 'text/plain') return <FileText size={24} />;
    return <Paperclip size={24} />;
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 flex-1">
      <ChatHeader
        channelName={channelName}
        isDM={false}
        onSearchResult={handleSearchResult}
        userWorkspaces={userWorkspaces}
        onToggleExpand={onToggleExpand}
        isExpanded={isExpanded}
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
           <ul className="flex-grow overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
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
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages
          .filter(message => !message.parent_id) // Only show top-level messages
          .map((message) => (
          <Message
            key={message.id}
            message={message}
            currentUser={currentUser}
            onReply={handleReply}
            onReaction={(messageId, emoji) => {
              // Handle reaction here
              console.log('Reaction:', messageId, emoji)
            }}
            isThreadView={false}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="relative">
        <div 
          className={`absolute bottom-full left-0 right-0 flex flex-col transform transition-all duration-500 ease-in-out`}
        >
          <div 
            className={`transform transition-all duration-500 ease-in-out ${
              isTyping 
                ? 'opacity-100 translate-y-0 max-h-[40px]' 
                : 'opacity-0 translate-y-1 max-h-0'
            } overflow-hidden`}
          >
            <div className="text-sm text-gray-500 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              Someone is typing...
            </div>
          </div>
          <div 
            className={`transform transition-all duration-500 ease-in-out ${
              selectedFiles.length > 0
                ? 'opacity-100 translate-y-0 max-h-[100px]' 
                : 'opacity-0 translate-y-1 max-h-0'
            } overflow-hidden`}
          >
            <div className="flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
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
          </div>
        </div>
        <form onSubmit={handleSendMessage} className="p-4 bg-gray-100 dark:bg-gray-800 flex items-start space-x-2">
          <div {...getRootProps()} className={`w-1/10 border-2 border-dashed rounded-lg p-2 ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' : 'border-gray-300 dark:border-gray-600'}`}>
            <input {...getInputProps()} />
            <Paperclip className="mx-auto text-gray-500 dark:text-gray-400" />
          </div>
          <textarea
            value={newMessage}
            onChange={(e) => handleTextAreaChange(e)}
            placeholder="Type your message..."
            className="flex-1 p-2 mx-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            rows={3}
          />
          <div className="flex flex-col space-y-2">
            <button
              type="button"
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile size={24} />
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors duration-200"
            >
              <Send size={24} />
            </button>
          </div>
          <div 
            className={`absolute right-8 transform transition-all duration-300 ease-in-out ${
              showEmojiPicker 
                ? 'opacity-100 translate-y-0 pointer-events-auto bottom-20' 
                : 'opacity-0 translate-y-10 pointer-events-none bottom-0'
            }`}
            style={{ zIndex: 50 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2">
              <EmojiPicker
                onEmojiClick={(emojiObject: EmojiClickData) => {
                  setNewMessage(prev => prev + emojiObject.emoji)
                  setShowEmojiPicker(false)
                }}
              />
            </div>
          </div>
        </form>
      </div>
      <ScrollToTopButton />
    </div>
  )
}

export default ChatArea
