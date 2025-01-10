import { FC, useEffect, useState } from "react";
import { Moon, Sun, User, PlusCircle, LogOut } from 'lucide-react';
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
  activeWorkspaceId
}) => {
  const [workspaceName, setWorkspaceName] = useState<string>("");
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
        console.log('Found workspace:', data);
        setWorkspaceName(data.name);
      }
    }

    console.log('Fetching workspace name for ID:', activeWorkspaceId);
    getWorkspaceName();
  }, [activeWorkspaceId]);

  return (
    <header className="relative z-50">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10" />
      
      <div className="relative bg-gray-900/95 backdrop-blur-xl border-b border-white/10">
        <div className="h-16 flex items-center justify-between">
          {/* Left - Workspace Name */}
          <div className="pl-5">
            <h1 className="text-lg font-semibold text-white">
              {workspaceName || "Select a Workspace"}
              {workspaceName && <span className="text-gray-400 text-sm font-normal ml-2">Workspace</span>}
            </h1>
          </div>

          {/* Right - Icons */}
          <nav className="flex items-center">
            <Link 
              href="/ai-chat" 
              className="relative group p-2"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative z-10 flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-pink-500 p-0.5"
              >
                <div className="w-full h-full bg-gray-900 rounded-md flex items-center justify-center">
                  <img
                    src="https://media.tenor.com/NeaT_0PBOzQAAAAM/robot-reaction-eww.gif"
                    alt="AI Assistant"
                    className="w-5 h-5 rounded"
                  />
                </div>
              </motion.div>
            </Link>
            <NavButton
              onClick={onReturnToWorkspaceSelection}
              icon={<PlusCircle className="w-5 h-5" />}
              label="New Workspace"
            />
            <NavButton
              onClick={onOpenProfile}
              icon={<User className="w-5 h-5" />}
              label="Profile"
            />
            <NavButton
              onClick={toggleDarkMode}
              icon={isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              label={isDarkMode ? "Light Mode" : "Dark Mode"}
            />
            <div className="w-px h-6 bg-white/10 mx-1" />
            <NavButton
              onClick={onLogout}
              icon={<LogOut className="w-5 h-5" />}
              label="Logout"
            />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
