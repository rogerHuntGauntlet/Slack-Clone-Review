'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import { getWorkspaceUsers } from '../lib/supabase'

interface DMListProps {
  workspaceId: string;
  onSelectDM: (userId: string) => void;
  activeUserId: string | null;
}

interface DMUser {
  id: string;
  username: string;
  email: string;
  avatar_url: string;
  status: 'online' | 'offline' | 'away';
}

export default function DMList({ workspaceId, onSelectDM, activeUserId }: DMListProps) {
  const [users, setUsers] = useState<DMUser[]>([])

  useEffect(() => {
    if (workspaceId) {
      fetchUsers()
    }
  }, [workspaceId])

  const fetchUsers = async () => {
    const workspaceUsers = await getWorkspaceUsers(workspaceId)
    setUsers(workspaceUsers)
  }

  return (
    <div className="bg-gray-800 text-white p-4 w-64 h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4">Direct Messages</h2>
      <div className="flex-grow pr-2">
        <ul className="flex-grow overflow-y-auto space-y-1 pr-2 custom-scrollbar">
          {users.map((user) => (
            <li key={user.id}>
              <button
                onClick={() => onSelectDM(user.id)}
                className={`flex items-center w-full p-2 rounded-lg transition-all duration-200 ${
                  activeUserId === user.id ? 'bg-gray-700' : 'hover:bg-gray-700'
                }`}
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="w-8 h-8 rounded-full mr-2"
                  />
                ) : (
                  <User size={20} className="mr-2" />
                )}
                <span>{user.username}</span>
                <span
                  className={`ml-auto w-2 h-2 rounded-full ${
                    user.status === 'online'
                      ? 'bg-green-500'
                      : user.status === 'away'
                      ? 'bg-yellow-500'
                      : 'bg-gray-500'
                  }`}
                ></span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
