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
    <div className="min-h-screen flex flex-col bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 dark:from-gray-900 dark:to-gray-800 text-gray-100">
      {/* Header Section */}
      <header className="p-8 text-center">
        <h1 className="text-4xl font-extrabold mb-4 text-gray-800">Your Workspaces</h1>
        <p className="text-lg text-gray-600">Effortlessly manage your projects and ideas!</p>
      </header>

      {/* Search Bar */}
      <div className="px-8 py-4 flex justify-center">
        <div className="relative w-full max-w-lg">
          <Search size={20} className="absolute top-2.5 left-3 text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 py-2 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 bg-white dark:bg-gray-700 transition-all"
          />
        </div>
      </div>

      {/* Favorite Workspaces */}
      {favoriteWorkspaces.length > 0 && (
        <section className="px-8 py-4">
          <h2 className="text-2xl font-bold mb-4 text-yellow-300">⭐ Favorite Workspaces</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {favoriteWorkspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="group bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all"
              >
                <button
                  onClick={() => onSelectWorkspace(workspace.id)}
                  className="absolute inset-0 focus:outline-none"
                />
                <div className="flex items-center justify-between">
                  <Folder size={40} className="text-indigo-500 dark:text-indigo-300" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleFavorite(workspace.id)
                    }}
                    className="text-yellow-300 hover:text-yellow-400"
                  >
                    <Star size={20} className="fill-current" />
                  </button>
                </div>
                <h3 className="mt-4 text-xl font-bold text-gray-800">{workspace.name}</h3>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Workspace Grid */}
      <main className="flex-grow px-8 py-4">
        <h2 className="text-2xl font-bold mb-4 text-gray-100"></h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredWorkspaces.map((workspace) => (
            <div
              key={workspace.id}
              className="group bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all relative"
            >
              <button
                onClick={() => onSelectWorkspace(workspace.id)}
                className="absolute inset-0 focus:outline-none"
              />
              <div className="flex items-center justify-between">
                <Folder size={40} className="text-indigo-500 dark:text-indigo-300" />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleFavorite(workspace.id)
                  }}
                  className={`${
                    workspace.isFavorite ? 'text-yellow-300 hover:text-yellow-400' : 'text-gray-400 hover:text-gray-500'
                  }`}
                >
                  {workspace.isFavorite ? <Star size={20} className="fill-current" /> : <Star size={20} className="text-gray-400 hover:text-gray-500" />}
                </button>
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-800">{workspace.name}</h3>
            </div>
          ))}
        </div>
      </main>

      {/* Create Workspace Section */}
      <form
        onSubmit={onCreateWorkspace}
        className="sticky bottom-0 bg-gray-800/90 backdrop-blur-md py-6 px-8 flex items-center justify-between"
      >
        <input
          type="text"
          value={newWorkspaceName}
          onChange={(e) => setNewWorkspaceName(e.target.value)}
          placeholder="Enter workspace name"
          required
          className="flex-1 bg-gray-200 dark:bg-gray-700 p-3 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        />
        <button
          type="submit"
          className="ml-4 bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-gray-800 font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center"
        >
          <PlusCircle size={24} className="mr-2" />
          Create Workspace
        </button>
      </form>
    </div>
  )
}

export default WorkspaceList
