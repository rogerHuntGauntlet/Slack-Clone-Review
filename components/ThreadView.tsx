import React, { useState } from 'react';
import Message from './Message';
import { Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  channel: string;
  parent_id?: string;
  reactions?: { [key: string]: string[] };
  user?: {
    id: string;
    username: string;
    avatar_url: string | null;
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full bg-gradient-to-b from-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 relative flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Thread</h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200"
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Message
              message={parentMessage}
              currentUser={currentUser}
              isThread={true}
              onReplyClick={() => {}}
              onReactionSelect={onReaction}
              className="bg-white/5 rounded-xl shadow-lg"
            />
          </motion.div>

          {replies && Array.isArray(replies) && replies.map((reply, index) => (
            <motion.div
              key={reply.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Message
                message={reply}
                currentUser={currentUser}
                isThread={true}
                onReplyClick={() => {}}
                onReactionSelect={onReaction}
                className="bg-white/5 rounded-xl shadow-lg ml-8 relative before:absolute before:left-0 before:top-8 before:w-8 before:h-px before:bg-white/10"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reply Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        onSubmit={handleSubmitReply}
        className="p-4 border-t border-white/10 bg-black/20"
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                transition-all duration-200"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed
                  rounded-lg hover:bg-white/5 transition-all duration-200"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </motion.form>
    </motion.div>
  );
};

export default ThreadView;
