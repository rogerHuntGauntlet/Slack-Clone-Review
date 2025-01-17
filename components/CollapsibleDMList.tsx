'use client'

import { useState, useEffect } from 'react'
import { User, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase, getWorkspaceUsers, createUserProfile } from '../lib/supabase'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import dynamic from 'next/dynamic'

const AgentChatModal = dynamic(() => import('@/app/agents/components/AgentChatModal'), {
  loading: () => <div>Loading...</div>
})

interface DMUser {
  id: string;
  username: string;
  email: string;
  avatar_url: string;
  status: 'online' | 'offline' | 'away';
  pinecone_namespace?: string; // Added for agent-specific RAG
  is_agent?: boolean; // Flag to identify agents
  is_incomplete?: boolean; // Flag to identify incomplete agents
}

interface Section {
  title: string;
  users: DMUser[];
  isCollapsed: boolean;
}

interface DMListProps {
  workspaceId: string;
  onSelectDMAction: (userId: string, options?: { isBro?: boolean; startTyping?: boolean; isAgent?: boolean; agentNamespace?: string }) => void;
  activeUserId: string | null;
  currentUserId: string;
  isCollapsed?: boolean;
  onCollapsedChange?: (isCollapsed: boolean) => void;
  isMobile?: boolean;
}

interface AgentRecord {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  pinecone_namespace: string;
  created_at: string;
  updated_at: string;
  training_files?: { type: string; url: string; name: string; size: number; }[];
  agent_files?: { id: string; type: string; url: string; name: string; size: number; }[];
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
  const [selectedAgent, setSelectedAgent] = useState<{
    id: string;
    name: string;
    pineconeNamespace?: string;
  } | null>(null)
  const isCollapsed = controlledIsCollapsed ?? internalIsCollapsed
  const supabase = createClientComponentClient()
  
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
    try {
      // Get workspace users (these should only be real users, not system users)
      const workspaceUsers = await getWorkspaceUsers(workspaceId)
      
      // Create special Bro user with custom functionality
      const broUser: DMUser = {
        id: 'bro-user',
        username: 'Bro',
        email: 'bro@example.com',
        avatar_url: 'https://www.feistees.com/images/uploads/2015/05/silicon-valley-bro2bro-app-t-shirt_2.jpg',
        status: 'online'
      }

      // Get AI Assistant
      const aiAssistant = workspaceUsers.find((u: DMUser) => 
        u.id === '00000000-0000-0000-0000-000000000001'
      )

      // Filter out system users, Bro, and current user from contacts
      const contacts = workspaceUsers.filter((u: DMUser) => 
        u.id !== currentUserId && 
        u.id !== '00000000-0000-0000-0000-000000000001'
      )

      // Fetch user's agents with their training files
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select(`
          id,
          name,
          description,
          is_active,
          pinecone_namespace,
          created_at,
          updated_at,
          agent_files (
            id,
            type,
            url,
            name,
            size
          )
        `)
        .eq('user_id', currentUserId)
        .eq('is_active', true)
        .neq('name', 'PhD Knowledge Agent')
        .order('created_at', { ascending: false })

      if (agentsError) {
        console.error('Error fetching agents:', agentsError)
        throw agentsError
      }

      // Transform agents into DMUser format
      const userAgents: DMUser[] = (agents as AgentRecord[]).map(agent => ({
        id: agent.id,
        username: agent.name,
        email: `agent-${agent.id}@gauntlet.ai`,
        avatar_url: 'https://www.gravatar.com/avatar/' + agent.id + '?d=identicon',
        status: 'online',
        pinecone_namespace: agent.pinecone_namespace,
        is_agent: true,
        is_incomplete: !agent.agent_files || agent.agent_files.length === 0
      }))

      // Set current user from real workspace users
      const current = workspaceUsers.find((u: DMUser) => u.id === currentUserId)
      if (current) {
        setCurrentUser(current)
      }

      // Set sections with completely separate user lists
      setSections([
        { 
          title: 'System Users', 
          users: aiAssistant ? [aiAssistant, broUser] : [broUser],
          isCollapsed: false 
        },
        { 
          title: 'My Agents',
          users: userAgents,
          isCollapsed: false
        },
        {
          title: 'Contacts',
          users: contacts,
          isCollapsed: false
        }
      ])
    } catch (error) {
      console.error('Error in fetchUsers:', error)
    }
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

    // Special handling for agent avatars
    if (user.is_agent) {
      return (
        <div className="relative flex-shrink-0">
          <div className={`w-8 h-8 rounded-full ${user.is_incomplete ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'} flex items-center justify-center`}>
            <span className="text-white text-sm font-bold">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
          {user.is_incomplete && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 border-2 border-gray-800 flex items-center justify-center">
              <span className="text-gray-800 text-xs font-bold">!</span>
            </span>
          )}
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

  const handleUserClick = (userId: string, user: DMUser) => {
    // Special handling for Bro
    if (userId === 'bro-user') {
      onSelectDMAction(userId, { isBro: true, startTyping: true })
      return
    }

    // Special handling for agents
    if (user.is_agent) {
      setSelectedAgent({
        id: userId,
        name: user.username,
        pineconeNamespace: user.pinecone_namespace
      })
      return
    }

    // Regular handling for other users
    onSelectDMAction(userId)
  }

  const UserListItem = ({ user }: { user: DMUser }) => {
    return (
      <li key={user.id}>
        <button
          onClick={() => handleUserClick(user.id, user)}
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

      {/* Agent Chat Modal */}
      {selectedAgent && (
        <AgentChatModal
          agentId={selectedAgent.id}
          agentName={selectedAgent.name}
          pineconeNamespace={selectedAgent.pineconeNamespace}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </>
  )
}
