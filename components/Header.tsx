import { FC, useEffect, useState } from "react";
import { Moon, Sun, User, PlusCircle, LogOut, Menu, Search } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface HeaderProps {
  currentUser: { id: string; email: string };
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onCreateWorkspace: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  onReturnToWorkspaceSelection: () => void;
  activeWorkspaceId?: string;
  onSearch: (query: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const NavButton: FC<{
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  showLabel?: boolean;
}> = ({ onClick, icon, label, showLabel = false }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="flex items-center gap-2 text-gray-400 hover:text-white p-2 rounded-lg 
    hover:bg-white/10 transition-all duration-200"
    title={label}
  >
    {icon}
    {showLabel && label && <span className="text-sm font-medium">{label}</span>}
  </motion.button>
);

const Header: FC<HeaderProps> = ({
  currentUser,
  isDarkMode,
  toggleDarkMode,
  onOpenProfile,
  onLogout,
  onReturnToWorkspaceSelection,
  activeWorkspaceId,
  onSearch,
  searchQuery,
  setSearchQuery
}) => {
  const [workspaceName, setWorkspaceName] = useState<string>("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getWorkspaceName() {
      if (!activeWorkspaceId) {
        setWorkspaceName("");
        return;
      }

      const { data } = await supabase
        .from('workspaces')
        .select('name')
        .eq('id', activeWorkspaceId)
        .single();

      if (data) {
        setWorkspaceName(data.name);
      }
    }

    getWorkspaceName();
  }, [activeWorkspaceId]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && activeWorkspaceId) {
      onSearch(searchQuery);
    }
  };

  return (
    <header className="relative z-50">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur-xl" />
      <div className="relative bg-gray-900/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="h-16 flex items-center justify-between gap-4">
            {/* Left - Workspace Name and AI Chat */}
            <div className="flex items-center space-x-4">
              <Link 
                href="/ai-chat" 
                className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 
                  shadow-lg hover:shadow-blue-500/25 hover:scale-105 transition-all duration-200"
              >
                <img
                  src="https://media.tenor.com/NeaT_0PBOzQAAAAM/robot-reaction-eww.gif"
                  alt="AI Assistant"
                  className="w-6 h-6 rounded-lg"
                />
              </Link>
              <h1 className="text-lg font-semibold text-white">
                {workspaceName || "Select a Workspace"}
                {workspaceName && <span className="text-gray-400 text-sm font-normal ml-2">Workspace</span>}
              </h1>
            </div>

            {/* Center - Search */}
            {activeWorkspaceId && (
              <div className="flex-1 max-w-xl">
                <form onSubmit={handleSubmit} className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearch}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    placeholder="Search in workspace..."
                    className={`w-full pl-10 pr-4 py-2 bg-gray-800 text-gray-200 placeholder-gray-400 rounded-lg border 
                      ${isSearchFocused ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-700'} 
                      focus:outline-none transition-all duration-200`}
                  />
                  <button type="submit" className="hidden">Search</button>
                </form>
              </div>
            )}

            {/* Right - Navigation */}
            <nav className="flex items-center space-x-2">
              <NavButton
                onClick={onReturnToWorkspaceSelection}
                icon={<PlusCircle className="w-5 h-5" />}
                label="Workspaces"
                showLabel={true}
              />
              <div className="h-6 w-px bg-white/10" />
              <NavButton
                onClick={toggleDarkMode}
                icon={isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                label={isDarkMode ? "Light Mode" : "Dark Mode"}
              />
              <NavButton
                onClick={onOpenProfile}
                icon={<User className="w-5 h-5" />}
                label="Profile"
              />
              <NavButton
                onClick={onLogout}
                icon={<LogOut className="w-5 h-5" />}
                label="Logout"
              />
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
