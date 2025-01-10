import { FC, useState, useRef } from 'react'
import { X, Send } from 'lucide-react'
import type { MessageType } from '../types/database'

interface ReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentMessage: MessageType;
  onReply: (parentId: string, content: string) => Promise<void>;
  currentUser: {
    id: string;
    email: string;
  };
}

const ReplyModal: FC<ReplyModalProps> = ({ isOpen, onClose, parentMessage, onReply, currentUser }) => {
  const [replyContent, setReplyContent] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (replyContent.trim()) {
      await onReply(parentMessage.id, replyContent.trim())
      setReplyContent('')
      // Keep focus on input for multiple replies
      inputRef.current?.focus()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold">Reply to Thread</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X size={24} />
          </button>
        </div>

        {/* Original Message */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center mb-2">
            <img
              src={parentMessage.user?.avatar_url || '/placeholder.svg?height=40&width=40'}
              alt="User Avatar"
              className="w-8 h-8 rounded-full mr-2"
            />
            <div>
              <p className="font-semibold">{parentMessage.user?.username}</p>
              <p className="text-xs text-gray-500">{parentMessage.created_at ? new Date(parentMessage.created_at).toLocaleString() : ''}</p>
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300">{parentMessage.content}</p>
        </div>

        {/* Replies List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {parentMessage.replies?.map((reply: MessageType) => (
            <div key={reply.id} className="flex space-x-2">
              <img
                src={reply.user?.avatar_url || '/placeholder.svg?height=40&width=40'}
                alt="User Avatar"
                className="w-8 h-8 rounded-full"
              />
              <div className="flex-1">
                <div className="flex items-baseline space-x-2">
                  <span className="font-semibold">{reply.user?.username}</span>
                  <span className="text-xs text-gray-500">{reply.created_at ? new Date(reply.created_at).toLocaleString() : ''}</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Reply Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t dark:border-gray-700">
          <div className="flex space-x-2">
            <textarea
              ref={inputRef}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your reply..."
              className="flex-1 p-2 border rounded-lg dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              rows={3}
              autoFocus
            />
            <button
              type="submit"
              disabled={!replyContent.trim()}
              className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={24} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ReplyModal 