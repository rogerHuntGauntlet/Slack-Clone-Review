'use client'

import { useState, useEffect } from 'react'
import { User, ChevronRight, ChevronDown } from 'lucide-react'
import { getWorkspaceUsers } from '../lib/supabase'
import { DMListProps } from '@/types/components'

interface DMUser {
  id: string;
  username: string;
  email: string;
  avatar_url: string;
  status: 'online' | 'offline' | 'away';
}

export default function DMList({ 
  workspaceId, 
  onSelectDMAction, 
  activeUserId, 
  currentUserId,
  isCollapsed,
  onCollapsedChange,
  isMobile 
}: DMListProps) {
  const [users, setUsers] = useState<DMUser[]>([])

  useEffect(() => {
    if (workspaceId) {
      fetchUsers()
    }
  }, [workspaceId])

  const fetchUsers = async () => {
    const workspaceUsers = await getWorkspaceUsers(workspaceId)
    // Filter out current user and sort by username
    const filteredUsers = workspaceUsers
      .filter((user: DMUser) => user.id !== currentUserId)
      .sort((a: DMUser, b: DMUser) => a.username.localeCompare(b.username))
    setUsers([
      // Add Bro user at the top
      {
        id: 'bro-user',
        username: 'Bro',
        email: 'bro@example.com',
        avatar_url: 'https://www.feistees.com/images/uploads/2015/05/silicon-valley-bro2bro-app-t-shirt_2.jpg',
        status: 'online'
      },
      ...filteredUsers
    ])
  }

  const toggleCollapse = () => {
    if (onCollapsedChange) {
      onCollapsedChange(!isCollapsed)
    }
  }

  return (
    <div className={`bg-gray-800 text-white p-4 ${isMobile ? 'w-full' : 'w-64'} h-full flex flex-col`}>
      <button 
        onClick={toggleCollapse}
        className="flex items-center text-xl font-bold mb-4 hover:text-gray-300"
      >
        {isCollapsed ? <ChevronRight className="mr-2" /> : <ChevronDown className="mr-2" />}
        Direct Messages
      </button>
      {!isCollapsed && (
        <div className="flex-grow pr-2">
          <ul className="flex-grow overflow-y-auto space-y-1 pr-2 custom-scrollbar">
            {users.map((user) => (
              <li key={user.id}>
                <button
                  onClick={() => onSelectDMAction(user.id)}
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
      )}
    </div>
  )
}
