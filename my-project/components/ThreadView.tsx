import React, { useState } from 'react';
import Message from './Message';
import { Send } from 'lucide-react';

interface ThreadViewProps {
  parentMessage: MessageType;
  replies: MessageType[];
  currentUser: {
    id: string;
    email: string;
  };
  onReply: (messageId: string, replyText: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onClose: () => void;
}

interface MessageType {
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

const ThreadView: React.FC<ThreadViewProps> = ({
  parentMessage,
  replies = [],
  currentUser,
  onReply,
  onReaction,
  onClose,
}) => {
  const [replyText, setReplyText] = useState('');

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyText.trim()) {
      onReply(parentMessage.id, replyText);
      setReplyText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Thread</h2>
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Message
          message={parentMessage}
          currentUser={currentUser}
          onReaction={onReaction}
          onReply={async () => Promise.resolve()}
          isThreadView={true}
        />
        {replies && Array.isArray(replies) && replies.map((reply) => (
          <Message
            key={reply.id}
            message={reply}
            currentUser={currentUser}
            onReaction={onReaction}
            onReply={async () => Promise.resolve()}
            isThreadView={true}
          />
        ))}
      </div>
      <form onSubmit={handleSubmitReply} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply..."
            className="flex-1 p-2 rounded-full border-2 border-gray-300 dark:border-gray-600 focus:border-blue-300 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none"
          />
          <button
            type="submit"
            className="ml-2 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors duration-200"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ThreadView;
