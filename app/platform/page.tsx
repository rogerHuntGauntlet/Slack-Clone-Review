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
  updateUserProfileId,
  addUserToUniversalWorkspace
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
import logger from '@/lib/logger'
import LogDisplay from '../../components/LogDisplay'

interface WorkspaceListProps {
  workspaces: Workspace[];
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: (e: React.FormEvent) => Promise<void>;
  newWorkspaceName: string;
  setNewWorkspaceName: (name: string) => void;
  onToggleFavorite: (workspaceId: string) => void;
}

export default function Platform() {
  const [logs, setLogs] = useState<string[]>([])
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`])
  }

  useEffect(() => {
    // Set up logger only once when component mounts
    logger.log = addLog
    
    // Initial logs
    addLog('Platform mounting')
    addLog(`Environment: ${process.env.NODE_ENV}`)

    // Cleanup
    return () => {
      logger.log = console.log // Reset logger on unmount
    }
  }, []) // Empty dependency array means this only runs once on mount

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LogDisplay logs={logs} />
      <PlatformContent addLog={addLog} />
    </Suspense>
  )
}

function PlatformContent({ addLog }: { addLog: (message: string) => void }) {
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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)

  const supabase = createClientComponentClient()

  useEffect(() => {
    const initializePlatform = async () => {
      addLog('PlatformContent component initializing...')
      addLog('Testing Supabase connection...')
      
      try {
        // Test Supabase connection
        await testSupabaseConnection()
        addLog('Supabase connection successful')

        // Check user session
        addLog('Checking user session...')
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          addLog('No session found')
          router.push('/auth')
          return
        }
        addLog('Session found')
        addLog(`User found in session: ${session.user.email}`)

        // Test database tables
        await testDatabaseTables()
        addLog('Database tables verified')

        // Get user data
        const userData = await getUserByEmail(session.user.email!)
        if (!userData) {
          addLog('User profile not found, creating...')
          await createUserProfile(session.user)
        }
        addLog(`User data retrieved: ${session.user.email}`)

        setUser({
          id: session.user.id,
          email: session.user.email!,
          username: userData?.username
        })

        // Add user to universal workspace
        addLog('Adding user to universal workspace...')
        await addUserToUniversalWorkspace(session.user.id)

        // Fetch workspaces
        addLog(`Fetching workspaces for user: ${session.user.id}`)
        const fetchedWorkspaces = await getWorkspaces()
        setWorkspaces(fetchedWorkspaces)
        addLog(`Fetched ${fetchedWorkspaces.length} workspaces`)

        // Show workspace selection if no workspaces
        if (fetchedWorkspaces.length === 0) {
          addLog('No workspaces found, showing workspace selection')
          setShowWorkspaceSelection(true)
        }

        // Get user count
        const count = await getUserCount()
        setUserCount(count)

        setLoading(false)
      } catch (error) {
        logger.error('Error initializing platform:', error)
        setError('Failed to initialize platform')
        setLoading(false)
      }
    }

    initializePlatform()
  }, [router, supabase.auth])

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
      logger.error('Error fetching workspaces:', error)
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
      logger.error('Error fetching channels:', error)
      setError('Failed to fetch channels. Please try again.')
    }
  }

  const fetchUserCount = async () => {
    try {
      const count = await getUserCount()
      setUserCount(count)
    } catch (error) {
      logger.error('Error fetching user count:', error)
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
      logger.error('Error during email submission:', error)
      setError(error.message || 'An unexpected error occurred. Please try again.')
    }
  }

  const handleError = (error: any, defaultMessage: string) => {
    logger.error(defaultMessage, error)
    setError(error.message || defaultMessage)
  }

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWorkspaceName) {
      setError('Please enter a workspace name')
      return
    }
    
    try {
      logger.log('Creating workspace...')
      const result = await createWorkspace(newWorkspaceName)
      if (!result?.workspace) {
        logger.error('Failed to create workspace: No workspace data returned')
        setError('Failed to create workspace')
        return
      }

      logger.log('Workspace created successfully')
      setWorkspaces(prevWorkspaces => [...prevWorkspaces, { 
        id: result.workspace.id,
        name: result.workspace.name,
        role: 'admin'
      }])
      setActiveWorkspace(result.workspace.id)
      if (result.channels && result.channels.length > 0) {
        logger.log('Setting active channel...')
        setActiveChannel(result.channels[0].id)
      }
      setNewWorkspaceName('')
      setShowWorkspaceSelection(false)
    } catch (error: any) {
      logger.error('Error creating workspace:', error)
      setError(error.message || 'Failed to create workspace. Please try again.')
      // Keep the workspace selection UI open if there was an error
      setShowWorkspaceSelection(true)
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
      logger.error('Error joining workspace:', error)
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
      logger.error('Error fetching workspace name:', error)
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
      logger.error('Error signing out:', error)
      setError('Failed to sign out. Please try again.')
    }
  }

  const handleReturnToWorkspaceSelection = () => {
    setActiveWorkspace('')
    setActiveChannel('')
    setActiveDM(null)
    setShowWorkspaceSelection(true)
  }

  const handleSearch = async (query: string) => {
    if (!query.trim() || !activeWorkspace) return;
    
    try {
      logger.log(`Searching for: "${query}" in workspace ${activeWorkspace}`)
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          channel_id,
          user_id,
          channels!inner (
            id,
            name,
            workspace_id
          ),
          user_profiles!messages_user_id_fkey (
            username,
            email
          )
        `)
        .eq('channels.workspace_id', activeWorkspace)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        logger.error('Search error:', error)
        throw error;
      }

      logger.log(`Found ${data?.length || 0} results`)
      setSearchResults(data || []);
      setShowSearchResults(true);
    } catch (error) {
      logger.error('Error searching messages:', error);
      setError('Failed to search messages');
    }
  };

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
          logger.log('Toggle favorite for workspace:', workspaceId)
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
          onSearch={handleSearch}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-16 right-4 w-96 max-h-[70vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Search Results ({searchResults.length})
                </h3>
                <button
                  onClick={() => {
                    setShowSearchResults(false)
                    setSearchQuery('')
                    setSearchResults([])
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  onClick={() => {
                    setActiveChannel(result.channel_id);
                    setShowSearchResults(false);
                    setSearchQuery('');
                  }}
                  className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded-lg mb-2 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
                    <span className="flex items-center gap-2">
                      <span className="font-medium">
                        {result.user_profiles?.username || result.user_profiles?.email}
                      </span>
                      <span className="text-gray-400">in</span>
                      <span className="font-medium text-indigo-500">
                        #{result.channels?.name}
                      </span>
                    </span>
                    <span>{new Date(result.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 line-clamp-2">{result.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
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
            <div className={`flex-1 flex min-w-0 max-w-full transition-all duration-300`}>
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
            {activeWorkspace && !activeDM && (
              <ActivityFeed onCollapse={(isCollapsed) => {
                setIsChatExpanded(isCollapsed);
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
