'use client'

import { useState, useEffect } from 'react'
import {
  supabase,
  getWorkspaces,
  createWorkspace,
  joinWorkspace,
  getUserByEmail,
  createUserProfile,
  getChannels,
  getUserCount,
  testSupabaseConnection,
  testDatabaseTables,
  updateUserProfileId
} from '../../lib/supabase'
import Sidebar from '../../components/Sidebar'
import ChatArea from '../../components/ChatArea'
import Header from '../../components/Header'
import WorkspaceList from '../../components/WorkspaceList'
import ProfileModal from '../../components/ProfileModal'
import { useRouter, useSearchParams } from 'next/navigation'
import CollapsibleDMList from '../../components/CollapsibleDMList'
import DirectMessageArea from '../../components/DirectMessageArea'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Suspense } from 'react'
import type { Workspace } from '@/types/supabase'
import ActivityFeed from '../../components/ActivityFeed'

interface WorkspaceListProps {
  workspaces: Workspace[];
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: (e: React.FormEvent) => Promise<void>;
  newWorkspaceName: string;
  setNewWorkspaceName: (name: string) => void;
  onToggleFavorite: (workspaceId: string) => void;
}

export default function Platform() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PlatformContent />
    </Suspense>
  )
}

function PlatformContent() {
  const [user, setUser] = useState<{ id: string; email: string; username?: string } | null>(null)
  const [activeWorkspace, setActiveWorkspace] = useState('')
  const [activeChannel, setActiveChannel] = useState('')
  const [activeDM, setActiveDM] = useState<string | null>(null)
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string; role: string }[]>([])
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [joiningWorkspaceName, setJoiningWorkspaceName] = useState<string | null>(null)
  const [showWorkspaceSelection, setShowWorkspaceSelection] = useState(false)
  const [userWorkspaceIds, setUserWorkspaceIds] = useState<string[]>([])
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const MAX_USERS = 40
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isChatExpanded, setIsChatExpanded] = useState(false)

  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkUser = async () => {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session && session.user) {
          let userData = await getUserByEmail(session.user.email)
          if (!userData || userData.id !== session.user.id) {
            console.log('Updating user profile ID for:', session.user.email)
            userData = await updateUserProfileId(session.user.email, session.user.id)
          }
          if (userData) {
            setUser(userData)
            await fetchUserData()
          } else {
            throw new Error('User data not found')
          }
        } else {
          const storedEmail = sessionStorage.getItem('userEmail')
          if (storedEmail) {
            const userData = await getUserByEmail(storedEmail)
            if (userData) {
              setUser(userData)
              await fetchUserData()
            } else {
              throw new Error('User data not found')
            }
          } else {
            throw new Error('No user session or stored email')
          }
        }
      } catch (error) {
        console.error('Error checking user:', error)
        router.push('/auth')
      } finally {
        setLoading(false)
      }
    }
    checkUser()
  }, [router, supabase.auth])

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }
      
      // Try to get or create user profile
      let userProfile = await getUserByEmail(session.user.email)
      if (!userProfile) {
        console.log('Creating user profile for:', session.user.email)
        userProfile = await createUserProfile(session.user.email)
        if (!userProfile) {
          throw new Error('Failed to create user profile')
        }
      }
      
      console.log('User profile:', userProfile)
      setUser(userProfile)
      
      console.log('Fetching workspaces for user:', session.user.id)
      const userWorkspaces = await getWorkspaces()
      console.log('Fetched workspaces:', userWorkspaces)
      
      setWorkspaces(userWorkspaces)
      setUserWorkspaceIds(userWorkspaces.map((workspace: { id: string }) => workspace.id))
      
      if (userWorkspaces.length > 0) {
        setShowWorkspaceSelection(true)
      } else {
        setShowWorkspaceSelection(true)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      setError('Failed to fetch user data. Please try logging in again.')
    }
  }

  useEffect(() => {
    document.documentElement.classList.add('dark')
    const workspaceId = searchParams.get('workspaceId')
    if (workspaceId) {
      fetchWorkspaceName(workspaceId).then(name => {
        if (name) setJoiningWorkspaceName(name)
      })
    }
    testSupabaseConnection().then(async (isConnected: boolean) => {
      if (isConnected) {
        console.log('Supabase connection successful')
        const tablesExist = await testDatabaseTables()
        if (!tablesExist) {
          setError('Database tables not found or inaccessible. Please check your database setup.')
          return
        }
        fetchUserCount()
      } else {
        setError('Failed to connect to the database. Please try again later.')
      }
    })
  }, [])

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  const fetchWorkspaces = async () => {
    try {
      const userWorkspaces = await getWorkspaces()
      setWorkspaces(userWorkspaces)
      return userWorkspaces
    } catch (error) {
      console.error('Error fetching workspaces:', error)
      return []
    }
  }

  const fetchChannels = async (workspaceId: string) => {
    try {
      const channels = await getChannels(workspaceId)
      if (channels.length > 0) {
        setActiveChannel(channels[0].id)
      }
    } catch (error) {
      console.error('Error fetching channels:', error)
      setError('Failed to fetch channels. Please try again.')
    }
  }

  const fetchUserCount = async () => {
    try {
      const count = await getUserCount()
      setUserCount(count)
    } catch (error) {
      console.error('Error fetching user count:', error)
      setError('Failed to fetch user count. Please try again.')
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      if (userCount >= MAX_USERS) {
        setError("We've reached our user limit. Please check back later.")
        return
      }

      let userData = await getUserByEmail(email)
      if (!userData) {
        if (userCount >= MAX_USERS) {
          setError("We've reached our user limit. Please check back later.")
          return
        }
        userData = await createUserProfile(email)
        if (!userData) {
          throw new Error('Failed to create user profile')
        }
        setUserCount(prevCount => prevCount + 1)
      }
      if (userData) {
        setUser({ id: userData.id, email: userData.email, username: userData.username })
        await fetchUserData()
        const workspaceId = searchParams.get('workspaceId')
        if (workspaceId) {
          await handleJoinWorkspace(workspaceId)
        } else {
          setShowWorkspaceSelection(true)
        }
      } else {
        throw new Error('Failed to get or create user')
      }
    } catch (error: any) {
      console.error('Error during email submission:', error)
      setError(error.message || 'An unexpected error occurred. Please try again.')
    }
  }

  const handleError = (error: any, defaultMessage: string) => {
    console.error(defaultMessage, error)
    setError(error.message || defaultMessage)
  }

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWorkspaceName) return
    
    try {
      const result = await createWorkspace(newWorkspaceName)
      if (!result?.workspace) {
        setError('Failed to create workspace')
        return
      }

      setWorkspaces(prevWorkspaces => [...prevWorkspaces, { 
        id: result.workspace.id,
        name: result.workspace.name,
        role: 'admin'
      }])
      setActiveWorkspace(result.workspace.id)
      if (result.channels && result.channels.length > 0) {
        setActiveChannel(result.channels[0].id)
      }
      setNewWorkspaceName('')
      setShowWorkspaceSelection(false)
    } catch (error) {
      console.error('Error creating workspace:', error)
      setError('Failed to create workspace. Please try again.')
    }
  }

  const handleJoinWorkspace = async (workspaceId: string) => {
    try {
      await joinWorkspace(workspaceId)
      const updatedWorkspaces = await getWorkspaces()
      setWorkspaces(updatedWorkspaces)
      setUserWorkspaceIds(updatedWorkspaces.map((workspace: { id: string }) => workspace.id))
      setActiveWorkspace(workspaceId)
      await fetchChannels(workspaceId)
      setShowWorkspaceSelection(false)
      setJoiningWorkspaceName(null)
    } catch (error) {
      console.error('Error joining workspace:', error)
      setError('Failed to join workspace. Please try again.')
    }
  }

  const handleWorkspaceSelect = (workspaceId: string) => {
    setActiveWorkspace(workspaceId)
    fetchChannels(workspaceId)
    setShowWorkspaceSelection(false)
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleSelectDM = (userId: string) => {
    setActiveDM(userId)
    setActiveChannel('')
  }

  const handleSwitchChannel = (channelId: string) => {
    setActiveChannel(channelId);
    setActiveDM(null);
  };

  const fetchWorkspaceName = async (workspaceId: string) => {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('name')
        .eq('id', workspaceId)
        .single()

      if (error) throw error
      return data.name
    } catch (error) {
      console.error('Error fetching workspace name:', error)
      return null
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      sessionStorage.removeItem('userEmail')
      setUser(null)
      setActiveWorkspace('')
      setActiveChannel('')
      setActiveDM(null)
      setWorkspaces([])
      setNewWorkspaceName('')
      setError(null)
      setShowProfileModal(false)
      setJoiningWorkspaceName(null)
      setShowWorkspaceSelection(false)
      setUserWorkspaceIds([])
      router.push('/auth')
    } catch (error) {
      console.error('Error signing out:', error)
      setError('Failed to sign out. Please try again.')
    }
  }

  const handleReturnToWorkspaceSelection = () => {
    setActiveWorkspace('')
    setActiveChannel('')
    setActiveDM(null)
    setShowWorkspaceSelection(true)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-pink-300 to-blue-300 dark:from-pink-900 dark:to-blue-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-96">
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Welcome to ChatGenius</h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
            Current users: {userCount} / {MAX_USERS}
          </p>
          {joiningWorkspaceName && (
            <div className="mb-4 p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <p className="text-blue-800 dark:text-blue-200">
                You're joining the workspace: <strong>{joiningWorkspaceName}</strong>
              </p>
            </div>
          )}
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900 dark:text-white dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition-colors"
              disabled={userCount >= MAX_USERS}
            >
              {joiningWorkspaceName ? 'Join Workspace' : 'Continue'}
            </button>
          </form>
          {userCount >= MAX_USERS && (
            <p className="mt-4 text-center text-red-500">
              We've reached our user limit. Please check back later.
            </p>
          )}
        </div>
      </div>
    )
  }

  if (showWorkspaceSelection) {
    return (
      <WorkspaceList
        workspaces={workspaces as Workspace[]}
        onSelectWorkspace={handleWorkspaceSelect}
        onCreateWorkspace={handleCreateWorkspace}
        newWorkspaceName={newWorkspaceName}
        setNewWorkspaceName={setNewWorkspaceName}
        onToggleFavorite={(workspaceId) => {
          // Add your favorite toggle logic here
          console.log('Toggle favorite for workspace:', workspaceId)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="flex h-[calc(100vh-2rem)] flex-col overflow-hidden bg-gray-50 dark:bg-gray-800/95 rounded-2xl shadow-2xl">
        <Header
          currentUser={user}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          onCreateWorkspace={() => setActiveWorkspace('')}
          onOpenProfile={() => setShowProfileModal(true)}
          onLogout={handleLogout}
          onReturnToWorkspaceSelection={handleReturnToWorkspaceSelection}
          activeWorkspaceId={activeWorkspace}
        />
        <div className="flex flex-1 overflow-hidden">
          <CollapsibleDMList
            workspaceId={activeWorkspace}
            onSelectDMAction={handleSelectDM}
            activeUserId={activeDM}
            currentUserId={user.id}
          />
          <Sidebar
            activeWorkspace={activeWorkspace}
            setActiveWorkspace={setActiveWorkspace}
            activeChannel={activeChannel}
            setActiveChannel={(channel) => {
              setActiveChannel(channel)
              setActiveDM(null)
            }}
            currentUser={user}
            workspaces={workspaces}
          />
          <div className="flex-1 flex bg-white dark:bg-gray-800/80 rounded-tl-2xl shadow-xl overflow-hidden">
            <div className={`flex-1 flex min-w-0 transition-all duration-300`}>
              <style jsx global>{`
                * {
                  scrollbar-width: thin;
                  scrollbar-color: rgba(156, 163, 175, 0.2) transparent;
                }
                
                *::-webkit-scrollbar {
                  width: 8px;
                  height: 8px;
                }
                
                *::-webkit-scrollbar-track {
                  background: transparent;
                  border-radius: 10px;
                }
                
                *::-webkit-scrollbar-thumb {
                  background-color: rgba(156, 163, 175, 0.2);
                  border-radius: 10px;
                  border: 2px solid transparent;
                  background-clip: padding-box;
                }
                
                *::-webkit-scrollbar-thumb:hover {
                  background-color: rgba(156, 163, 175, 0.4);
                }

                *::-webkit-scrollbar-corner {
                  background: transparent;
                }
                
                .no-scrollbar::-webkit-scrollbar {
                  display: none;
                }
                
                .no-scrollbar {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }

                /* Dark mode adjustments */
                @media (prefers-color-scheme: dark) {
                  *::-webkit-scrollbar-thumb {
                    background-color: rgba(255, 255, 255, 0.1);
                  }
                  
                  *::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(255, 255, 255, 0.2);
                  }
                }
              `}</style>
              {activeDM ? (
                <DirectMessageArea
                  currentUser={user}
                  otherUserId={activeDM}
                />
              ) : (
                <ChatArea
                  activeWorkspace={activeWorkspace}
                  activeChannel={activeChannel}
                  currentUser={user}
                  onSwitchChannel={handleSwitchChannel}
                  userWorkspaces={userWorkspaceIds}
                />
              )}
            </div>

            {/* Activity Feed */}
            {activeWorkspace && !activeDM && !isChatExpanded && (
              <ActivityFeed onCollapse={(isCollapsed) => {
                // This will trigger a re-render of the chat area
                const chatArea = document.querySelector('.chat-area-container');
                if (chatArea) {
                  chatArea.classList.toggle('expanded', isCollapsed);
                }
              }} />
            )}
          </div>
        </div>

        {/* Modals */}
        {showProfileModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
                <ProfileModal
                  currentUser={user}
                  onClose={() => setShowProfileModal(false)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
