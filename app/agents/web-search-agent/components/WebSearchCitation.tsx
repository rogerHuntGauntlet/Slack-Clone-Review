import React from 'react';
import { ExternalLink, Star } from 'lucide-react';

interface WebSearchCitationProps {
  url: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  onClick?: () => void;
}

export const WebSearchCitation: React.FC<WebSearchCitationProps> = ({
  url,
  title,
  snippet,
  relevanceScore,
  onClick
}) => {
  const formattedScore = Math.round(relevanceScore * 100);
  const displayUrl = url.replace(/^https?:\/\//, '').split('/')[0];

  return (
    <div 
      className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <a 
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-medium text-blue-600 dark:text-blue-400 group-hover:underline mb-1 truncate">
              {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center">
              <ExternalLink className="w-4 h-4 mr-1" />
              {displayUrl}
            </p>
          </a>
          <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-2">
            {snippet}
          </p>
        </div>
        <div className="flex items-center text-yellow-500 dark:text-yellow-400" title={`${formattedScore}% relevant`}>
          <Star className="w-4 h-4 mr-1" />
          <span className="text-sm font-medium">{formattedScore}%</span>
        </div>
      </div>
    </div>
  );
}; 