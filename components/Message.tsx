import { FC, useState } from 'react'
import { MessageSquare, Image, FileText, Film, Music, Download, Reply } from 'lucide-react'
import EmojiReactions from './EmojiReactions'
import ReplyModal from './ReplyModal'
import DOMPurify from 'isomorphic-dompurify'

export interface MessageType {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id?: string;
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

const Message: FC<MessageProps> = ({ message, currentUser, onReply, onReaction, isThreadView = false }) => {
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const isCurrentUserMessage = message.user_id === currentUser.id

  const getFileType = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return 'image/' + extension;
    if (['mp4', 'webm', 'ogg'].includes(extension)) return 'video/' + extension;
    if (['pdf'].includes(extension)) return 'application/pdf';
    if (['doc', 'docx'].includes(extension)) return 'application/msword';
    if (['xls', 'xlsx'].includes(extension)) return 'application/excel';
    if (['txt'].includes(extension)) return 'text/plain';
    return 'application/octet-stream';
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image size={24} />;
    if (fileType.startsWith('video/')) return <Film size={24} />;
    if (fileType.startsWith('audio/')) return <Music size={24} />;
    if (fileType === 'application/pdf' || fileType === 'text/plain' || 
        fileType === 'application/msword' || fileType === 'application/excel') return <FileText size={24} />;
    return <Download size={24} />;
  }

  const renderAttachment = (attachment: {
    id?: string;
    file_name: string;
    file_type: string;
    file_url: string;
  }) => {
    // Handle images (including GIFs)
    if (attachment.file_type.startsWith('image/')) {
      return (
        <div className="relative group">
          <img
            src={attachment.file_url}
            alt={attachment.file_name}
            className="max-w-full h-auto rounded-lg shadow-md cursor-pointer hover:opacity-95 transition-all"
            onClick={() => window.open(attachment.file_url, '_blank')}
            loading="lazy"
          />
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={attachment.file_url}
              download={attachment.file_name}
              className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
              onClick={e => e.stopPropagation()}
            >
              <Download size={16} />
            </a>
          </div>
        </div>
      )
    } 
    // Handle videos
    else if (attachment.file_type.startsWith('video/')) {
      return (
        <div className="relative group">
          <video
            src={attachment.file_url}
            controls
            className="max-w-full w-full h-auto rounded-lg shadow-md"
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={attachment.file_url}
              download={attachment.file_name}
              className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
            >
              <Download size={16} />
            </a>
          </div>
        </div>
      )
    } 
    // Handle documents and other files
    else {
      return (
        <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors">
          {getFileIcon(attachment.file_type)}
          <a
            href={attachment.file_url}
            download={attachment.file_name}
            className="text-gray-900 hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400 flex-1 truncate"
          >
            {attachment.file_name}
          </a>
          <Download size={16} className="text-gray-500 dark:text-gray-400" />
        </div>
      )
    }
  }

  // Don't render if it's a reply and we're not in a thread view
  if (message.parent_id && !isThreadView) {
    return null;
  }

  // Function to recursively render replies
  const renderReplies = (replies: MessageType[] = []) => {
    return replies.map((reply) => (
      <div key={reply.id} className="space-y-2">
        <Message
          message={reply}
          currentUser={currentUser}
          onReply={onReply}
          onReaction={onReaction}
          isThreadView={true}
        />
      </div>
    ));
  }

  return (
    <div
      id={`message-${message.id}`}
      className={`mb-4 ${
        message.parent_id 
          ? 'ml-6 pl-4 relative before:absolute before:left-0 before:top-[32px] before:bottom-0 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700 after:absolute after:left-0 after:top-[32px] after:w-4 after:h-0.5 after:bg-gray-200 dark:after:bg-gray-700' 
          : ''
      }`}
    >
      <div className={`p-4 rounded-lg shadow-md ${
        isCurrentUserMessage 
          ? 'bg-blue-500 bg-opacity-50 ml-auto backdrop-blur-md' 
          : 'bg-pink-500 bg-opacity-50 backdrop-blur-md'
      } max-w-3/4 break-words relative`}>
        {message.parent_id && (
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-100">
            <button
              onClick={() => {
                const parentElement = document.getElementById(`message-${message.parent_id}`);
                if (parentElement) {
                  parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  parentElement.classList.add('bg-blue-50', 'dark:bg-blue-900/50');
                  setTimeout(() => {
                    parentElement.classList.remove('bg-blue-50', 'dark:bg-blue-900/50');
                  }, 2000);
                }
              }}
              className="text-gray-100 hover:text-white flex items-center gap-1"
            >
              <Reply size={12} className="rotate-180" />
              <span className="hover:underline">View parent message</span>
            </button>
            <span>•</span>
            <span>Thread</span>
          </div>
        )}
        <div className="flex items-center mb-3">
          <img
            src={message.user?.avatar_url || '/placeholder.svg?height=40&width=40'}
            alt="User Avatar"
            className="w-8 h-8 rounded-full mr-2"
          />
          <div>
            <span className="font-semibold text-white">{message.user?.username}</span>
            <span className="text-sm text-gray-200 ml-2">
              {new Date(message.created_at).toLocaleString()}
            </span>
          </div>
        </div>
        <div 
          className="text-white mb-2"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.content) }}
        />
        {message.file_attachments?.map((attachment, index) => (
          <div key={attachment.id || index} className="mt-2">
            {renderAttachment(attachment)}
          </div>
        ))}
        <div className="mt-3 flex items-center justify-between">
          <EmojiReactions
            messageId={message.id}
            currentUserId={currentUser.id}
            initialReactions={message.reactions || {}}
          />
          <button
            onClick={() => setShowReplyModal(true)}
            className="text-gray-100 hover:text-white flex items-center gap-1 text-sm"
          >
            <MessageSquare size={16} />
            <span>Reply</span>
          </button>
        </div>
      </div>

      {showReplyModal && (
        <ReplyModal
          isOpen={showReplyModal}
          onClose={() => setShowReplyModal(false)}
          onReply={onReply}
          parentMessage={message}
          currentUser={currentUser}
        />
      )}

      {message.replies && message.replies.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center gap-1"
          >
            <MessageSquare size={14} />
            <span>{message.replies.length} {message.replies.length === 1 ? 'reply' : 'replies'}</span>
          </button>
          {showReplies && (
            <div className="mt-2 space-y-2">
              {renderReplies(message.replies)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Message;
