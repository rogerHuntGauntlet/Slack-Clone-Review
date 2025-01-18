import { useState, useMemo } from 'react'
import { Star, Search, Plus, ChevronDown, Globe, User, Users, Lock, Unlock, X } from 'lucide-react'
import type { WorkspaceListProps } from '@/types/components'
import type { Workspace } from '@/types/supabase'

type SortOption = 'name' | 'favorite' | 'newest'
const OHF_WORKSPACE_NAME = 'OHF Community'

const WorkspaceList: React.FC<WorkspaceListProps> = ({
  workspaces,
  onSelectWorkspace,
  onCreateWorkspace,
  newWorkspaceName,
  setNewWorkspaceName,
  onToggleFavorite,
  onTogglePublic,
  isMobile,
  error,
  success,
  isCreatingWorkspace,
  currentUserId,
  onUpdateDescription
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isNewWorkspacePublic, setIsNewWorkspacePublic] = useState(false)
  const [editingDescription, setEditingDescription] = useState<string | null>(null)
  const [tempDescription, setTempDescription] = useState('')
  const [searchQueries, setSearchQueries] = useState({
    public: '',
    created: '',
    joined: ''
  })
  const [sortBy, setSortBy] = useState<{ [key: string]: SortOption }>({
    public: 'name',
    created: 'newest',
    joined: 'name'
  })

  // Sort options
  const sortOptions = [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'favorite', label: 'Favorites First' },
    { value: 'newest', label: 'Newest First' }
  ]

  // Categorize and sort workspaces
  const categorizedWorkspaces = useMemo(() => {
    const filterAndSort = (workspaces: Workspace[], category: 'public' | 'created' | 'joined') => {
      return workspaces
        .filter(workspace => {
          const searchQuery = searchQueries[category].toLowerCase()
          return workspace.name.toLowerCase().includes(searchQuery)
        })
        .sort((a: Workspace, b: Workspace) => {
          if (category === 'public') {
            if (a.name === OHF_WORKSPACE_NAME) return -1
            if (b.name === OHF_WORKSPACE_NAME) return 1
          }

          switch (sortBy[category]) {
            case 'name':
              return a.name.localeCompare(b.name)
            case 'favorite':
              return ((b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)) || a.name.localeCompare(b.name)
            case 'newest':
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            default:
              return 0
          }
        })
    }

    const publicWorkspaces = workspaces.filter(w => w.is_public || w.name === OHF_WORKSPACE_NAME)
    const createdWorkspaces = workspaces.filter(w => w.created_by === currentUserId && w.name !== OHF_WORKSPACE_NAME)
    const joinedWorkspaces = workspaces.filter(w => 
      w.created_by !== currentUserId && 
      w.name !== OHF_WORKSPACE_NAME
    )

    return {
      public: filterAndSort(publicWorkspaces, 'public'),
      created: filterAndSort(createdWorkspaces, 'created'),
      joined: filterAndSort(joinedWorkspaces, 'joined')
    }
  }, [workspaces, searchQueries, sortBy, currentUserId])

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onCreateWorkspace(e, isNewWorkspacePublic)
    setIsNewWorkspacePublic(false)
  }

  const renderWorkspaceCard = (workspace: Workspace) => {
    const isCreator = workspace.created_by === currentUserId
    const isOHFCommunity = workspace.name === OHF_WORKSPACE_NAME
    const isEditing = editingDescription === workspace.id

    return (
      <div
        key={workspace.id}
        className="group relative flex flex-col p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 min-w-0">
            {(workspace.is_public || isOHFCommunity) ? (
              <Globe className="w-4 h-4 text-blue-500" />
            ) : (
              <Lock className="w-4 h-4 text-gray-400" />
            )}
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {workspace.name}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {isCreator && !isOHFCommunity && (
              <button
                onClick={() => onTogglePublic(workspace.id)}
                className={`flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                  workspace.is_public 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {workspace.is_public ? (
                  <>
                    <Globe className="w-3 h-3 mr-1" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 mr-1" />
                    Private
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => onToggleFavorite(workspace.id)}
              className={`text-gray-400 hover:text-yellow-500 transition-colors ${workspace.isFavorite ? 'text-yellow-500' : ''}`}
            >
              <Star className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isOHFCommunity && (
          <div className="inline-flex items-center px-2 py-1 mb-2 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-600 dark:text-blue-400">
            <Globe className="w-3 h-3 mr-1" />
            Public Community Space
          </div>
        )}

        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={tempDescription}
                onChange={(e) => setTempDescription(e.target.value)}
                placeholder="Add a description..."
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                rows={3}
              />
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    onUpdateDescription(workspace.id, tempDescription)
                    setEditingDescription(null)
                  }}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingDescription(null)
                    setTempDescription('')
                  }}
                  className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="relative group min-h-[1.5rem] mb-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {workspace.description || (isCreator && !isOHFCommunity ? 'Add a description...' : '')}
              </p>
              {isCreator && !isOHFCommunity && (
                <button
                  onClick={() => {
                    setEditingDescription(workspace.id)
                    setTempDescription(workspace.description || '')
                  }}
                  className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-500 hover:text-blue-600"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {workspace.member_count} members
          </span>
          <button
            onClick={() => onSelectWorkspace(workspace.id)}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors"
          >
            Join Workspace
          </button>
        </div>
      </div>
    )
  }

  const renderColumn = (title: string, icon: React.ReactNode, category: 'public' | 'created' | 'joined', workspaces: typeof categorizedWorkspaces.public) => (
    <div className="flex-1 min-w-[300px] bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              {title}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => {
              const newSort = sortBy[category] === 'name' ? 'favorite' : sortBy[category] === 'favorite' ? 'newest' : 'name'
              setSortBy({ ...sortBy, [category]: newSort })
            }}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search workspaces..."
          value={searchQueries[category]}
          onChange={(e) => setSearchQueries({ ...searchQueries, [category]: e.target.value })}
          className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-300px)] pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {workspaces.map(renderWorkspaceCard)}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              Your Workspaces
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create, join and manage your workspaces
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Workspace
          </button>
        </div>

        {/* Create Workspace Form */}
        {showCreateForm && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                Create New Workspace
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setIsNewWorkspacePublic(false)
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-6">
              <div>
                <label htmlFor="workspaceName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  id="workspaceName"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                  placeholder="Enter workspace name"
                  disabled={isCreatingWorkspace}
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setIsNewWorkspacePublic(!isNewWorkspacePublic)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border ${
                    isNewWorkspacePublic
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800'
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                  } transition-colors`}
                >
                  <div className="flex items-center space-x-3">
                    {isNewWorkspacePublic ? (
                      <Globe className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Lock className="w-5 h-5 text-gray-400" />
                    )}
                    <div className="text-left">
                      <p className={`font-medium ${
                        isNewWorkspacePublic
                          ? 'text-blue-700 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {isNewWorkspacePublic ? 'Public Workspace' : 'Private Workspace'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {isNewWorkspacePublic ? 'Anyone can join' : 'Invite only'}
                      </p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isNewWorkspacePublic
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-500'
                  }`}>
                    {isNewWorkspacePublic && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 text-green-700 dark:text-green-400 text-sm">
                  {success}
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg transition-colors ${
                    isCreatingWorkspace
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:from-blue-600 hover:to-purple-700'
                  }`}
                  disabled={isCreatingWorkspace}
                >
                  {isCreatingWorkspace ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating...
                    </div>
                  ) : (
                    'Create Workspace'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setIsNewWorkspacePublic(false)
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Workspace Columns */}
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
          {renderColumn(
            'Public Workspaces',
            <Globe className="w-5 h-5 text-blue-500" />,
            'public',
            categorizedWorkspaces.public
          )}
          {renderColumn(
            'Created by You',
            <User className="w-5 h-5 text-green-500" />,
            'created',
            categorizedWorkspaces.created
          )}
          {renderColumn(
            'Joined Workspaces',
            <Users className="w-5 h-5 text-purple-500" />,
            'joined',
            categorizedWorkspaces.joined
          )}
        </div>
      </div>
    </div>
  )
}

export default WorkspaceList