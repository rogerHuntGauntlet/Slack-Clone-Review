'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { motion, AnimatePresence } from 'framer-motion'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin')
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkWorkspace = async () => {
      const params = new URLSearchParams(window.location.search)
      const wsId = params.get('workspaceId')
      if (wsId) {
        setWorkspaceId(wsId)
        const { data: workspace } = await supabase.from('workspaces').select('name').eq('id', wsId).single()
        setMessage(`Sign in or sign up to join ${workspace?.name || 'this workspace'} and join the conversation!`)
      }
    }
    checkWorkspace()
  }, [])

  const joinWorkspace = async (userId: string) => {
    if (!workspaceId) return

    try {
      // First check if user is already a member
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single()

      if (existingMember) {
        // User is already a member, just redirect
        setMessage('Welcome back! Redirecting to workspace...')
        setTimeout(() => router.push('/platform'), 1500)
        return
      }

      // If not a member, add them
      const { error } = await supabase
        .from('workspace_members')
        .insert({ 
          workspace_id: workspaceId, 
          user_id: userId,
          role: 'member'
        })

      if (error) throw error
      setMessage('Successfully joined workspace! Redirecting...')
      setTimeout(() => router.push('/platform'), 1500)
    } catch (error) {
      console.error('Error joining workspace:', error)
      setError('Failed to join workspace. Please try again.')
      setLoading(false)
    }
  }

  const fetchUserProfile = async (email: string, userId: string) => {
    try {
      setMessage('Fetching user profile...')
      let { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile not found, create a new one
        setMessage('Creating new user profile...')
        const username = email.split('@')[0] // Extract username from email
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert({ email, username })
          .select()
          .single()

        if (createError) throw createError
        profile = newProfile
      } else if (error) {
        throw error
      }

      if (profile) {
        if (workspaceId) {
          await joinWorkspace(userId)
        } else {
          setMessage('User profile fetched successfully. Redirecting...')
          setTimeout(() => router.push('/platform'), 1500)
        }
      } else {
        throw new Error('Failed to fetch or create user profile')
      }
    } catch (error) {
      console.error('Error fetching/creating user profile:', error)
      setError('Failed to fetch or create user profile. Please try logging in again.')
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      setMessage('Signing in...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      if (!data.user) throw new Error('No user data')
      
      setMessage('Sign in successful. Fetching user profile...')
      sessionStorage.setItem('userEmail', email)
      await fetchUserProfile(email, data.user.id)
    } catch (error: any) {
      setError(error.message)
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      setMessage('Signing up...')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      if (!data.user) throw new Error('No user data')

      // Create user profile immediately after signup
      setMessage('Creating your profile...')
      const username = email.split('@')[0]
      const { error: profileError, data: profileData } = await supabase
        .from('users')
        .insert({ 
          id: data.user.id,
          email, 
          username 
        })
        .select()
        .single()

      if (profileError) throw profileError

      if (workspaceId) {
        // Add to workspace if joining through invite
        await joinWorkspace(profileData.id)
        setMessage('Profile created and workspace joined! Please check your email to confirm your account.')
      } else {
        setMessage('Sign up successful! Please check your email to confirm your account.')
      }
    } catch (error: any) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
            ChatGenius
          </h1>
          {workspaceId && (
            <p className="mt-2 text-gray-600 dark:text-gray-300">Join Workspace</p>
          )}
        </div>

        {(error || message) && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6"
            >
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm" role="alert">
                  {error}
                </div>
              )}
              {message && (
                <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-lg text-sm" role="status">
                  {message}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('signin')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'signin'
                ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveTab('signup')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'signup'
                ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
              placeholder="Enter your email"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
              placeholder={activeTab === 'signup' ? 'Create a password' : 'Enter your password'}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={activeTab === 'signin' ? handleSignIn : handleSignUp}
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-pink-500 text-white py-2.5 rounded-lg font-medium hover:opacity-90 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              activeTab === 'signin' ? 'Sign In' : 'Sign Up'
            )}
          </motion.button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          {activeTab === 'signin' ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => setActiveTab('signup')}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setActiveTab('signin')}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
