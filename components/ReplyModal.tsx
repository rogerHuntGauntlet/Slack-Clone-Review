import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { MessageType } from '../types/database';
import Image from 'next/image';

interface ReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (parentId: string, content: string) => void;
  parentMessage: MessageType | null;
}

const ReplyModal: React.FC<ReplyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  parentMessage
}) => {
  const [replyContent, setReplyContent] = useState('');

  if (!isOpen || !parentMessage) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyContent.trim()) {
      onSubmit(parentMessage.id, replyContent.trim());
      setReplyContent('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Thread</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Parent Message */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="relative w-10 h-10">
                  <Image
                    src={parentMessage.user?.avatar_url || `https://www.gravatar.com/avatar/${parentMessage.user?.id || '0'}?d=mp&f=y`}
                    alt={parentMessage.user?.username || 'Unknown User'}
                    width={40}
                    height={40}
                    className="rounded-full w-10 h-10 object-cover"
                    unoptimized={parentMessage.user?.avatar_url?.startsWith('https://www.gravatar.com')}
                    priority={true}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold">{parentMessage.user?.username || 'Unknown User'}</span>
                  <span className="text-xs text-gray-500">
                    {parentMessage.created_at && new Date(parentMessage.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-gray-800 dark:text-gray-200">{parentMessage.content}</p>
                {parentMessage.file_attachments && parentMessage.file_attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {parentMessage.file_attachments.map((attachment, index) => (
                      <div 
                        key={`${parentMessage.id}-attachment-${index}`}
                        className="inline-block max-w-xs"
                      >
                        {attachment.file_type?.startsWith('image/') ? (
                          <a 
                            key={`image-${index}`}
                            href={attachment.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={attachment.file_url}
                              alt={attachment.file_name || 'Attachment'}
                              className="max-h-60 rounded-lg object-cover shadow-sm hover:shadow-md transition-shadow duration-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </a>
                        ) : (
                          <a
                            key={`file-${index}`}
                            href={attachment.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                          >
                            <span className="text-sm text-blue-600 dark:text-blue-400 truncate">
                              {attachment.file_name || 'Download attachment'}
                            </span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Replies */}
          <div className="space-y-4 ml-8">
            {parentMessage.replies?.map((reply) => (
              <div key={reply.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="relative w-8 h-8">
                      <Image
                        src={reply.user?.avatar_url || `https://www.gravatar.com/avatar/${reply.user?.id || '0'}?d=mp&f=y`}
                        alt={reply.user?.username || 'Unknown User'}
                        width={32}
                        height={32}
                        className="rounded-full w-8 h-8 object-cover"
                        unoptimized={reply.user?.avatar_url?.startsWith('https://www.gravatar.com')}
                        priority={true}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold">{reply.user?.username || 'Unknown User'}</span>
                      <span className="text-xs text-gray-500">
                        {reply.created_at && new Date(reply.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-800 dark:text-gray-200">{reply.content}</p>
                    {reply.file_attachments && reply.file_attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {reply.file_attachments.map((attachment, index) => (
                          <div 
                            key={`${reply.id}-attachment-${index}`}
                            className="inline-block max-w-xs"
                          >
                            {attachment.file_type?.startsWith('image/') ? (
                              <a 
                                key={`image-${index}`}
                                href={attachment.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={attachment.file_url}
                                  alt={attachment.file_name || 'Attachment'}
                                  className="max-h-60 rounded-lg object-cover shadow-sm hover:shadow-md transition-shadow duration-200"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              </a>
                            ) : (
                              <a
                                key={`file-${index}`}
                                href={attachment.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                              >
                                <span className="text-sm text-blue-600 dark:text-blue-400 truncate">
                                  {attachment.file_name || 'Download attachment'}
                                </span>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your reply..."
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!replyContent.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReplyModal; 