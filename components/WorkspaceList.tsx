import { useState } from 'react'
import { Star } from 'lucide-react'
import type { WorkspaceListProps } from '@/types/components'

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

  return (
    <div className={`min-h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 ${isMobile ? 'p-4' : 'p-8'}`}>
      <div className={`max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl ${isMobile ? 'p-4' : 'p-8'}`}>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Your Workspaces</h1>

        {/* Workspace List */}
        <div className="space-y-4 mb-8">
          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => onToggleFavorite(workspace.id)}
                  className="text-gray-400 hover:text-yellow-500 transition-colors"
                >
                  <Star className="w-5 h-5" />
                </button>
                <span className="text-lg font-medium text-gray-900 dark:text-white">
                  {workspace.name}
                </span>
              </div>
              <button
                onClick={() => onSelectWorkspace(workspace.id)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Join
              </button>
            </div>
          ))}
        </div>

        {/* Create Workspace Form */}
        {showCreateForm ? (
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
                className="mt-1 block w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Create New Workspace
          </button>
        )}
      </div>
    </div>
  )
}

export default WorkspaceList
