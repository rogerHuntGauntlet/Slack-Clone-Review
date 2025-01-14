'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AgentsListProps {
  onSelectAgent: (agent: Agent) => void;
}

export default function AgentsList({ onSelectAgent }: AgentsListProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/agents');
        const data = await response.json();
        if (response.ok) {
          setAgents(data);
        } else {
          console.error('Failed to fetch agents:', data.error);
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, []);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center w-full px-2 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 mr-1" />
        ) : (
          <ChevronRight className="w-4 h-4 mr-1" />
        )}
        <span>AI Agents</span>
      </button>

      {isExpanded && (
        <div className="mt-1 space-y-1">
          {isLoading ? (
            <div className="px-4 py-2 text-sm text-gray-400">Loading...</div>
          ) : agents.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-400">No agents available</div>
          ) : (
            agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => onSelectAgent(agent)}
                className="flex items-center w-full px-4 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded"
              >
                <span className="w-2 h-2 mr-2 bg-green-500 rounded-full"></span>
                {agent.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
} 