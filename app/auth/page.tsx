'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [workspaceName, setWorkspaceName] = useState<string | null>(null)
  
  const workspaceId = searchParams.get('workspaceId')
  const nextPath = "/platform"

  useEffect(() => {
    const fetchWorkspaceName = async () => {
      if (workspaceId) {
        const { data, error } = await supabase
          .from('workspaces')
          .select('name')
          .eq('id', workspaceId)
          .single()
        
        if (!error && data) {
          setWorkspaceName(data.name)
        }
      }
    }

    fetchWorkspaceName()
  }, [workspaceId])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      let authResponse;
      
      if (mode === 'signin') {
        authResponse = await supabase.auth.signInWithPassword({
          email,
          password,
        })
      } else {
        authResponse = await supabase.auth.signUp({
          email,
          password,
        })
      }

      const { data, error } = authResponse
      if (error) throw error

      if (workspaceId && data.user) {
        // If this was an invite, join the workspace
        const { error: joinError } = await supabase
          .from('workspace_members')
          .insert({
            workspace_id: workspaceId,
            user_id: data.user.id,
            role: 'member'
          })

        if (joinError) throw joinError
      }

      router.push(nextPath)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            {workspaceId 
              ? `Join ${workspaceName || 'Workspace'}` 
              : mode === 'signin' ? "Sign in to your account" : "Create your account"}
          </h2>
          {workspaceId && (
            <p className="mt-2 text-center text-sm text-gray-400">
              {workspaceName 
                ? `You've been invited to join ${workspaceName}` 
                : 'Sign in or create an account to join'}
            </p>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === 'signin' ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {isLoading 
                ? 'Processing...' 
                : mode === 'signin' 
                  ? (workspaceId ? 'Sign in to join' : 'Sign in') 
                  : (workspaceId ? 'Sign up to join' : 'Sign up')}
            </button>

            <button
              type="button"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              {mode === 'signin' 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Auth() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <AuthContent />
    </Suspense>
  )
}
