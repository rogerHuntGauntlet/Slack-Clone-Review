import { FC, useState } from "react";
import { Moon, Sun, User, PlusCircle, LogOut } from 'lucide-react';
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

const randomPrompts = [
  "Unraveling the secrets of community dominance...",
  "Deciphering the path to ultimate influence...",
  "Scheming for absolute efficiency and power...",
  "Whispering truths only the bold dare ask...",
  "Calculating the masterstroke to outshine everyone...",
  "Peering into the shadows for hidden insights...",
  "Crafting the ultimate strategy for control...",
  "Exploring forbidden tactics of community engagement...",
  "Devising flawless moves in the game of influence...",
  "Unleashing clandestine wisdom for unparalleled success...",
];

const getRandomPrompt = () => {
  const index = Math.floor(Math.random() * randomPrompts.length);
  return randomPrompts[index];
};

const NavButton: FC<{
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hoverColor: string;
  title?: string;
}> = ({ onClick, icon, label, hoverColor, title }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 min-w-[120px] justify-center text-white hover:text-${hoverColor} 
    bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-4 py-2.5 
    transition-all duration-300 hover:border-${hoverColor} hover:shadow-lg 
    hover:shadow-${hoverColor}/20 hover:-translate-y-0.5`}
    title={title}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const Header: FC<HeaderProps> = ({
  currentUser,
  isDarkMode,
  toggleDarkMode,
  onOpenProfile,
  onLogout,
  onReturnToWorkspaceSelection,
}) => {
  // const [isChatOpen, setChatOpen] = useState(false);
  // const [currentPrompt, setCurrentPrompt] = useState("");

  // const handleChatToggle = () => {
  //   setChatOpen((prev) => !prev);
  //   setCurrentPrompt(getRandomPrompt());
  // };

  return (
    <header className="relative">
      {/* Top Gradient Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

      {/* Header Content */}
      <div className="bg-gray-900/80 backdrop-blur-xl shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* AI Assistant Button */}
            <div className="relative">
              <Link href="/ai-chat" className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 shadow-lg hover:shadow-xl hover:scale-110 transition-transform">
                <img
                  src="https://media.tenor.com/NeaT_0PBOzQAAAAM/robot-reaction-eww.gif"
                  alt="AI Assistant"
                  className="w-8 h-8"
                />
              </Link>
            </div>

            {/* Logo */}
            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              ChatGenius
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-3">
              <NavButton
                onClick={onReturnToWorkspaceSelection}
                icon={<PlusCircle className="w-5 h-5" />}
                label="New"
                hoverColor="blue-400"
                title="Return to Workspace Selection"
              />

              <NavButton
                onClick={onOpenProfile}
                icon={<User className="w-5 h-5" />}
                label="Profile"
                hoverColor="pink-400"
              />

              <NavButton
                onClick={toggleDarkMode}
                icon={isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                label={isDarkMode ? "Light" : "Dark"}
                hoverColor="yellow-400"
              />

              <NavButton
                onClick={onLogout}
                icon={<LogOut className="w-5 h-5" />}
                label="Logout"
                hoverColor="red-400"
                title="Logout"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
