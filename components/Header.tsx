import { User, Moon, Sun, LogOut, ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { HeaderProps } from '@/types/components'

export default function Header({
  currentUser,
  isDarkMode,
  toggleDarkMode,
  onCreateWorkspace,
  onOpenProfile,
  onLogout,
  onReturnToWorkspaceSelection,
  activeWorkspaceId,
  onSearch,
  searchQuery,
  setSearchQuery,
  isMobile,
  onMenuToggle
}: HeaderProps) {
  const router = useRouter()

  return (
    <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {isMobile && onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        )}
        
        {activeWorkspaceId && (
          <button
            onClick={onReturnToWorkspaceSelection}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            <span>Back to Workspaces</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      {onSearch && searchQuery !== undefined && setSearchQuery && (
        <div className="flex-1 max-w-xl mx-4">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSearch(searchQuery)}
            className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div className="flex items-center space-x-4">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={onOpenProfile}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <User className="w-5 h-5" />
            <span>{currentUser.username || currentUser.email}</span>
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
