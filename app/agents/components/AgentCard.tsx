import { Agent } from '../types/agent-types';
import Link from 'next/link';
import { useState } from 'react';
import { PowerIcon, TrashIcon, DocumentIcon, PencilIcon } from '@heroicons/react/24/outline';

interface AgentCardProps {
  agent: Agent;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onEdit: (agent: Agent) => void;
}

export default function AgentCard({ agent, onDelete, onToggleActive, onEdit }: AgentCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getStatusInfo = (agent: Agent) => {
    // Check for various states in order of priority
    if (!agent.trainingFiles || agent.trainingFiles.length === 0) {
      return {
        message: 'Waiting for files to be uploaded',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-400/10'
      };
    }

    // Check for errors in the agent's configuration or status
    if (!agent.isActive) {
      return {
        message: 'Inactive',
        color: 'text-gray-400',
        bgColor: 'bg-gray-400/10'
      };
    }

    // Format dates
    const lastUpdated = new Date(agent.updatedAt);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return {
        message: `Updated ${diffHours}h ago`,
        color: 'text-green-400',
        bgColor: 'bg-green-400/10'
      };
    }

    const diffDays = Math.floor(diffHours / 24);
    return {
      message: `Updated ${diffDays}d ago`,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10'
    };
  };

  const status = getStatusInfo(agent);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-medium text-white">{agent.name}</h3>
            <p className="text-sm text-gray-400 mt-1">{agent.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(agent)}
              className="p-1.5 rounded-md bg-gray-700 text-blue-400 hover:bg-gray-600 transition-colors"
              title="Edit agent"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => onToggleActive(agent.id, !agent.isActive)}
              className={`p-1.5 rounded-md transition-colors ${
                agent.isActive 
                  ? 'bg-green-400/10 text-green-400 hover:bg-green-400/20' 
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              title={agent.isActive ? 'Deactivate agent' : 'Activate agent'}
            >
              <PowerIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-md bg-gray-700 text-gray-400 hover:bg-gray-600 transition-colors"
              title="Delete agent"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {agent.tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-400"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-sm ${status.color} ${status.bgColor}`}>
          {status.message}
        </div>

        {/* Training Files Summary */}
        {agent.trainingFiles.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-sm text-gray-400">Training Files</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {agent.trainingFiles.map((file, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-700 text-gray-300 text-xs"
                >
                  <DocumentIcon className="h-3 w-3" />
                  {file.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-white mb-4">Delete Agent?</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete this agent? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(agent.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 