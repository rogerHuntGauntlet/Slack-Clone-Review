'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    /**
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && session.user.email) {
        await fetchUserProfile(session.user.email)
      }
    }
    checkSession()
    */
  }, [])

  const fetchUserProfile = async (email: string) => {
    try {
      setMessage('Fetching user profile...')
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile not found, create a new one
        setMessage('Creating new user profile...')
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({ email })
          .select()
          .single()

        if (createError) throw createError
        data = newUser
      } else if (error) {
        throw error
      }

      if (data) {
        setMessage('User profile fetched successfully. Redirecting...')
        setTimeout(() => router.push('/platform'), 2000)
      } else {
        throw new Error('Failed to fetch or create user profile')
      }
    } catch (error) {
      console.error('Error fetching/creating user profile:', error)
      setError('Failed to fetch or create user profile. Please try logging in again.')
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      setMessage('Signing in...')
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      setMessage('Sign in successful. Fetching user profile...')
      sessionStorage.setItem('userEmail', email) // Store email in localStorage
      await fetchUserProfile(email)
    } catch (error: any) {
      setError(error.message)
      setLoading(false)
    } finally {
      //
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
      setMessage('Sign up successful. Please check your email for confirmation.')
    } catch (error: any) {
      setError(error.message)
      setLoading(false)
    } finally {
      //
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-pink-300 to-blue-300 dark:from-pink-900 dark:to-blue-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Welcome to ChatGenius</h1>
        {error && <p className="text-red-500 mb-4" role="alert">{error}</p>}
        {message && <p className="text-green-500 mb-4" role="status">{message}</p>}
        <form className="space-y-4">
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
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900 dark:text-white dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Sign In'}
          </button>
          <button
            onClick={handleSignUp}
            disabled={loading}
            className="w-full bg-green-500 text-white p-2 rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  )
}
