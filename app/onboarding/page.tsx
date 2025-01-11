'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Briefcase, MessageSquare, Loader2, ArrowRight } from 'lucide-react'
import { updateUserProfile, createOnboardingWorkspace, createOnboardingChannel } from '@/lib/supabase/onboarding'

// Step type definition
type Step = 'profile' | 'workspace' | 'channel' | 'complete'

// Profile form data type
interface ProfileData {
  username: string
  bio?: string
  avatar_url?: string
}

// Workspace form data type
interface WorkspaceData {
  name: string
  description?: string
}

// Channel form data type
interface ChannelData {
  name: string
  description?: string
}

interface WorkspaceMember {
  workspace_id: string;
}

interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

// Welcome screens for different user states
const WelcomeBack = ({ router }: { router: any }) => {
  const [showAnimation, setShowAnimation] = useState(true)

  useEffect(() => {
    // After 3 seconds, show the button
    const timer = setTimeout(() => {
      setShowAnimation(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  const handleContinue = (e: React.MouseEvent) => {
    e.preventDefault()
    console.log('Navigating to platform...')
    window.location.href = '/platform'
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="text-center space-y-6"
    >
      <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-8">
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome Back!</h2>
      
      {showAnimation ? (
        <>
          <p className="text-gray-600 dark:text-gray-300">
            Getting everything ready...
          </p>
          <div className="mt-8">
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-500"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 3, ease: "linear" }}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <p className="text-gray-600 dark:text-gray-300">
            You're all set! Click below to continue.
          </p>
          <motion.button
            onClick={handleContinue}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl text-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Continue to Workspaces
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  
  // State management
  const [currentStep, setCurrentStep] = useState<Step>('profile')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  
  // Form data
  const [profileData, setProfileData] = useState<ProfileData>({ username: '' })
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData>({ name: '' })
  const [channelData, setChannelData] = useState<ChannelData>({ name: '' })
  
  // IDs for created resources
  const [userId, setUserId] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [channelId, setChannelId] = useState<string | null>(null)

  // Check authentication on mount
  useEffect(() => {
    checkAuth()
    
    // Load saved state
    const savedState = sessionStorage.getItem('onboarding_state')
    if (savedState) {
      const { step, workspaceId: savedWorkspaceId, channelId: savedChannelId } = JSON.parse(savedState)
      setCurrentStep(step as Step)
      if (savedWorkspaceId) setWorkspaceId(savedWorkspaceId)
      if (savedChannelId) setChannelId(savedChannelId)
    }
  }, [])

  const checkAuth = async () => {
    try {
      setIsInitializing(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth')
        return
      }

      // Get the user's status from URL
      const status = searchParams.get('status')
      
      if (status === 'returning' || status === 'needs_workspace') {
        // Show workspace selection screen
        setRedirecting(true)
      } else if (status === 'new' || status === 'needs_profile') {
        // Start with profile creation
        setCurrentStep('profile')
      }

      setUserId(session.user.id)

    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/auth')
    } finally {
      setIsInitializing(false)
    }
  }

  // Step content components
  const StepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {['profile', 'workspace', 'channel', 'complete'].map((step, index) => (
        <div key={step} className="flex items-center">
          <motion.div 
            className={`
              w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm
              ${currentStep === step 
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' 
                : index < ['profile', 'workspace', 'channel', 'complete'].indexOf(currentStep)
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                  : 'bg-white/5 text-gray-400 border border-white/10'}
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {index + 1}
          </motion.div>
          {index < 3 && (
            <div className={`w-16 h-0.5 mx-2 ${
              index < ['profile', 'workspace', 'channel'].indexOf(currentStep)
                ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                : 'bg-white/5'
            }`} />
          )}
        </div>
      ))}
    </div>
  )

  const ProfileStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center space-x-2 mb-6">
        <User className="w-6 h-6 text-indigo-400" />
        <h2 className="text-2xl font-bold text-white">Create Your Profile</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Username
          </label>
          <input
            type="text"
            value={profileData.username}
            onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
            placeholder="Choose a username"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Bio (optional)
          </label>
          <textarea
            value={profileData.bio || ''}
            onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
            placeholder="Tell us about yourself"
            rows={3}
          />
        </div>
      </div>
    </motion.div>
  )

  const WorkspaceStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center space-x-2 mb-6">
        <Briefcase className="w-6 h-6 text-indigo-400" />
        <h2 className="text-2xl font-bold text-white">Create Your Workspace</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Workspace Name
          </label>
          <input
            type="text"
            value={workspaceData.name}
            onChange={(e) => setWorkspaceData({ ...workspaceData, name: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
            placeholder="e.g. My Team"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Description (optional)
          </label>
          <textarea
            value={workspaceData.description || ''}
            onChange={(e) => setWorkspaceData({ ...workspaceData, description: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
            placeholder="What's your workspace about?"
            rows={3}
          />
        </div>
      </div>
    </motion.div>
  )

  const ChannelStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center space-x-2 mb-6">
        <MessageSquare className="w-6 h-6 text-indigo-400" />
        <h2 className="text-2xl font-bold text-white">Create Your First Channel</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Channel Name
          </label>
          <input
            type="text"
            value={channelData.name}
            onChange={(e) => setChannelData({ ...channelData, name: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
            placeholder="e.g. general"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Description (optional)
          </label>
          <textarea
            value={channelData.description || ''}
            onChange={(e) => setChannelData({ ...channelData, description: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
            placeholder="What's this channel about?"
            rows={3}
          />
        </div>
      </div>
    </motion.div>
  )

  const CompleteStep = () => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="text-center space-y-4"
      >
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold">All Set!</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Your workspace has been created successfully.
        </p>
        <motion.button
          onClick={() => setRedirecting(true)}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Briefcase className="w-5 h-5 mr-2" />
          View My Workspaces
        </motion.button>
      </motion.div>
    )
  }

  // Save state after successful operations
  const saveState = () => {
    sessionStorage.setItem('onboarding_state', JSON.stringify({
      step: currentStep,
      workspaceId,
      channelId
    }))
  }

  // Handle step transitions
  const handleNext = async () => {
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      if (!userId) {
        throw new Error('User ID not found. Please try logging in again.')
      }

      switch (currentStep) {
        case 'profile':
          if (!profileData.username) {
            throw new Error('Username is required')
          }
          if (profileData.username.length < 3) {
            throw new Error('Username must be at least 3 characters')
          }
          if (profileData.username.length > 30) {
            throw new Error('Username must be less than 30 characters')
          }
          if (!/^[a-zA-Z0-9_-]+$/.test(profileData.username)) {
            throw new Error('Username can only contain letters, numbers, underscores, and hyphens')
          }
          
          const profile = await updateUserProfile(userId, profileData)
          setSuccess('Profile updated successfully!')
          setCurrentStep('workspace')
          break
        
        case 'workspace':
          if (!workspaceData.name) {
            throw new Error('Workspace name is required')
          }
          if (workspaceData.name.length < 3) {
            throw new Error('Workspace name must be at least 3 characters')
          }
          if (workspaceData.name.length > 50) {
            throw new Error('Workspace name must be less than 50 characters')
          }
          
          const workspace = await createOnboardingWorkspace(userId, workspaceData)
          setWorkspaceId(workspace.id)
          setSuccess('Workspace created successfully!')
          setCurrentStep('channel')
          break
        
        case 'channel':
          if (!channelData.name) {
            throw new Error('Channel name is required')
          }
          if (!workspaceId) {
            throw new Error('No workspace ID found')
          }
          if (channelData.name.length < 2) {
            throw new Error('Channel name must be at least 2 characters')
          }
          if (channelData.name.length > 80) {
            throw new Error('Channel name must be less than 80 characters')
          }
          if (!/^[a-z0-9-_]+$/.test(channelData.name)) {
            throw new Error('Channel name can only contain lowercase letters, numbers, hyphens, and underscores')
          }
          
          const channel = await createOnboardingChannel(workspaceId, userId, channelData)
          setChannelId(channel.id)
          setSuccess('Channel created successfully!')
          setCurrentStep('complete')
          break
        
        case 'complete':
          break
      }

      // Save state after successful operation
      saveState()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {isInitializing ? (
          <div className="flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 animate-pulse flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          </div>
        ) : (
          <>
            {redirecting ? (
              <WelcomeBack router={router} />
            ) : (
              <>
                <StepIndicator />
                
                <div className="bg-black/40 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10">
                  <AnimatePresence mode="wait">
                    {currentStep === 'profile' && <ProfileStep />}
                    {currentStep === 'workspace' && <WorkspaceStep />}
                    {currentStep === 'channel' && <ChannelStep />}
                    {currentStep === 'complete' && <CompleteStep />}
                  </AnimatePresence>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400"
                    >
                      {error}
                    </motion.div>
                  )}

                  {success && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 bg-green-500/10 border border-green-500/50 rounded-xl text-green-400"
                    >
                      {success}
                    </motion.div>
                  )}

                  {currentStep !== 'complete' && (
                    <div className="mt-8 flex justify-end">
                      <motion.button
                        onClick={handleNext}
                        disabled={isLoading}
                        className="flex items-center px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            Next Step
                            <ArrowRight className="ml-2 w-5 h-5" />
                          </>
                        )}
                      </motion.button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
} 