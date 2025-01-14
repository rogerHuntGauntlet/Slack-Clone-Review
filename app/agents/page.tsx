'use client';

import { useState } from 'react';
import AgentsList from '../../components/AgentsList';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Agent {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function AgentsPage() {
  const router = useRouter();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    console.log('Selected agent:', agent);
  };

  const handleBack = () => {
    router.push('/platform');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Platform
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Agents List Sidebar */}
          <div className="md:col-span-3 bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">My Agents</h2>
            <AgentsList onSelectAgent={handleSelectAgent} />
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-9 bg-gray-800 rounded-lg p-6">
            {selectedAgent ? (
              <div>
                <h2 className="text-2xl font-bold mb-4">{selectedAgent.name}</h2>
                <p className="text-gray-300">{selectedAgent.description}</p>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-12">
                <p className="text-lg">Select an agent to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 