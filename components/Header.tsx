import { User, Moon, Sun, LogOut, ChevronLeft, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { HeaderProps } from '@/types/components'
import { useEffect } from 'react'

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
  
  console.log('Header: Rendering with props:', {
    hasCurrentUser: !!currentUser,
    activeWorkspaceId,
    isDarkMode,
    isMobile
  });

  useEffect(() => {
    console.log('Header: Active workspace ID changed to:', activeWorkspaceId);
  }, [activeWorkspaceId]);

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
        <button
          onClick={() => {
            console.log('Header: Starting navigation to RAG search');
            console.log('Header: Current activeWorkspaceId:', activeWorkspaceId);
            console.log('Header: Current user:', currentUser);
            
            if (!activeWorkspaceId) {
              console.log('Header: Navigation blocked - no active workspace ID');
              return;
            }
            
            const url = `/rag-search?workspaceId=${encodeURIComponent(activeWorkspaceId)}`;
            console.log('Header: Navigating to URL:', url);
            window.location.href = url;
          }}
          className={`flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors ${
            !activeWorkspaceId ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          disabled={!activeWorkspaceId}
          title={!activeWorkspaceId ? 'Please select a workspace first' : 'Search conversation history'}
        >
          <Search className="w-4 h-4 mr-2" />
          <span>RAG Search</span>
        </button>
        
        <button
          onClick={toggleDarkMode}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
        
        {currentUser && (
          <button
            onClick={onOpenProfile}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <User className="w-5 h-5" />
          </button>
        )}
        
        <button
          onClick={onLogout}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
