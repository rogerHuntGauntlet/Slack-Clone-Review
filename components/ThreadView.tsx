import React, { useState } from 'react';
import Message from './Message';
import { Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MessageType } from '@/types/database'

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
      onReply(parentMessage.id, replyText.trim());
      setReplyText('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col h-full bg-gray-50 dark:bg-gray-800/50"
    >
      <div className="flex items-center bg-white justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Thread</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
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
              isThreadView={true}
              onReplyClick={() => {}}
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
                isThreadView={true}
                onReplyClick={() => {}}
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
