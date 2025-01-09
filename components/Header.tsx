import { FC } from "react";
import { Moon, Sun, User, PlusCircle, LogOut, Menu } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  currentUser: { id: string; email: string };
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onCreateWorkspace: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  onReturnToWorkspaceSelection: () => void;
}

const Header: FC<HeaderProps> = ({
  currentUser,
  isDarkMode,
  toggleDarkMode,
  onOpenProfile,
  onLogout,
  onReturnToWorkspaceSelection,
}) => {
  return (
    <header className="relative z-10">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur-xl" />
      <div className="relative">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center py-3 md:space-x-10">
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
              <span className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
                ChatGenius
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onReturnToWorkspaceSelection}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 
                  transition-colors duration-200"
              >
                <PlusCircle size={18} />
                <span className="hidden sm:inline">Workspaces</span>
              </button>

              <div className="h-4 w-px bg-gray-300 dark:bg-gray-700" />

              <button
                onClick={toggleDarkMode}
                className="p-2 text-gray-700 dark:text-gray-300 hover:text-yellow-600 dark:hover:text-yellow-400 
                  transition-colors duration-200"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <div className="relative group">
                <button
                  onClick={onOpenProfile}
                  className="p-2 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 
                    transition-colors duration-200"
                >
                  <User size={18} />
                </button>
              </div>

              <button
                onClick={onLogout}
                className="p-2 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 
                  transition-colors duration-200"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
