import { useState, useMemo } from 'react'
import { Star, Search, Plus, ChevronDown, Globe } from 'lucide-react'
import type { WorkspaceListProps } from '@/types/components'

type SortOption = 'name' | 'favorite'

const OHF_WORKSPACE_NAME = 'OHF Community'

const WorkspaceList: React.FC<WorkspaceListProps> = ({
  workspaces,
  onSelectWorkspace,
  onCreateWorkspace,
  newWorkspaceName,
  setNewWorkspaceName,
  onToggleFavorite,
  isMobile
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [showSortOptions, setShowSortOptions] = useState(false)

  // Sort options
  const sortOptions = [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'favorite', label: 'Favorites First' }
  ]

  // Filter and sort workspaces
  const filteredAndSortedWorkspaces = useMemo(() => {
    return workspaces
      .filter(workspace => 
        workspace.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        // Always put OHF Community first
        if (a.name === OHF_WORKSPACE_NAME) return -1
        if (b.name === OHF_WORKSPACE_NAME) return 1

        // Then apply selected sort
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name)
          case 'favorite':
            return ((b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)) || a.name.localeCompare(b.name)
          default:
            return 0
        }
      })
  }, [workspaces, searchQuery, sortBy])

  const renderWorkspaceCard = (workspace: typeof workspaces[0]) => {
    const isOHFCommunity = workspace.name === OHF_WORKSPACE_NAME

    return (
      <div
        key={workspace.id}
        className={`flex flex-col p-6 ${
          isOHFCommunity 
            ? 'bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-200 dark:border-blue-800' 
            : 'bg-gray-50 dark:bg-gray-700'
        } rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 hover:shadow-lg`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 min-w-0">
            {isOHFCommunity && (
              <Globe className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
            )}
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
              {workspace.name}
            </h3>
          </div>
          <button
            onClick={() => onToggleFavorite(workspace.id)}
            className={`text-gray-400 hover:text-yellow-500 transition-colors flex-shrink-0 ${workspace.isFavorite ? 'text-yellow-500' : ''}`}
          >
            <Star className="w-5 h-5" />
          </button>
        </div>

        {isOHFCommunity && (
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
            Public Community Space
          </p>
        )}
        
        <div className="mt-auto">
          <button
            onClick={() => onSelectWorkspace(workspace.id)}
            className={`w-full px-4 py-3 rounded-lg transition-all duration-200 hover:shadow-md ${
              isOHFCommunity
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Join Workspace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 ${isMobile ? 'p-4' : 'p-8'}`}>
      <div className={`max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl ${isMobile ? 'p-4' : 'p-8'}`}>
        <div className="flex flex-col space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Workspaces</h1>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 hover:shadow-md"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Workspace
            </button>
          </div>

          {/* Search and Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortOptions(!showSortOptions)}
                className="flex items-center px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <span className="mr-2">Sort by: {sortOptions.find(opt => opt.value === sortBy)?.label}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showSortOptions && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value as SortOption)
                        setShowSortOptions(false)
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Create Workspace Form */}
          {showCreateForm && (
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
              <form onSubmit={onCreateWorkspace} className="space-y-4">
                <div>
                  <label htmlFor="workspaceName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    id="workspaceName"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    className="mt-1 block w-full px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter workspace name"
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Create Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Workspace Grid */}
          <div className={`grid gap-4 ${
            isMobile 
              ? 'grid-cols-1' 
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}>
            {filteredAndSortedWorkspaces.map(renderWorkspaceCard)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkspaceList
