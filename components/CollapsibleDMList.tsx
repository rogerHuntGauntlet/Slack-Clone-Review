'use client'

import { useState, useEffect } from 'react'
import { User, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase, getWorkspaceUsers } from '../lib/supabase'

type DMListProps = {
  workspaceId: string
  onSelectDMAction: (userId: string) => void
  activeUserId: string | null
  currentUserId: string
}

interface DMUser {
  id: string;
  username: string;
  email: string;
  avatar_url: string;
  status: 'online' | 'offline' | 'away';
}

export default function CollapsibleDMList({ workspaceId, onSelectDMAction, activeUserId, currentUserId }: DMListProps) {
  const [users, setUsers] = useState<DMUser[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (workspaceId) {
      fetchUsers()
    }
  }, [workspaceId])

  useEffect(() => {
    const subscription = supabase
      .channel('public:users')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'users' }, 
        (payload: { new: DMUser }) => {
          const updatedUser = payload.new
          setUsers(prevUsers => prevUsers.map(user => 
            user.id === updatedUser.id ? { ...user, status: updatedUser.status } : user
          ))
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchUsers = async () => {
    const workspaceUsers = await getWorkspaceUsers(workspaceId)
    const broUser: DMUser = {
      id: 'bro-user',
      username: 'Bro',
      email: 'bro@example.com',
      avatar_url: 'https://www.feistees.com/images/uploads/2015/05/silicon-valley-bro2bro-app-t-shirt_2.jpg',
      status: 'online'
    }
    setUsers([broUser, ...workspaceUsers])
  }

  // Sort users to put SYSTEM and current user at the top
  const sortedUsers = [...users].sort((a, b) => {
    // Bro user always first
    if (a.id === 'bro-user') return -1;
    if (b.id === 'bro-user') return 1;
    // Current user second
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    // Rest of users sorted alphabetically by username
    return a.username.localeCompare(b.username);
  });

  return (
    <div className={`bg-gray-800 text-white h-full flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`flex items-center p-4 hover:bg-gray-700 transition-colors ${isCollapsed ? 'justify-center' : 'justify-between'}`}
      >
        {!isCollapsed && <span className="text-xl font-bold">Direct Messages</span>}
        {isCollapsed ? <ChevronRight size={30} /> : <ChevronDown size={24} />}
      </button>
      <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
        <ul className="space-y-1 p-2">
          {sortedUsers.map((user) => (
            <li key={user.id}>
              <button
                onClick={() => onSelectDMAction(user.id)}
                className={`flex items-center w-full p-2 rounded-lg transition-all duration-200 ${
                  activeUserId === user.id ? 'bg-gray-700' : 'hover:bg-gray-700'
                }`}
              >
                <div className="relative">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <User size={32} className="text-gray-400" />
                  )}
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${
                      user.status === 'online'
                        ? 'bg-green-500'
                        : user.status === 'away'
                        ? 'bg-yellow-500'
                        : 'bg-gray-500'
                    }`}
                  ></span>
                </div>
                {!isCollapsed && (
                  <span className="ml-3 truncate">{user.username}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
