'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { motion } from 'framer-motion'
import { User, Briefcase, MessageSquare, Loader2, ArrowRight, Check } from 'lucide-react'
import { updateUserProfile, createOnboardingWorkspace, createOnboardingChannel } from '@/lib/supabase/onboarding'

interface Step {
  id: string
  title: string
  description: string
  icon: React.ElementType
  status: 'pending' | 'loading' | 'complete' | 'error'
  error?: string
}

// Create a separate component that uses useSearchParams
function OnboardingContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status')
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [steps, setSteps] = useState<Step[]>([
    {
      id: 'profile',
      title: 'Create Profile',
      description: 'Set up your user profile',
      icon: User,
      status: 'pending'
    },
    {
      id: 'workspace',
      title: 'Create Workspace',
      description: 'Set up your first workspace',
      icon: Briefcase,
      status: 'pending'
    },
    {
      id: 'channel',
      title: 'Create Channel',
      description: 'Set up your first channel',
      icon: MessageSquare,
      status: 'pending'
    }
  ])

  const [currentStep, setCurrentStep] = useState(0)
  const [username, setUsername] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [channelName, setChannelName] = useState('')
  const [loading, setLoading] = useState(false)
  const platformUrl = '/platform'

  useEffect(() => {
    const fetchExistingData = async () => {
      try {
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

        // First check if we have everything we need
        const [profileResult, workspacesResult] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('username')
            .eq('id', session.user.id)
            .single(),
          supabase
            .from('workspaces')
            .select('id')
            .eq('created_by', session.user.id)
        ])

        const hasProfile = profileResult.data && !profileResult.error
        const hasCreatedWorkspace = workspacesResult.data && workspacesResult.data.length > 0
        const isNewSignup = session.user.user_metadata?.is_new_signup === true

        // If we have everything and not a new signup, force redirect to platform
        if (hasProfile && hasCreatedWorkspace && !isNewSignup) {
          console.log('✅ User has completed setup, forcing redirect to platform...')
          // Clear any onboarding state
          localStorage.removeItem('onboarding')
          localStorage.removeItem('onboardingStep')

          // Force navigation to platform with no-cache headers
     
          const response = await fetch(platformUrl, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          })
          window.location.href = platformUrl
          return
        }

        // Otherwise, load existing data for the form
        if (profileResult.data?.username) {
          console.log('✅ Found existing profile')
          setUsername(profileResult.data.username)
          updateStepStatus('profile', 'complete')
          setCurrentStep(prev => prev === 0 ? 1 : prev)
        }

        // Check for existing workspace
        if (hasCreatedWorkspace) {
          const { data: workspace } = await supabase
            .from('workspaces')
            .select('id, name')
            .eq('created_by', session.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (workspace?.name) {
            console.log('✅ Found existing workspace')
            setWorkspaceName(workspace.name)
            updateStepStatus('workspace', 'complete')
            setCurrentStep(prev => prev <= 1 ? 2 : prev)

            // Check for existing channel in this workspace
            const { data: channel } = await supabase
              .from('channels')
              .select('name')
              .eq('workspace_id', workspace.id)
              .eq('created_by', session.user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (channel?.name) {
              console.log('✅ Found existing channel')
              setChannelName(channel.name)
              updateStepStatus('channel', 'complete')

              // If we have everything, force redirect
              if (profileResult.data?.username && workspace?.name) {
                console.log('✅ All steps complete, forcing redirect to platform...')
                // Update user metadata
                await supabase.auth.updateUser({
                  data: { is_new_signup: false }
                })

                // Clear any onboarding state
                localStorage.removeItem('onboarding')
                localStorage.removeItem('onboardingStep')

                // Force navigation to platform with no-cache headers
         
                const response = await fetch(platformUrl, {
                  headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                  }
                })
                window.location.href = platformUrl
                return
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error fetching existing data:', error)
      }
    }

    fetchExistingData()
  }, [])

  const updateStepStatus = (stepId: string, status: Step['status'], error?: string) => {
    setSteps(steps => steps.map(step =>
      step.id === stepId ? { ...step, status, error } : step
    ))
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      updateStepStatus('profile', 'error', 'Username is required')
      return
    }

    try {
      console.log('🔵 Starting profile creation...')
      updateStepStatus('profile', 'loading')
      setLoading(true)

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

      const profile = await updateUserProfile(session.user.id, { username })
      console.log('✅ Profile created:', profile)

      updateStepStatus('profile', 'complete')
      setCurrentStep(1)
    } catch (error: any) {
      console.error('❌ Profile creation failed:', error)
      updateStepStatus('profile', 'error', `Failed to create profile: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspaceName.trim()) {
      updateStepStatus('workspace', 'error', 'Workspace name is required')
      return
    }

    try {
      console.log('🔵 Starting workspace creation...')
      updateStepStatus('workspace', 'loading')
      setLoading(true)

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


      const workspace = await createOnboardingWorkspace(session.user.id, { name: workspaceName })
      console.log('✅ Workspace created:', workspace)

      updateStepStatus('workspace', 'complete')
      setCurrentStep(2)
    } catch (error: any) {
      console.error('❌ Workspace creation failed:', error)
      updateStepStatus('workspace', 'error', `Failed to create workspace: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!channelName.trim()) {
      updateStepStatus('channel', 'error', 'Channel name is required')
      return
    }

    try {
      console.log('🔵 Starting channel creation...')
      updateStepStatus('channel', 'loading')
      setLoading(true)

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


      // Get the workspace ID
      console.log('🔵 Fetching workspace...')
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('id, created_at')
        .eq('created_by', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (workspaceError) {
        console.error('❌ Error fetching workspace:', workspaceError)
        throw new Error(`Failed to fetch workspace: ${workspaceError.message}`)
      }
      if (!workspace) {
        console.error('❌ No workspace found')
        throw new Error('No workspace found. Please create a workspace first.')
      }
      console.log('✅ Workspace found:', workspace)

      console.log('🔵 Creating channel...')
      const channel = await createOnboardingChannel(workspace.id, session.user.id, { name: channelName })
      console.log('✅ Channel created:', channel)

      // Mark channel step as complete
      updateStepStatus('channel', 'complete')

      // Update user metadata and verify the update
      console.log('🔄 Updating user metadata...')
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { is_new_signup: false }
      })

      if (metadataError) {
        console.log('Failed to update user metadata: ', metadataError)
      }


      // Verify metadata update
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.is_new_signup === true) {
        console.log('Metadata update failed to persist')
      }

      console.log('✅ User metadata updated and verified:', user?.user_metadata)

      // Clear any onboarding state from local storage
      localStorage.removeItem('onboarding')
      localStorage.removeItem('onboardingStep')

      // Wait a moment for metadata to propagate
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Force navigation to platform
      console.log('🔄 Forcing redirect to platform...')
      window.location.replace(platformUrl)

    } catch (error: any) {
      console.error('❌ Channel creation failed:', error)
      updateStepStatus('channel', 'error', `Failed to create channel: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white">Welcome to OHF</h2>
          <p className="mt-2 text-gray-400">Let's get you set up</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center mb-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${step.status === 'complete' ? 'bg-green-500' :
                step.status === 'loading' ? 'bg-blue-500 animate-pulse' :
                  step.status === 'error' ? 'bg-red-500' :
                    index === currentStep ? 'bg-indigo-500' : 'bg-gray-700'
                }`}>
                {step.status === 'complete' ? (
                  <Check className="w-6 h-6 text-white" />
                ) : step.status === 'loading' ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <step.icon className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-medium text-white">{step.title}</h3>
                <p className="text-sm text-gray-400">{step.description}</p>
                {step.status === 'error' && (
                  <p className="text-sm text-red-400 mt-1">{step.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Forms */}
        {currentStep === 0 && (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleProfileSubmit}
            className="space-y-4"
          >
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300">
                Username {steps[0].status === 'complete' && <span className="text-green-500 ml-2">(✓ Profile Created)</span>}
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4"
                required
                placeholder="Enter username"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {steps[0].status === 'complete' ? 'Update Profile' : 'Continue'}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </button>
          </motion.form>
        )}

        {currentStep === 1 && (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleWorkspaceSubmit}
            className="space-y-4"
          >
            <div>
              <label htmlFor="workspace" className="block text-sm font-medium text-gray-300">
                Workspace Name {steps[1].status === 'complete' && <span className="text-green-500 ml-2">(✓ Workspace Created)</span>}
              </label>
              <input
                type="text"
                id="workspace"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4"
                required
                placeholder="Enter workspace name"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {steps[1].status === 'complete' ? 'Update Workspace' : 'Continue'}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </button>
          </motion.form>
        )}

        {currentStep === 2 && (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleChannelSubmit}
            className="space-y-4"
          >
            <div>
              <label htmlFor="channel" className="block text-sm font-medium text-gray-300">
                Channel Name {steps[2].status === 'complete' && <span className="text-green-500 ml-2">(✓ Channel Created)</span>}
              </label>
              <input
                type="text"
                id="channel"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4"
                required
                placeholder="Enter channel name"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {steps[2].status === 'complete' ? 'Update Channel' : 'Complete Setup'}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </button>
          </motion.form>
        )}
      </div>
    </div>
  )
}

// Main page component
export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-t-2 border-b-2 border-white rounded-full animate-spin" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-white">Loading...</h2>
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
} 