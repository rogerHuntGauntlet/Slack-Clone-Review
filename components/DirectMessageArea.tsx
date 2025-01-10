'use client'

import { FC, useState, useEffect, useRef } from 'react'
import { Send, Paperclip, Smile } from 'lucide-react'
import { getDirectMessages, sendDirectMessage, getUserProfile } from '../lib/supabase'
import EmojiPicker from 'emoji-picker-react'
import ChatHeader from './ChatHeader'
import ProfileCard from './ProfileCard'
import type { SearchResult } from './ChatHeader'

interface DirectMessage {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  receiver_id: string;
  is_direct_message: boolean;
  channel: string;
  sender: {
    id: string;
    username: string;
    avatar_url: string;
  };
  receiver: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string;
  email: string;
  phone?: string;
  bio?: string;
  employer?: string;
  status: 'online' | 'offline' | 'away';
}

interface DirectMessageAreaProps {
  currentUser: { id: string; email: string; username?: string };
  otherUserId: string;
}

const DirectMessageArea: FC<DirectMessageAreaProps> = ({ currentUser, otherUserId }) => {
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
    fetchOtherUserProfile()
  }, [currentUser.id, otherUserId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      const fetchedMessages = await getDirectMessages(currentUser.id, otherUserId)
      setMessages(fetchedMessages)
      setError(null)
    } catch (error) {
      console.error('Error fetching messages:', error)
      setError('Failed to load messages. Please try again.')
    }
  }

  const fetchOtherUserProfile = async () => {
    try {
      const profile = await getUserProfile(otherUserId)
      setOtherUser(profile)
      setError(null)
    } catch (error) {
      console.error('Error fetching other user profile:', error)
      setError('Failed to load user profile. Please try again.')
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (newMessage.trim()) {
      try {
        const sentMessage = await sendDirectMessage(currentUser.id, otherUserId, newMessage.trim())
        setMessages([...messages, sentMessage])
        setNewMessage('')
      } catch (error) {
        console.error('Error sending message:', error)
        setError('Failed to send message. Please try again.')
      }
    }
  }

  const handleSearchResult = (result: SearchResult) => {
    const messageElement = document.getElementById(`message-${result.messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('bg-yellow-100', 'dark:bg-yellow-900');
      setTimeout(() => {
        messageElement.classList.remove('bg-yellow-100', 'dark:bg-yellow-900');
      }, 3000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <ChatHeader
        channelName={otherUser?.username || 'Direct Message'}
        isDM={true}
        onSearchResult={handleSearchResult}
        userWorkspaces={[]}
      />
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {otherUser && <ProfileCard user={otherUser} />}
        {messages.map((message) => (
          <div
            key={message.id}
            id={`message-${message.id}`}
            className={`flex ${message.sender.id === currentUser.id ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${
              message.sender.id === currentUser.id ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
            } rounded-lg p-3 text-white`}>
              <p className="text-sm">{message.content}</p>
              <p className="text-xs text-gray-200 mt-1">{new Date(message.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="p-4 bg-gray-100 dark:bg-gray-800 flex items-end">
        <button
          type="button"
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
          onClick={() => alert('File upload not implemented in this demo')}
        >
          <Paperclip size={24} />
        </button>
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 mx-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
          rows={3}
        />
        <div className="flex flex-col justify-end space-y-2">
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
      </form>
      {showEmojiPicker && (
        <div className="absolute bottom-20 right-8 z-10">
          <EmojiPicker
            onEmojiClick={(emojiObject) => {
              setNewMessage(newMessage + emojiObject.emoji)
              setShowEmojiPicker(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

export default DirectMessageArea
