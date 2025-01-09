import { FC, useState } from 'react'
import { Smile, ChevronDown, ChevronUp, MessageSquare, Reply, Download, Image, FileText, Film, Music } from 'lucide-react'
import EmojiReactions from './EmojiReactions'
import ReplyComponent from './Reply'
import DOMPurify from 'isomorphic-dompurify'

interface MessageProps {
  message: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    reactions?: { [key: string]: string[] };
    user?: {
      username: string;
      avatar_url: string;
    };
    replies?: MessageProps['message'][];
    file_attachments?: {
      id: string;
      file_name: string;
      file_type: string;
      file_url: string;
    }[];
  }
  currentUser: {
    id: string;
    email: string;
  }
  onReply: (parentId: string, content: string) => Promise<void>;
  onReaction: (messageId: string, emoji: string) => void;
  isThreadView?: boolean;
}

const Message: FC<MessageProps> = ({ message, currentUser, onReply }) => {
  const [showEmojiSelector, setShowEmojiSelector] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const emojiOptions = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉']

  const isCurrentUserMessage = message.user_id === currentUser.id

  const handleReply = async () => {
    if (replyContent.trim()) {
      await onReply(message.id, replyContent.trim())
      setReplyContent('')
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image size={24} />;
    if (fileType === 'application/pdf' || fileType === 'text/plain') return <FileText size={24} />;
    if (fileType.startsWith('video/')) return <Film size={24} />;
    if (fileType.startsWith('audio/')) return <Music size={24} />;
    return <Download size={24} />;
  }

  const renderAttachment = (attachment: {
    id: string;
    file_name: string;
    file_type: string;
    file_url: string;
  }) => {
    const fileExtension = attachment.file_name.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension || '');

    if (isImage) {
      return (
        <img
          src={attachment.file_url}
          alt={attachment.file_name}
          className="max-w-full h-auto rounded-lg shadow-md mt-2"
        />
      )
    } else {
      return (
        <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mt-2">
          {getFileIcon(attachment.file_type)}
          <a
            href={attachment.file_url}
            download
            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {attachment.file_name}
          </a>
        </div>
      )
    }
  }

  return (
    <div
      id={`message-${message.id}`}
      className="mb-4"
    >
      <div className={`p-3 rounded-lg shadow-md ${
        isCurrentUserMessage ? 'bg-blue-500 bg-opacity-50 ml-auto' : 'bg-pink-500 bg-opacity-50'
      } backdrop-blur-md max-w-3/4 break-words`}>
        <div className="flex items-center mb-2">
          <img
            src={message.user?.avatar_url || '/placeholder.svg?height=40&width=40'}
            alt="User Avatar"
            className="w-10 h-10 rounded-full mr-2 object-cover"
          />
          <div>
            <p className="font-semibold text-white">{message.user?.username || (isCurrentUserMessage ? 'You' : 'User')}</p>
            <p className="text-xs text-gray-200">{new Date(message.created_at).toLocaleString()}</p>
          </div>
        </div>
        <div 
          className="mb-2 text-white" 
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.content) }} 
        />
        {message.file_attachments && message.file_attachments.map((attachment, index) => (
          <div key={index} className="mb-2">
            {renderAttachment(attachment)}
          </div>
        ))}
        <div className="flex items-center space-x-2 mt-2">
          <EmojiReactions
            messageId={message.id}
            currentUserId={currentUser.id}
            initialReactions={message.reactions || {}}
          />
          <button
            className="text-white hover:text-blue-300 transition-colors duration-200 flex items-center"
            onClick={() => setShowReplies(!showReplies)}
          >
            <MessageSquare size={16} className="mr-1" />
            {showReplies ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {message.replies && message.replies.length > 0 && ` (${message.replies.length})`}
          </button>
        </div>
      </div>
      {showReplies && (
        <div className="mt-2 ml-8">
          {message.replies && Array.isArray(message.replies) && message.replies.map((reply) => (
            <ReplyComponent key={reply.id} reply={reply} currentUser={currentUser} />
          ))}
          <div className="mt-2 flex items-center">
            <input
              type="text"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your reply..."
              className="flex-grow p-2 rounded-l-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleReply}
              className="p-2 bg-transparent text-white hover:text-blue-500 disabled:text-gray-400
                         rounded-r-md border border-l-0 border-gray-300
                         transition-all duration-200 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
            >
              <Reply size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Message
