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
  const [error, setError] = useState<string | null>(null)
  const [channelName, setChannelName] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  //const textAreaRef = useRef<HTMLTextAreaElement>(null)

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
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((newMessage.trim() || selectedFiles.length > 0) && currentUser) {
      try {
        const fileUrls = await Promise.all(selectedFiles.map(file => uploadFile(file)))
        const sentMessage = await sendMessage(
          activeChannel, 
          currentUser.id, 
          newMessage.trim(), 
          fileUrls.join(',')  // Join URLs into a single string
        )
        setMessages(prevMessages => [...prevMessages, sentMessage])
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

  const onDrop = (acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => 
      file.size <= MAX_FILE_SIZE && ALLOWED_FILE_TYPES.some(type => file.type.match(type))
    );
    setSelectedFiles(prevFiles => [...prevFiles, ...validFiles]);
    
    const invalidFiles = acceptedFiles.filter(file => 
      file.size > MAX_FILE_SIZE || !ALLOWED_FILE_TYPES.some(type => file.type.match(type))
    );
    if (invalidFiles.length > 0) {
      setError(`Some files were not added due to size or type restrictions: ${invalidFiles.map(f => f.name).join(', ')}`);
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

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
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            currentUser={currentUser}
            onReply={handleReply}
            onReaction={(messageId, emoji) => {
              // Handle reaction here
              console.log('Reaction:', messageId, emoji)
            }}
          />
        ))}
        <div ref={messagesEndRef} />
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
        {showEmojiPicker && (
          <div className="absolute bottom-20 right-8 z-10">
            <EmojiPicker
              onEmojiClick={(emojiObject: EmojiClickData) => {
                setNewMessage(newMessage + emojiObject.emoji)
                setShowEmojiPicker(false)
              }}
            />
          </div>
        )}
      </form>
      {selectedFiles.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
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
      {isTyping && (
        <div className="text-sm text-gray-500 dark:text-gray-400 p-2">
          Someone is typing...
        </div>
      )}
      <ScrollToTopButton />
    </div>
  )
}

export default ChatArea
