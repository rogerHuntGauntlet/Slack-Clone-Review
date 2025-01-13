'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Loader2 } from 'lucide-react'
import { addUserToUniversalWorkspace } from '@/lib/supabase'

// Create a separate component that uses useSearchParams
function JoinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workspaceName, setWorkspaceName] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      setIsLoading(true)
      const { data: { session }, error: authError } = await supabase.auth.getSession()

      if (authError) throw authError
      if (!session) {
        const workspaceId = searchParams.get('workspaceId')
        router.push(`/auth?workspaceId=${workspaceId}`)
        return
      }

      // Check if user has a profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profileError || !profile) {
        console.error('Profile not found:', profileError)
        router.push('/auth')
        return
      }

      // Ensure user is in universal workspace
      try {
        await addUserToUniversalWorkspace(session.user.id)
      } catch (error) {
        console.error('Failed to add user to universal workspace:', error)
        setError('Failed to set up your workspace access. Please try again.')
        return
      }

      // Get workspace details
      const workspaceId = searchParams.get('workspaceId')
      if (!workspaceId) {
        router.push('/platform')
        return
      }

      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('name')
        .eq('id', workspaceId)
        .single()

      if (workspaceError || !workspace) {
        setError('Workspace not found')
        return
      }

      setWorkspaceName(workspace.name)
      setIsLoading(false)
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/auth')
    }
  }

  const handleJoin = async () => {
    try {
      setIsLoading(true)
      const workspaceId = searchParams.get('workspaceId')
      if (!workspaceId) {
        throw new Error('No workspace ID provided')
      }
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



      // Add user to workspace
      const { error: joinError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: session.user.id,
          role: 'member'
        })

      if (joinError) {
        throw joinError
      }

      // Redirect to platform with the workspace selected
      router.push(`/platform?workspaceId=${workspaceId}`)
    } catch (error) {
      console.error('Failed to join workspace:', error)
      setError('Failed to join workspace. Please try again.')
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
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
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Join Workspace</h2>
          <p className="text-center text-gray-300 mb-8">
            You've been invited to join <strong className="text-indigo-400">{workspaceName}</strong>
          </p>
          <button
            onClick={handleJoin}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Join Workspace'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Main page component
export default function JoinPage() {
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
      <JoinContent />
    </Suspense>
  )
} 