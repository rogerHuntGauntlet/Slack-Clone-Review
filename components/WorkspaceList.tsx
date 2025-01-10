import React, { useState } from 'react'
import { PlusCircle, Folder, Star, Search, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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

const WorkspaceCard: React.FC<{
  workspace: Workspace
  onSelect: (id: string) => void
  onToggleFavorite: (id: string) => void
  index: number
}> = ({ workspace, onSelect, onToggleFavorite, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    onClick={() => onSelect(workspace.id)}
    className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg dark:hover:shadow-2xl-dark transition-all duration-200 cursor-pointer overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    
    <div className="relative z-10 flex items-center justify-between mb-3">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-lg">
          <Folder className="h-5 w-5 text-indigo-500" />
        </div>
        <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
          {workspace.name}
        </h3>
      </div>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(workspace.id)
        }}
        className="relative z-10 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
      >
        <Star
          className={`h-5 w-5 transition-colors ${
            workspace.isFavorite
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-400'
          }`}
        />
      </motion.button>
    </div>
  </motion.div>
)

const WorkspaceList: React.FC<WorkspaceListProps> = ({
  workspaces,
  onSelectWorkspace,
  onCreateWorkspace,
  newWorkspaceName,
  setNewWorkspaceName,
  onToggleFavorite,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const filteredWorkspaces = workspaces.filter((workspace) =>
    workspace.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const favoriteWorkspaces = workspaces.filter((workspace) => workspace.isFavorite)

  const handleCreateSubmit = (e: React.FormEvent) => {
    onCreateWorkspace(e)
    setIsCreating(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-gray-100 p-4">
      {/* Header Section */}
      <header className="pt-12 pb-8 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold mb-3 text-white"
        >
          Your Workspaces
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-gray-100/80"
        >
          Organize and access your projects seamlessly
        </motion.p>
      </header>

      {/* Main Content Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col overflow-hidden"
      >
        {/* Search and Create Section */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search workspaces..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2 bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:text-white transition-all duration-200"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setIsCreating(true)}
              className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              New Workspace
            </motion.button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2 -mr-2 hide-scrollbar">
          {/* Favorites Section */}
          <AnimatePresence>
            {favoriteWorkspaces.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h2 className="text-base font-medium mb-3 text-gray-900 dark:text-white flex items-center gap-2 sticky top-0 bg-white dark:bg-gray-800 py-2">
                  <Star className="fill-yellow-400 text-yellow-400" size={18} />
                  <span>Favorites</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {favoriteWorkspaces.map((workspace, index) => (
                    <WorkspaceCard
                      key={workspace.id}
                      workspace={workspace}
                      onSelect={onSelectWorkspace}
                      onToggleFavorite={onToggleFavorite}
                      index={index}
                    />
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* All Workspaces */}
          <section>
            <h2 className="text-base font-medium mb-3 text-gray-900 dark:text-white sticky top-0 bg-white dark:bg-gray-800 py-2">All Workspaces</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredWorkspaces.map((workspace, index) => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  onSelect={onSelectWorkspace}
                  onToggleFavorite={onToggleFavorite}
                  index={index}
                />
              ))}
            </div>
          </section>
        </div>
      </motion.div>

      {/* Create Workspace Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setIsCreating(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md"
            >
              <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">Create Workspace</h3>
              <form onSubmit={handleCreateSubmit} className="space-y-5">
                <div className="space-y-1">
                  <label htmlFor="workspace-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Workspace Name
                  </label>
                  <input
                    id="workspace-name"
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="Enter workspace name"
                    required
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                  >
                    Create
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default WorkspaceList
