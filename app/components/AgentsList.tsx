import { useState } from 'react';
import { AgentChatModal } from './AgentChatModal';

interface Agent {
  id: string;
  name: string;
  description: string;
  tags: string[];
  systemPrompt?: string;
}

interface AgentsListProps {
  agents: Agent[];
}

export const AgentsList: React.FC<AgentsListProps> = ({ agents }) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">My Agents</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setSelectedAgent(agent)}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 text-left"
          >
            <h3 className="text-lg font-semibold mb-2">{agent.name}</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
              {agent.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {agent.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {selectedAgent && (
        <AgentChatModal
          isOpen={true}
          onClose={() => setSelectedAgent(null)}
          agent={selectedAgent}
        />
      )}
    </div>
  );
}; 