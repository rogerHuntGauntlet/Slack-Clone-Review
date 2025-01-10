import React, { useState, useEffect } from 'react'
import { PlusCircle } from 'lucide-react'
import { getWorkspaces, createWorkspace, joinWorkspace } from '../lib/supabase'

interface Workspace {
  id: string
  name: string
  role: string
}

interface WorkspaceManagerProps {
  activeWorkspace: string
  onWorkspaceSelect: (workspaceId: string) => void
}

export default function WorkspaceManager({ 
  activeWorkspace, 
  onWorkspaceSelect
}: WorkspaceManagerProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [joinWorkspaceId, setJoinWorkspaceId] = useState('')

  useEffect(() => {
    fetchWorkspaces()
  }, [])

  const fetchWorkspaces = async () => {
    const fetchedWorkspaces = await getWorkspaces()
    setWorkspaces(fetchedWorkspaces)
  }

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newWorkspaceName) {
      const result = await createWorkspace(newWorkspaceName)
      if (result?.workspace) {
        setWorkspaces([...workspaces, { 
          id: result.workspace.id,
          name: result.workspace.name,
          role: 'admin'
        }])
        setNewWorkspaceName('')
        onWorkspaceSelect(result.workspace.id)
      }
    }
  }

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (joinWorkspaceId) {
      try {
        await joinWorkspace(joinWorkspaceId)
        await fetchWorkspaces()
        setJoinWorkspaceId('')
        onWorkspaceSelect(joinWorkspaceId)
      } catch (error) {
        console.error('Error joining workspace:', error)
      }
    }
  }

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg">
      
      <form onSubmit={handleCreateWorkspace} className="mb-4">
        <input
          type="text"
          value={newWorkspaceName}
          onChange={(e) => setNewWorkspaceName(e.target.value)}
          placeholder="New workspace name"
          className="w-full bg-gray-700 text-white placeholder-gray-400 px-2 py-1 rounded mb-2"
        />
        <button type="submit" className="w-full bg-green-500 text-white p-2 rounded flex items-center justify-center">
          <PlusCircle size={20} className="mr-2" />
          Create Workspace
        </button>
      </form>
      <form onSubmit={handleJoinWorkspace}>
        <input
          type="text"
          value={joinWorkspaceId}
          onChange={(e) => setJoinWorkspaceId(e.target.value)}
          placeholder="Workspace ID to join"
          className="w-full bg-gray-700 text-white placeholder-gray-400 px-2 py-1 rounded mb-2"
        />
        <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
          Join Workspace
        </button>
      </form>
    </div>
  )
}
