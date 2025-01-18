import React from 'react';
import { WebSearchAgentChatModal } from './components/WebSearchAgentChatModal';
import { WebSearchProvider } from './hooks';

interface WebSearchAgentRootProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
}

export const WebSearchAgentRoot: React.FC<WebSearchAgentRootProps> = ({
  isOpen,
  onClose,
  agentId,
}) => {
  return (
    <WebSearchProvider>
      <WebSearchAgentChatModal
        isOpen={isOpen}
        onClose={onClose}
        agentId={agentId}
      />
    </WebSearchProvider>
  );
}; 