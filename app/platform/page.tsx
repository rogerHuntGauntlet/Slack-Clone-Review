'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
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
  addUserToUniversalWorkspace,
  sendMessage
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
import type { Workspace } from '@/types/supabase'
import ActivityFeed from '../../components/ActivityFeed'
import { logInfo, logError, logDebug, type LogContext } from '@/lib/logger'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type {
  WorkspaceListProps,
  HeaderProps,
  DMListProps,
  SidebarProps,
  ChatAreaProps,
  DirectMessageAreaProps,
  ProfileModalProps
} from '@/types/components'
import Cookies from 'js-cookie';
import { useSession } from 'next-auth/react'

// Constants
const MAX_USERS = 40

export default function Platform() {
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`])
  }

  useEffect(() => {
    // Set up logger only once when component mounts
    const originalLog = addLog;

    // Initial logs
    logInfo('Platform mounting')

    // Cleanup
    return () => {
      // No need to reset since we're using the exported functions
    }
  }, [])

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>}>
      <PlatformWithParams addLog={addLog} />
    </Suspense>
  )
}

function PlatformWithParams({ addLog }: { addLog: (message: string) => void }) {
  const searchParams = useSearchParams()
  const workspaceId = searchParams.get('workspaceId')
  console.log('Platform: PlatformWithParams mounting');
  console.log('Platform: Search params:', Object.fromEntries(searchParams.entries()));
  console.log('Platform: Extracted workspaceId:', workspaceId);
  return <PlatformContent addLog={addLog} initialWorkspaceId={workspaceId} />
}

function PlatformContent({ addLog, initialWorkspaceId }: { addLog: (message: string) => void, initialWorkspaceId: string | null }) {
  console.log('Platform: PlatformContent mounting with initialWorkspaceId:', initialWorkspaceId);

  const router = useRouter()
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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isDMListCollapsed, setIsDMListCollapsed] = useState(false)

  // Add mobile-specific states
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [showMobileChat, setShowMobileChat] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const supabase = createClientComponentClient()
  const { data: session } = useSession()
  const [messages, setMessages] = useState<any[]>([])
  const [currentDirectMessage, setCurrentDirectMessage] = useState<any>(null)

  const fetchChannels = useCallback(async (workspaceId: string) => {
    if (!workspaceId) {
      logDebug('No workspace ID provided to fetchChannels')
      return
    }

    if (!user?.id) {
      logDebug('No user ID available, deferring channel fetch')
      return
    }

    try {
      logInfo(`Fetching channels for workspace ${workspaceId} and user ${user.id}`)
      const channels = await getChannels(workspaceId, user.id)

      if (channels.length > 0) {
        logInfo(`Setting active channel to ${channels[0].id}`)
        setActiveChannel(channels[0].id)
      } else {
        logInfo('No channels found for workspace')
        setActiveChannel('')
      }
    } catch (error) {
      logError('Error fetching channels:', { error })
      setError('Failed to fetch channels. Please try again.')
    }
  }, [user?.id, setActiveChannel, setError]);

  const handleWorkspaceSelect = useCallback(async (workspaceId: string) => {
    console.log('Platform: handleWorkspaceSelect called with:', workspaceId);

    if (!workspaceId) {
      logError('No workspace ID provided', { action: 'handleWorkspaceSelect' });
      return;
    }

    // Set cookie when workspace is selected
    Cookies.set('lastWorkspaceId', workspaceId, { expires: 7 }); // Expires in 7 days

    setActiveWorkspace(workspaceId);
    console.log('Platform: Setting active workspace to:', workspaceId);

    if (!user?.id) {
      console.log('Platform: No user ID available');
      logError('No user ID available', { action: 'handleWorkspaceSelect' })
      return
    }

    try {
      console.log('Platform: Setting active workspace to:', workspaceId);
      logInfo('Selecting workspace', { workspaceId })
      setActiveWorkspace(workspaceId)

      // Clear current channel
      setActiveChannel('')

      // Fetch channels
      await fetchChannels(workspaceId)

      // Hide workspace selection
      setShowWorkspaceSelection(false)

      console.log('Platform: Workspace selection complete. Active workspace is now:', workspaceId);
      logInfo('Workspace selection complete')
    } catch (error) {
      console.error('Platform: Error in handleWorkspaceSelect:', error);
      logError('Error selecting workspace', { error: error instanceof Error ? error.message : String(error) })
      setError('Failed to select workspace. Please try again.')
    }
  }, [user?.id, fetchChannels, setActiveWorkspace, setActiveChannel, setShowWorkspaceSelection, setError]);

  // Handle initial workspace selection
  useEffect(() => {
    console.log('Platform: Initial workspace selection effect running');
    console.log('Platform: Current state:', { loading, initialWorkspaceId, user });

    if (!loading && initialWorkspaceId && user) {
      console.log('Platform: Calling handleWorkspaceSelect with initialWorkspaceId:', initialWorkspaceId);
      handleWorkspaceSelect(initialWorkspaceId);
    } else {
      console.log('Platform: Skipping initial workspace selection. Conditions not met:', {
        loading,
        hasInitialWorkspaceId: !!initialWorkspaceId,
        hasUser: !!user
      });
    }
  }, [loading, initialWorkspaceId, user, handleWorkspaceSelect]);

  useEffect(() => {
    const checkUser = async () => {
      setLoading(true)
      try {
        let session;
        const { data: { session: supabaseSession }, error: supabaseError } = await supabase.auth.getSession();
        session = supabaseSession;

        if (!session) {
          console.log("no session found, checking for cookie: ", supabaseError)
          try {
            session = JSON.parse(sessionStorage.getItem('cookie') || '{}');
            console.log("session from cookie: ", session)
          } catch (err) {
            throw new Error('No session latofrm 122 catch error: ' + err);
          }
        }

        if (session && session.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.user_metadata.username
          })
          logInfo('Session found', { userId: session.user.id })
          const userData = await getUserByEmail(session.user.email)
          if (userData) {
            setUser(userData)
            await fetchUserData(userData.id, userData.email)
          } else {
            throw new Error('User data not found')
          }
        } else {
          const storedEmail = sessionStorage.getItem('userEmail')
          if (storedEmail) {
            const userData = await getUserByEmail(storedEmail)
            if (userData) {
              setUser(userData)
              await fetchUserData(userData.id, userData.email)
            } else {
              throw new Error('User data not found')
            }
          } else {
            throw new Error('No user session or stored email')
          }
        }
      } catch (error) {
        logError('Error checking user', { error: error instanceof Error ? error.message : String(error) })
        router.push('/auth')
      } finally {
        setLoading(false)
      }
    }
    checkUser()
  }, [router, supabase.auth])

  const fetchUserData = async (userId: string, email: string) => {
    try {
      const [userWorkspaces, userProfile] = await Promise.all([
        getWorkspaces(userId),
        getUserByEmail(email)
      ])
      logInfo('User data fetched', { userId, workspaceCount: userWorkspaces.length })

      if (userProfile) {
        setUser(prevUser => ({
          ...prevUser,
          ...userProfile,
        }))
      }

      setWorkspaces(userWorkspaces)
      setUserWorkspaceIds(userWorkspaces.map((workspace: { id: string }) => workspace.id))

      if (userWorkspaces.length > 0) {
        setShowWorkspaceSelection(true)
      } else {
        setShowWorkspaceSelection(true)
      }
    } catch (error) {
      logError('Error fetching user data', { error: error instanceof Error ? error.message : String(error) })
      setError('Failed to fetch user data. Please try logging in again.')
    }
  }

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
      logError('Error fetching workspaces', { error: error instanceof Error ? error.message : String(error) })
      return []
    }
  }

  const fetchUserCount = async () => {
    try {
      const count = await getUserCount()
      setUserCount(count)
    } catch (error) {
      logError('Error fetching user count', { error: error instanceof Error ? error.message : String(error) })
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

      // Get session first
      let session;
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      session = supabaseSession;

      if (!session) {
        console.log("no session found, checking for cookie: ")
        try {
          session = JSON.parse(sessionStorage.getItem('cookie') || '{}');
          console.log("session from cookie: ", session)

        } catch (err) {
          throw new Error('No session latofrm 122 catch error: ' + err);
        }

      }


      let userData = await getUserByEmail(email)
      const isNewUser = !userData

      if (isNewUser) {
        if (userCount >= MAX_USERS) {
          setError("We've reached our user limit. Please check back later.")
          return
        }
        userData = await createUserProfile({
          id: session.user.id,
          email: session.user.email
        })
        if (!userData) {
          throw new Error('Failed to create user profile')
        }
        setUserCount(prevCount => prevCount + 1)
      }

      if (userData) {
        // Set user data
        setUser({ id: userData.id, email: userData.email, username: userData.username })

        // Clear workspace state and show selection
        setActiveWorkspace('')
        setActiveChannel('')
        setShowWorkspaceSelection(true)

        // Fetch workspaces
        const workspaces = await getWorkspaces(userData.id)
        setWorkspaces(workspaces)
      } else {
        throw new Error('Failed to get or create user')
      }
    } catch (error: any) {
      logError('Error during email submission:', error)
      setError(error.message || 'An unexpected error occurred. Please try again.')
    }
  }

  const handleError = (error: Error | string | unknown, defaultMessage: string) => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logError('Error occurred', { message: defaultMessage, details: errorMessage })
    setError(error instanceof Error ? error.message : defaultMessage)
  }

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWorkspaceName || !user) {
      setError('Please enter a workspace name')
      return
    }

    try {
      addLog('Creating workspace...')

      // Get session
      let session;
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      session = supabaseSession;

      if (!session) {
        try {
          session = JSON.parse(sessionStorage.getItem('cookie') || '{}');
        } catch (err) {
          throw new Error('No valid session found');
        }
      }

      // Check user profile
      let userData = await getUserByEmail(session.user.email!)
      if (!userData) {
        addLog('User profile not found, creating...')
        userData = await createUserProfile({
          id: session.user.id,
          email: session.user.email
        })
        if (!userData) {
          throw new Error('Failed to create user profile')
        }
      }

      // Create workspace with error handling
      const result = await createWorkspace(newWorkspaceName, userData.id)
        .catch(error => {
          // Check if this is a duplicate workspace member error
          if (error.code === '23505' && error.message.includes('workspace_members_pkey')) {
            // Log the specific error but continue with the workspace creation
            addLog('Note: User already a member of this workspace')
            return { workspace: null }
          }
          throw error // Re-throw other errors
        })

      if (!result?.workspace) {
        throw new Error('Failed to create workspace')
      }

      addLog('Workspace created successfully')
      setWorkspaces(prevWorkspaces => [...prevWorkspaces, {
        id: result.workspace.id,
        name: result.workspace.name,
        role: 'admin'
      }])
      setNewWorkspaceName('')
      addLog('Workspace created, staying on selection screen')

    } catch (error) {
      logError('Error creating workspace', { error: error instanceof Error ? error.message : String(error) })
      setError(typeof error === 'string' ? error : 'Failed to create workspace. Please try again.')
    }
  }

  const handleJoinWorkspace = async (workspaceId: string) => {
    if (!user) {
      setError('User not found')
      return
    }

    try {
      addLog(`Joining workspace ${workspaceId}...`)
      await joinWorkspace(workspaceId, user.id)

      // Fetch updated workspaces list
      const updatedWorkspaces = await getWorkspaces(user.id)
      setWorkspaces(updatedWorkspaces)
      setUserWorkspaceIds(updatedWorkspaces.map((workspace: { id: string }) => workspace.id))

      // Clear the joining state
      setJoiningWorkspaceName(null)

      addLog(`Successfully joined workspace ${workspaceId}`)
      return updatedWorkspaces
    } catch (error) {
      logError('Error joining workspace:', { error: error instanceof Error ? error.message : String(error) })
      setError('Failed to join workspace. Please try again.')
      throw error
    }
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleSelectDM = (userId: string) => {
    setActiveDM(userId)
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
      logError('Error fetching workspace name', { error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }

  const handleLogout = async () => {
    try {
      // Clear workspace cookie on logout
      Cookies.remove('lastWorkspaceId');

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      router.push('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleReturnToWorkspaceSelection = () => {
    // Clear cookie when returning to workspace selection
    Cookies.remove('lastWorkspaceId');
    setActiveWorkspace('');
    setActiveChannel('');
    setActiveDM(null);
    setShowWorkspaceSelection(true);
  };

  // Check cookie on mount
  useEffect(() => {
    if (!loading && user) {
      const lastWorkspaceId = Cookies.get('lastWorkspaceId');
      console.log('Platform: Found lastWorkspaceId in cookie:', lastWorkspaceId);

      if (lastWorkspaceId) {
        console.log('Platform: Auto-selecting workspace from cookie:', lastWorkspaceId);
        handleWorkspaceSelect(lastWorkspaceId);
      }
    }
  }, [loading, user]);

  const handleSearch = async (query: string) => {
    if (!query.trim() || !activeWorkspace) return;

    try {
      logInfo(`Searching for: "${query}" in workspace ${activeWorkspace}`)
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
        logError('Search error', { error: error.message })
        throw error;
      }

      logInfo('Search results found', { count: data?.length || 0 })
      setSearchResults(data || []);
      setShowSearchResults(true);
    } catch (error) {
      logError('Error searching messages', { error: error instanceof Error ? error.message : String(error) })
      setError('Failed to search messages');
    }
  };

  const handleMobileNavigation = (type: 'channel' | 'dm', id: string) => {
    if (type === 'channel') {
      setActiveChannel(id)
      setActiveDM(null)
    } else {
      setActiveDM(id)
      setActiveChannel('')
    }
    setShowMobileChat(true)
  }

  const handleSendMessage = async (content: string, codeAttachments: Array<{ language: string; content: string }> = []) => {
    if (!session?.user?.email || !activeChannel) return;

    try {
      // Combine message content with code blocks
      let finalContent = content;
      if (codeAttachments.length > 0) {
        // Add a newline if there's existing content
        if (finalContent.trim()) {
          finalContent += '\n\n';
        }
        // Add each code block
        finalContent += codeAttachments.map(code =>
          `\`\`\`${code.language}\n${code.content}\n\`\`\``
        ).join('\n\n');
      }

      // Send the message using the supabase sendMessage function
      const message = await sendMessage(
        activeChannel,
        session.user.id,
        finalContent,
        null // fileAttachments
      );

      // Update messages optimistically
      setMessages(prev => [...prev, message]);

    } catch (error) {
      logError('Error sending message', { error: error instanceof Error ? error.message : String(error) })
      setError('This service is currently experiencing high traffic or still in production. Please try again later.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-pink-300 to-blue-300 dark:from-pink-900 dark:to-blue-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Loading your workspace...</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Please wait while we set things up</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-pink-300 to-blue-300 dark:from-pink-900 dark:to-blue-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-96 text-center">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Welcome to OHF</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please visit our homepage to learn more about our platform and get started.
          </p>
          <a
            href="/"
            className="inline-block bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 transition-colors"
          >
            Go to Homepage
          </a>
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
          logInfo('Toggle favorite', { action: 'toggleFavorite', workspaceId })
        }}
        isMobile={isMobile}
      />
    )
  }

  if (isMobile) {
    return (
      <div className="h-screen bg-white dark:bg-gray-800">
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
          isMobile={true}
          onMenuToggle={() => setShowMobileMenu(!showMobileMenu)}
        />

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowMobileMenu(false)}>
            <div className="w-64 h-full bg-white dark:bg-gray-800 shadow-lg" onClick={e => e.stopPropagation()}>
              {/* Menu content */}
            </div>
          </div>
        )}

        {/* Mobile Channel/DM List View */}
        {!showMobileChat && (
          <div className="h-[calc(100vh-64px)] overflow-y-auto">
            <CollapsibleDMList
              workspaceId={activeWorkspace}
              onSelectDMAction={(userId) => handleMobileNavigation('dm', userId)}
              activeUserId={activeDM}
              currentUserId={user.id}
              isCollapsed={false}
              isMobile={true}
            />
            <Sidebar
              activeWorkspace={activeWorkspace}
              setActiveWorkspace={setActiveWorkspace}
              activeChannel={activeChannel}
              setActiveChannel={(channelId) => handleMobileNavigation('channel', channelId)}
              currentUser={user}
              workspaces={workspaces}
              isMobile={true}
            />
          </div>
        )}

        {/* Mobile Chat View */}
        {showMobileChat && (
          <div className="h-[calc(100vh-64px)]">
            <div className="flex items-center p-2 border-b dark:border-gray-700">
              <button
                onClick={() => setShowMobileChat(false)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="ml-2 font-medium">
                {activeChannel ? `#${activeChannel}` : 'Direct Message'}
              </span>
            </div>

            {activeChannel && (
              <ChatArea
                activeWorkspace={activeWorkspace}
                activeChannel={activeChannel}
                currentUser={user}
                onSwitchChannel={handleSwitchChannel}
                userWorkspaces={userWorkspaceIds}
                isMobile={true}
              />
            )}
            {activeDM && (
              <DirectMessageArea
                currentUser={user}
                otherUserId={activeDM}
                isDMListCollapsed={false}
                onClose={() => setShowMobileChat(false)}
                isMobile={true}
              />
            )}
          </div>
        )}

        {/* Profile Modal */}
        {showProfileModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
                <ProfileModal
                  currentUser={user}
                  onClose={() => setShowProfileModal(false)}
                  isMobile={true}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Desktop view (original return statement)
  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="h-[calc(100vh-2rem)] flex flex-col overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl">
        <style jsx global>{`
          /* Modern scrollbar styling */
          * {
            scrollbar-width: thin;
            scrollbar-color: rgba(156, 163, 175, 0.15) transparent;
          }

          *::-webkit-scrollbar {
            width: 4px;
          }

          *::-webkit-scrollbar-track {
            background: transparent;
          }

          *::-webkit-scrollbar-thumb {
            background-color: rgba(156, 163, 175, 0.15);
            border-radius: 100vh;
          }

          *::-webkit-scrollbar-thumb:hover {
            background-color: rgba(156, 163, 175, 0.25);
          }

          /* Hide scrollbar buttons */
          *::-webkit-scrollbar-button {
            display: none;
          }

          /* Dark mode adjustments */
          .dark *::-webkit-scrollbar-thumb {
            background-color: rgba(255, 255, 255, 0.08);
          }

          .dark *::-webkit-scrollbar-thumb:hover {
            background-color: rgba(255, 255, 255, 0.15);
          }

          /* Hide scrollbar when not hovering */
          .hover-scroll {
            scrollbar-width: none;
          }

          .hover-scroll::-webkit-scrollbar {
            display: none;
          }

          .hover-scroll:hover {
            scrollbar-width: thin;
          }

          .hover-scroll:hover::-webkit-scrollbar {
            display: block;
          }
        `}</style>

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

        <div className="flex flex-1 overflow-hidden">
          <div className="flex shrink-0">
            <CollapsibleDMList
              workspaceId={activeWorkspace}
              onSelectDMAction={handleSelectDM}
              activeUserId={activeDM}
              currentUserId={user.id}
              isCollapsed={isDMListCollapsed}
              onCollapsedChange={setIsDMListCollapsed}
            />
            {activeDM && (
              <div className="w-[25vw] shrink-0">
                <DirectMessageArea
                  currentUser={user}
                  otherUserId={activeDM}
                  isDMListCollapsed={isDMListCollapsed}
                  onClose={() => setActiveDM(null)}
                />
              </div>
            )}
          </div>
          <Sidebar
            activeWorkspace={activeWorkspace}
            setActiveWorkspace={setActiveWorkspace}
            activeChannel={activeChannel}
            setActiveChannel={(channel) => {
              setActiveChannel(channel)
            }}
            currentUser={user}
            workspaces={workspaces}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeWorkspace && activeChannel && user && (
              <div className="flex flex-1 h-full">
                <div className="flex-1 min-w-0 h-full">
                  <ChatArea
                    activeWorkspace={activeWorkspace}
                    activeChannel={activeChannel}
                    currentUser={user}
                    onSwitchChannel={handleSwitchChannel}
                    userWorkspaces={userWorkspaceIds}
                  />
                </div>
                <ActivityFeed className="transition-[width] duration-200" />
              </div>
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