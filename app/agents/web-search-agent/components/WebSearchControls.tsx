import React from 'react';
import { Settings, Image, Shield, Search } from 'lucide-react';
import { WebSearchSettings } from '../types';

interface WebSearchControlsProps {
  settings: WebSearchSettings;
  onSettingsChange: (settings: Partial<WebSearchSettings>) => void;
  isLoading?: boolean;
  onSearch?: () => void;
}

export const WebSearchControls: React.FC<WebSearchControlsProps> = ({
  settings,
  onSettingsChange,
  isLoading,
  onSearch
}) => {
  return (
    <div className="space-y-4">
      {/* Search Engine Selection */}
      <div className="flex items-center justify-between">
        <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
          <Search className="w-4 h-4 mr-2" />
          Search Engine
        </label>
        <select
          value={settings.searchEngine}
          onChange={(e) => onSettingsChange({ searchEngine: e.target.value as 'google' | 'bing' })}
          className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          disabled={isLoading}
        >
          <option value="google">Google</option>
          <option value="bing">Bing</option>
        </select>
      </div>

      {/* Results Limit */}
      <div className="flex items-center justify-between">
        <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
          <Settings className="w-4 h-4 mr-2" />
          Max Results
        </label>
        <input
          type="number"
          min="1"
          max="20"
          value={settings.maxResults}
          onChange={(e) => onSettingsChange({ maxResults: parseInt(e.target.value) || 5 })}
          className="w-20 px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          disabled={isLoading}
        />
      </div>

      {/* Toggle Settings */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
            <Image className="w-4 h-4 mr-2" />
            Include Images
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.includeImages}
              onChange={(e) => onSettingsChange({ includeImages: e.target.checked })}
              className="sr-only peer"
              disabled={isLoading}
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
            <Shield className="w-4 h-4 mr-2" />
            Safe Mode
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.safeModeEnabled}
              onChange={(e) => onSettingsChange({ safeModeEnabled: e.target.checked })}
              className="sr-only peer"
              disabled={isLoading}
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Search Button */}
      {onSearch && (
        <button
          onClick={onSearch}
          disabled={isLoading}
          className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Search className="w-4 h-4" />
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      )}
    </div>
  );
}; 