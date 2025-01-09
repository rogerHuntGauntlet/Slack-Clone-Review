import React, { useState } from 'react';
import { Search, Maximize2, Minimize2, Hash, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ChatHeaderProps {
  channelName: string;
  isDM: boolean;
  onSearchResult: (result: SearchResult) => void;
  userWorkspaces: string[];
  onToggleExpand?: () => void;
  isExpanded?: boolean;
}

export interface SearchResult {
  channelId: string;
  messageId: string;
  content: string;
  sender: string;
  timestamp: string;
  channelName: string;
}

interface SearchQueryResult {
  channel: string
  id: string
  content: string
  created_at: string
  user: { username: string }
  channels: { name: string }
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  channelName, 
  isDM, 
  onSearchResult, 
  userWorkspaces,
  onToggleExpand,
  isExpanded = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          channel,
          user:users!messages_user_id_fkey (username),
          channels!inner (id, name, workspace_id)
        `)
        .textSearch('content', searchQuery)
        .filter('channels.workspace_id', 'in', `(${userWorkspaces.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const results: SearchResult[] = data.map((item: SearchQueryResult) => ({
        channelId: item.channel,
        messageId: item.id,
        content: item.content,
        sender: item.user.username,
        timestamp: new Date(item.created_at).toLocaleString(),
        channelName: item.channels.name,
      }));

      results.forEach(result => onSearchResult(result));
    } catch (error) {
      console.error('Error searching messages:', error);
    }
  };

  return (
    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm px-6 py-3 flex items-center gap-4 border-b border-gray-200/50 dark:border-gray-700/50">
      <div className="flex items-center gap-2 min-w-[200px]">
        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
          {isDM ? (
            <Users className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          ) : (
            <Hash className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          )}
        </div>
        <div>
          <h2 className="text-base font-medium text-gray-900 dark:text-white">
            {isDM ? channelName : `#${channelName}`}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isDM ? "Direct Message" : "Channel"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative group">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className={`w-full pl-10 pr-4 py-2 rounded-full border transition-all duration-200
              ${isSearchFocused 
                ? 'border-blue-500 bg-white dark:bg-gray-700 shadow-sm' 
                : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'}
              text-gray-900 dark:text-white focus:outline-none`}
          />
          <Search 
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200
              ${isSearchFocused 
                ? 'text-blue-500' 
                : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'}`} 
            size={18} 
          />
        </div>
      </form>

      {onToggleExpand && (
        <button
          onClick={onToggleExpand}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 
            dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <Minimize2 size={18} />
          ) : (
            <Maximize2 size={18} />
          )}
        </button>
      )}
    </div>
  );
};

export default ChatHeader;
