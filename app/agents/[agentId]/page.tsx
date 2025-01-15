'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AgentChat from '../components/AgentChat';
import type { Agent } from '../types/agent-types';

export default function AgentChatPage() {
  const params = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function loadAgent() {
      try {
        const { data: agent, error } = await supabase
          .from('agents')
          .select('id, name, description, pinecone_index')
          .eq('id', params.agentId)
          .single();

        if (error) throw error;
        if (!agent) throw new Error('Agent not found');

        setAgent(agent);
      } catch (error: any) {
        console.error('Error loading agent:', error);
        setError(error.message);
      }
    }

    if (params.agentId) {
      loadAgent();
    }
  }, [params.agentId, supabase]);

  const handleSendMessage = async (message: string) => {
    try {
      console.log('1. Starting message send process:', { agentId: params.agentId, message });
      setIsStreaming(true);
      setStreamingResponse('');

      console.log('2. Making API request to /api/agents/chat');
      const response = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: params.agentId,
          message,
        }),
      });

      console.log('3. API response received:', { 
        ok: response.ok, 
        status: response.status,
        statusText: response.statusText 
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      console.log('4. Starting to read response stream');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('5. Stream reading complete');
          break;
        }

        const chunk = decoder.decode(value);
        console.log('Received chunk:', chunk);
        setStreamingResponse(prev => prev + chunk);
      }

      const finalResponse = streamingResponse;
      console.log('6. Processing complete:', { finalResponse });
      setStreamingResponse('');
      setIsStreaming(false);
      return finalResponse;

    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setIsStreaming(false);
      throw error;
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full p-4">
      <div className="max-w-4xl mx-auto h-full">
        <AgentChat
          agentId={agent.id}
          agentName={agent.name}
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          streamingResponse={streamingResponse}
        />
      </div>
    </div>
  );
} 