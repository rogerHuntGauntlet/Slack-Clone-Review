'use client'

import { useState, useEffect } from 'react'
import { User, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase, getWorkspaceUsers } from '../lib/supabase'
import Link from 'next/link'

interface DMUser {
  id: string;
  username: string;
  email: string;
  avatar_url: string;
  status: 'online' | 'offline' | 'away';
}

interface Section {
  title: string;
  users: DMUser[];
  isCollapsed: boolean;
}

interface DMListProps {
  workspaceId: string;
  onSelectDMAction: (userId: string, options?: { isBro?: boolean; startTyping?: boolean }) => void;
  activeUserId: string | null;
  currentUserId: string;
  isCollapsed?: boolean;
  onCollapsedChange?: (isCollapsed: boolean) => void;
  isMobile?: boolean;
}

export default function CollapsibleDMList({ 
  workspaceId, 
  onSelectDMAction, 
  activeUserId, 
  currentUserId,
  isCollapsed: controlledIsCollapsed,
  onCollapsedChange 
}: DMListProps) {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false)
  const [sections, setSections] = useState<Section[]>([
    { title: 'System Users', users: [], isCollapsed: false },
    { title: 'My Agents', users: [], isCollapsed: false },
    { title: 'Contacts', users: [], isCollapsed: false }
  ])
  const [currentUser, setCurrentUser] = useState<DMUser | null>(null)
  const isCollapsed = controlledIsCollapsed ?? internalIsCollapsed
  
  const handleCollapse = () => {
    setInternalIsCollapsed(!isCollapsed)
    onCollapsedChange?.(!isCollapsed)
  }

  const toggleSection = (index: number) => {
    setSections(prev => prev.map((section, i) => 
      i === index ? { ...section, isCollapsed: !section.isCollapsed } : section
    ))
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
          setSections(prevSections => 
            prevSections.map(section => ({
              ...section,
              users: section.users.map(user => 
                user.id === updatedUser.id ? { ...user, status: updatedUser.status } : user
              )
            }))
          )
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchUsers = async () => {
    // Get workspace users (these should only be real users, not system users)
    const workspaceUsers = await getWorkspaceUsers(workspaceId)
    
    // Create special Bro user with custom functionality
    const broUser: DMUser = {
      id: 'bro-user',  // Special ID for Bro
      username: 'Bro',
      email: 'bro@example.com',
      avatar_url: 'https://www.feistees.com/images/uploads/2015/05/silicon-valley-bro2bro-app-t-shirt_2.jpg',
      status: 'online'
    }

    // Filter out Bro from workspace users before setting current user
    const realWorkspaceUsers = workspaceUsers.filter((u: DMUser) => u.id !== 'bro-user')
    
    // Set current user (only from real workspace users)
    const current = realWorkspaceUsers.find((u: DMUser) => u.id === currentUserId)
    if (current) {
      setCurrentUser(current)
    }

    // Get AI Assistant from workspace users
    const aiAssistant = workspaceUsers.find((u: DMUser) => 
      u.id === '00000000-0000-0000-0000-000000000001'
    )

    // Filter out system users, Bro, and current user from contacts
    const contacts = realWorkspaceUsers.filter((u: DMUser) => 
      u.id !== currentUserId && 
      u.id !== '00000000-0000-0000-0000-000000000001'
    )

    // Set sections with completely separate user lists
    setSections([
      { 
        title: 'System Users', 
        users: aiAssistant ? [aiAssistant, broUser] : [broUser],
        isCollapsed: false 
      },
      { 
        title: 'My Agents',
        users: [],
        isCollapsed: false
      },
      {
        title: 'Contacts',
        users: contacts,
        isCollapsed: false
      }
    ])
  }

  const UserAvatar = ({ user }: { user: DMUser }) => {
    // Special handling for Bro avatar
    if (user.id === 'bro-user') {
      return (
        <div className="relative flex-shrink-0">
          <img
            src={user.avatar_url}
            alt="Bro"
            className="w-8 h-8 rounded-full border-2 border-blue-500"
          />
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 bg-green-500"></span>
        </div>
      )
    }

    // Regular avatar handling for other users
    return (
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
    )
  }

  const handleUserClick = (userId: string) => {
    // Special handling for Bro
    if (userId === 'bro-user') {
      // Call the action with special Bro handling flag and start typing
      onSelectDMAction(userId, { isBro: true, startTyping: true })
      return
    }

    // Regular handling for other users
    onSelectDMAction(userId)
  }

  const UserListItem = ({ user }: { user: DMUser }) => {
    return (
      <li key={user.id}>
        <button
          onClick={() => handleUserClick(user.id)}
          className={`flex items-center w-full p-2 rounded-lg transition-all duration-200 ${
            activeUserId === user.id ? 'bg-gray-700' : 'hover:bg-gray-700'
          } ${isCollapsed ? 'justify-center' : 'justify-start'}`}
        >
          <UserAvatar user={user} />
          {!isCollapsed && (
            <span className="ml-3 truncate">{user.username}</span>
          )}
        </button>
      </li>
    )
  }

  return (
    <>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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
          <span className={`text-xl font-bold transition-all duration-300 ease-in-out ${
            isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-0 delay-200 animate-fadeIn'
          }`}>
            Direct Messages
          </span>
          {isCollapsed ? <ChevronRight size={24} /> : <ChevronDown size={24} />}
        </button>
        <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
          {/* Current User */}
          {currentUser && (
            <div className={`px-4 py-2 ${isCollapsed ? 'text-center' : ''}`}>
              <ul className="list-none">
                <UserListItem user={currentUser} />
              </ul>
            </div>
          )}

          {/* Sections */}
          {sections.map((section, index) => (
            <div key={section.title} className="mt-4">
              <button
                onClick={() => toggleSection(index)}
                className={`w-full px-4 py-2 flex items-center justify-between hover:bg-gray-700 ${
                  isCollapsed ? 'justify-center' : ''
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`font-semibold ${isCollapsed ? 'hidden' : ''}`}>
                    {section.title}
                    {section.title === 'My Agents' && (
                      <Link
                        href="/agents"
                        className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                      >
                        +
                      </Link>
                    )}
                  </span>
                  {!isCollapsed && (section.isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />)}
                </div>
              </button>
              
              {!section.isCollapsed && (
                <ul className={`space-y-1 ${isCollapsed ? 'px-4' : 'px-2'}`}>
                  {section.users.map((user) => (
                    <UserListItem key={user.id} user={user} />
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
