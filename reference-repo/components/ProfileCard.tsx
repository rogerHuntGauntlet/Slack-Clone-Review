import React from 'react'
import { User } from 'lucide-react'

interface ProfileCardProps {
  user: {
    id: string;
    username: string;
    avatar_url: string;
    email: string;
    phone?: string;
    bio?: string;
    employer?: string;
    status: 'online' | 'offline' | 'away';
  };
}

const ProfileCard: React.FC<ProfileCardProps> = ({ user }) => {
  return (
    <div className="w-full mb-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-4 flex items-center gap-4">
        <div className="relative h-16 w-16">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.username} className="rounded-full" />
          ) : (
            <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <User size={32} />
            </div>
          )}
        </div>
        <div className="flex-grow">
          <h2 className="text-lg font-bold">{user.username}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${
          user.status === 'online' ? 'bg-green-500' :
          user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
        }`} />
      </div>
      <div className="px-4 pb-4">
        {user.phone && (
          <p className="text-sm mb-2"><strong>Phone:</strong> {user.phone}</p>
        )}
        {user.employer && (
          <p className="text-sm mb-2"><strong>Employer:</strong> {user.employer}</p>
        )}
        {user.bio && (
          <p className="text-sm"><strong>Bio:</strong> {user.bio}</p>
        )}
      </div>
    </div>
  )
}

export default ProfileCard
