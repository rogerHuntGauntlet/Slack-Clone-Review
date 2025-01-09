import { FC } from 'react'

interface ReplyProps {
  reply: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    user?: {
      username: string;
      avatar_url: string;
    };
  }
  currentUser: {
    id: string;
    email: string;
  }
}

const ReplyComponent: FC<ReplyProps> = ({ reply, currentUser }) => {
  const isCurrentUserReply = reply.user_id === currentUser.id

  return (
    <div className={`p-2 rounded-lg shadow-sm ${
      isCurrentUserReply ? 'bg-blue-400 bg-opacity-50 ml-auto' : 'bg-pink-400 bg-opacity-50'
    } backdrop-blur-md max-w-3/4 break-words mb-2`}>
      <div className="flex items-center mb-1">
        <img
          src={reply.user?.avatar_url || '/placeholder.svg?height=24&width=24'}
          alt="User Avatar"
          className="w-6 h-6 rounded-full mr-2 object-cover"
        />
        <div>
          <p className="font-semibold text-white text-sm">{reply.user?.username || (isCurrentUserReply ? 'You' : 'User')}</p>
          <p className="text-xs text-gray-200">{new Date(reply.created_at).toLocaleString()}</p>
        </div>
      </div>
      <p className="text-white text-sm">{reply.content}</p>
    </div>
  )
}

export default ReplyComponent
