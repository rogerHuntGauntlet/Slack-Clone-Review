import React, { useState } from 'react'
import { PlusCircle, Folder, Star, Search } from 'lucide-react'

interface Workspace {
  id: string
  name: string
  isFavorite: boolean
}

interface WorkspaceListProps {
  workspaces: Workspace[]
  onSelectWorkspace: (workspaceId: string) => void
  onCreateWorkspace: (e: React.FormEvent) => void
  newWorkspaceName: string
  setNewWorkspaceName: (name: string) => void
  onToggleFavorite: (workspaceId: string) => void
}

const WorkspaceList: React.FC<WorkspaceListProps> = ({
  workspaces,
  onSelectWorkspace,
  onCreateWorkspace,
  newWorkspaceName,
  setNewWorkspaceName,
  onToggleFavorite,
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredWorkspaces = workspaces.filter((workspace) =>
    workspace.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const favoriteWorkspaces = workspaces.filter((workspace) => workspace.isFavorite)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Section */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Workspaces</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Favorite Workspaces */}
        {favoriteWorkspaces.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Favorite Workspaces
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoriteWorkspaces.map((workspace) => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  onSelect={onSelectWorkspace}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          </section>
        )}

        {/* All Workspaces */}
        <section>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            All Workspaces
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                onSelect={onSelectWorkspace}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Create Workspace Form */}
      <div className="fixed bottom-0 inset-x-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={onCreateWorkspace} className="flex gap-4">
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Enter workspace name"
              required
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg
                text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              Create Workspace
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// New WorkspaceCard component for better organization
const WorkspaceCard: React.FC<{
  workspace: Workspace
  onSelect: (id: string) => void
  onToggleFavorite: (id: string) => void
}> = ({ workspace, onSelect, onToggleFavorite }) => (
  <div
    onClick={() => onSelect(workspace.id)}
    className="group relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 
      dark:border-gray-700 p-4 hover:border-indigo-500 dark:hover:border-indigo-500 
      transition-all cursor-pointer"
  >
    <div className="flex items-center justify-between mb-4">
      <Folder className="h-6 w-6 text-indigo-500" />
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(workspace.id)
        }}
        className="focus:outline-none"
      >
        <Star
          className={`h-5 w-5 ${
            workspace.isFavorite
              ? 'text-yellow-400 fill-current'
              : 'text-gray-400 hover:text-gray-500'
          }`}
        />
      </button>
    </div>
    <h3 className="font-medium text-gray-900 dark:text-white">{workspace.name}</h3>
  </div>
)

export default WorkspaceList
