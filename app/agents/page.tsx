import AgentsList from '../../components/AgentsList';

export default function AgentsTestPage() {
  const handleSelectAgent = (agent: any) => {
    console.log('Selected agent:', agent);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Agents Test Page</h1>
      <div className="w-64 bg-gray-800 p-4 rounded-lg">
        <AgentsList onSelectAgent={handleSelectAgent} />
      </div>
    </div>
  );
} 