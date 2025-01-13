import React, { useState } from 'react';
import { Search, Hash, Users, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ErrorBoundary from './ui/ErrorBoundary';

export interface SearchResult {
  channelId: string;
  messageId: string;
  content: string;
  sender: string;
  timestamp: string;
  channelName: string;
}

interface ChatHeaderProps {
  channelName: string;
  memberCount: number;
  onSettingsClick: () => void;
  isMobile?: boolean;
}

export default function ChatHeader({ channelName, memberCount, onSettingsClick, isMobile }: ChatHeaderProps) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <ErrorBoundary fallback={
      <div className="p-4 border-b">
        <p className="text-red-600">Chat header is currently unavailable.</p>
      </div>
    }>
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
        <ErrorBoundary fallback={
          <div className="p-2">
            <p className="text-yellow-600">Channel info is unavailable.</p>
          </div>
        }>
          <div className="flex items-center space-x-2 min-w-0">
            <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
            <h2 className="text-base sm:text-lg font-semibold truncate">{channelName}</h2>
            <div className="flex items-center space-x-1 text-gray-500">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">{memberCount}</span>
            </div>
          </div>
        </ErrorBoundary>

        <ErrorBoundary fallback={
          <div className="p-2">
            <p className="text-yellow-600">Channel settings button is unavailable.</p>
          </div>
        }>
          <div className="flex items-center space-x-2">
            {isMobile && (
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <Search className="w-5 h-5 text-gray-500" />
              </button>
            )}
            <button
              onClick={onSettingsClick}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            </button>
          </div>
        </ErrorBoundary>
      </div>
      
      {/* Mobile Search Bar */}
      {isMobile && showSearch && (
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <input
              type="text"
              placeholder="Search messages..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}
