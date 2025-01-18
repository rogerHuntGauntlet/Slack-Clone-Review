import { useState } from 'react';
import AgentChatModal from './AgentChatModal';
import { WebSearchAgentRoot } from '../web-search-agent/WebSearchAgentRoot';

interface AgentChatContainerProps {
  agentId: string;
  agentName: string;
  onClose: () => void;
  pineconeNamespace?: string;
}

export default function AgentChatContainer({
  agentId,
  agentName,
  onClose,
  pineconeNamespace
}: AgentChatContainerProps) {
  const [showWebSearch, setShowWebSearch] = useState(false);

  return (
    <div className="fixed inset-0 z-50">
      {/* Base layer with primary modal */}
      <div className="relative w-full h-full">
        <AgentChatModal
          agentId={agentId}
          agentName={agentName}
          onClose={onClose}
          pineconeNamespace={pineconeNamespace}
          onWebSearchClick={() => setShowWebSearch(true)}
        />
      </div>

      {/* Web search layer */}
      {showWebSearch && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm">
          <div className="relative w-full h-full flex items-center justify-center">
            <WebSearchAgentRoot
              isOpen={showWebSearch}
              onClose={() => setShowWebSearch(false)}
              agentId={agentId}
            />
          </div>
        </div>
      )}
    </div>
  );
} 