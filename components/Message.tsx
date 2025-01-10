import { FC, useState } from 'react'
import { MessageSquare, Image, FileText, Film, Music, Download } from 'lucide-react'
import EmojiReactions from './EmojiReactions'
import ReplyModal from './ReplyModal'
import DOMPurify from 'isomorphic-dompurify'

export interface MessageType {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  reactions?: { [key: string]: string[] };
  user?: {
    username: string;
    avatar_url: string;
  };
  replies?: MessageType[];
  file_attachments?: {
    id: string;
    file_name: string;
    file_type: string;
    file_url: string;
  }[];
}

interface MessageProps {
  message: MessageType;
  currentUser: {
    id: string;
    email: string;
  }
  onReply: (parentId: string, content: string) => Promise<void>;
  onReaction: (messageId: string, emoji: string) => void;
  isThreadView?: boolean;
}

const Message: FC<MessageProps> = ({ message, currentUser, onReply, onReaction }) => {
  const [showReplyModal, setShowReplyModal] = useState(false)
  const isCurrentUserMessage = message.user_id === currentUser.id

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
    <div id={`message-${message.id}`} className="mb-4">
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
        {message.file_attachments && message.file_attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.file_attachments.map((attachment, index) => (
              <div key={index} className="relative">
                {attachment.file_type.startsWith('image/') ? (
                  <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                    <img 
                      src={attachment.file_url} 
                      alt={attachment.file_name}
                      className="max-w-xs max-h-48 rounded-lg object-cover"
                    />
                  </a>
                ) : (
                  <a 
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"
                  >
                    {getFileIcon(attachment.file_type)}
                    <span className="ml-2 text-sm">{attachment.file_name}</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center space-x-2 mt-2">
          <EmojiReactions
            messageId={message.id}
            currentUserId={currentUser.id}
            initialReactions={message.reactions || {}}
          />
          <button
            className="text-white hover:text-blue-300 transition-colors duration-200 flex items-center"
            onClick={() => setShowReplyModal(true)}
          >
            <MessageSquare size={16} className="mr-1" />
            {message.replies && message.replies.length > 0 && ` (${message.replies.length})`}
          </button>
        </div>
      </div>

      <ReplyModal
        isOpen={showReplyModal}
        onClose={() => setShowReplyModal(false)}
        parentMessage={message}
        onReply={onReply}
        currentUser={currentUser}
      />
    </div>
  )
}

export default Message
