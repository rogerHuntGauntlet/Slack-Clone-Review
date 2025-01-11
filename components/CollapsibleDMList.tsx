'use client'

import { useState, useEffect } from 'react'
import { User, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase, getWorkspaceUsers } from '../lib/supabase'

type DMListProps = {
  workspaceId: string
  onSelectDMAction: (userId: string) => void
  activeUserId: string | null
  currentUserId: string
  isCollapsed?: boolean
  onCollapsedChange?: (isCollapsed: boolean) => void
}

interface DMUser {
  id: string;
  username: string;
  email: string;
  avatar_url: string;
  status: 'online' | 'offline' | 'away';
}

export default function CollapsibleDMList({ 
  workspaceId, 
  onSelectDMAction, 
  activeUserId, 
  currentUserId,
  isCollapsed: controlledIsCollapsed,
  onCollapsedChange 
}: DMListProps) {
  const [users, setUsers] = useState<DMUser[]>([])
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false)
  const isCollapsed = controlledIsCollapsed ?? internalIsCollapsed
  
  const handleCollapse = () => {
    setInternalIsCollapsed(!isCollapsed)
    onCollapsedChange?.(!isCollapsed)
  }

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
    <>
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 200ms ease-in-out forwards;
        }
      `}</style>
      <div className={`bg-gray-800 text-white h-full flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <button
          onClick={handleCollapse}
          className={`flex items-center p-4 hover:bg-gray-700 transition-colors ${isCollapsed ? 'justify-center' : 'justify-between'}`}
        >
          <span 
            className={`text-xl font-bold transition-all duration-300 ease-in-out ${
              isCollapsed 
                ? 'opacity-0 w-0 hidden' 
                : 'opacity-0 delay-200 animate-fadeIn'
            }`}
          >
            Direct Messages
          </span>
          {isCollapsed ? <ChevronRight size={24} /> : <ChevronDown size={24} />}
        </button>
        <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
          <ul className={`space-y-1 ${isCollapsed ? 'px-4' : 'p-2'}`}>
            {sortedUsers.map((user) => (
              <li key={user.id}>
                <button
                  onClick={() => onSelectDMAction(user.id)}
                  className={`flex items-center w-full p-2 rounded-lg transition-all duration-200 ${
                    activeUserId === user.id ? 'bg-gray-700' : 'hover:bg-gray-700'
                  } ${isCollapsed ? 'justify-center' : 'justify-start'}`}
                >
                  <div className="relative flex-shrink-0">
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
    </>
  )
}
