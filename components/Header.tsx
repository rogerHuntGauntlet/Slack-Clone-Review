import { User, Moon, Sun, LogOut, ChevronLeft, Search, MapPin, CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { HeaderProps } from '@/types/components'
import { useEffect, useState, useCallback } from 'react'
import { RoadmapModal } from './RoadmapModal'

interface SearchResult {
  id: string;
  content: string;
  channel_id: string;
  user_id: string;
  channels: {
    id: string;
    name: string;
  };
  user_profiles: {
    username: string;
    email: string;
  };
  created_at: string;
}

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
  onMenuToggle,
  workspaceName,
  onSearchResultClick,
  onOpenRoadmap
}: HeaderProps) {
  const router = useRouter()
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false)

  const debouncedSearch = useCallback(async (query: string) => {
    if (query.trim()) {
      setIsSearching(true)
      const results = await onSearch(query)
      setSearchResults(results)
      setIsSearching(false)
      setShowResults(true)
    } else {
      setSearchResults([])
      setShowResults(false)
    }
  }, [onSearch])

  useEffect(() => {
    const timer = setTimeout(() => {
      debouncedSearch(searchQuery)
    }, 1000)

    return () => clearTimeout(timer)
  }, [searchQuery, debouncedSearch])

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const searchContainer = document.getElementById('search-container')
      if (searchContainer && !searchContainer.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleHordeClick = () => {
    router.push('/horde');
  };

  const handleBuyToken = () => {
    window.open('https://pump.fun/coin/4KDMEPoyuQVcLs6n6GUpAPM7dhrmsQxYHmJ7uckwpump', '_blank');
  };

  return (
    <>
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
              <span>Back</span>
            </button>
          )}
          {workspaceName && (
            <div className="ml-4 flex items-center">
              <span className="text-lg font-semibold text-gray-800 dark:text-white">{workspaceName}</span>
            </div>
          )}
        </div>

        {/* Search Bar */}
        {typeof onSearch === 'function' && searchQuery !== undefined && setSearchQuery && (
          <div id="search-container" className="flex-1 max-w-xl mx-4 relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50">
                {searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <div
                      key={result.id}
                      onClick={() => {
                        onSearchResultClick(result);
                        setShowResults(false);
                      }}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-0"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          #{result.channels.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(result.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{result.content}</p>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        by {result.user_profiles.username || result.user_profiles.email}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No results found
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              if (!activeWorkspaceId) {
                return;
              }
              const url = `/rag-search?workspaceId=${encodeURIComponent(activeWorkspaceId)}`;
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

          <button onClick={handleBuyToken} className="flex items-center gap-2 px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-md">
            <CreditCard className="w-4 h-4" /> Buy Token
          </button>
          
          <button onClick={() => setIsRoadmapOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-md">
            <MapPin className="w-4 h-4" /> Roadmap
          </button>

          <button onClick={handleHordeClick} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md">
            Join X Horde
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
          
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>
      
      <RoadmapModal 
        isOpen={isRoadmapOpen}
        onCloseAction={() => setIsRoadmapOpen(false)}
        projectId="e891a97d-fd7c-47d0-9a5e-16e99c906f5b"
        projectName="Roadmap"
        userRole={currentUser?.username || currentUser?.email || 'User'}
        onSubmitAction={async (ticketData) => {
          // TODO: Add submission logic
          console.log('Submitting roadmap ticket:', ticketData);
          setIsRoadmapOpen(false);
        }}
      />
    </>
  )
}
