import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface AgentMessage {
  id: string
  content: string
  role: 'user' | 'agent'
  timestamp: Date
  sources?: Array<{
    title: string
    content: string
    relevance: number
  }>
}

interface AgentChatResponse {
  message: string
  sources?: Array<{
    title: string
    content: string
    relevance: number
  }>
}

interface DatabaseMessage {
  id: string
  agent_id: string
  content: string
  role: 'user' | 'agent'
  timestamp: string
}

// Singleton instance map to reuse service instances
const serviceInstances = new Map<string, AgentChatService>();

export const getAgentChatHistory = async (agentId: string, limit: number = 50): Promise<AgentMessage[]> => {
  const service = getServiceInstance(agentId);
  return service.getChatHistory(limit);
};

export const sendMessageToAgent = async (agentId: string, message: string, onStream?: (chunk: string) => void): Promise<AgentChatResponse> => {
  const service = getServiceInstance(agentId);
  return service.chat(message, onStream);
};

// Helper to get/create service instance
const getServiceInstance = (agentId: string): AgentChatService => {
  if (!serviceInstances.has(agentId)) {
    serviceInstances.set(agentId, new AgentChatService(agentId));
  }
  return serviceInstances.get(agentId)!;
};

export class AgentChatService {
  private agentId: string;
  private supabase: any;
  private ragMode: boolean = true;

  constructor(agentId: string) {
    this.agentId = agentId;
    this.supabase = createClientComponentClient();
  }

  setRagMode(enabled: boolean) {
    this.ragMode = enabled;
  }

  async chat(message: string, onStream?: (chunk: string) => void): Promise<AgentChatResponse> {
    try {
      // First, validate the agent exists and is active
      const { data: agent, error: agentError } = await this.supabase
        .from('agents')
        .select('*')
        .eq('id', this.agentId)
        .eq('is_active', true)
        .single()

      if (agentError || !agent) {
        throw new Error('Agent not found or inactive')
      }

      // Determine which endpoint to use based on whether Pinecone is set up and RAG mode
      const endpoint = (agent.pinecone_namespace && this.ragMode)
        ? '/api/agents/rag-chat'
        : '/api/agents/chat';

      // Call the appropriate endpoint
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: this.agentId,
          message,
          pineconeNamespace: agent.pinecone_namespace,
          stream: !!onStream
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get response from agent');
      }

      // Handle streaming response
      if (onStream && response.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullMessage = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Decode the chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete SSE messages
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(5).trim(); // Remove 'data: ' prefix and whitespace
                
                // Check if it's the end marker
                if (data === '[DONE]') continue;
                
                try {
                  // Parse the JSON data
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    fullMessage += parsed.content;
                    // Pass just the content to the callback
                    onStream(parsed.content);
                  }
                } catch (e) {
                  console.warn('Error parsing SSE data:', e);
                }
              }
            }
          }
        }

        // Return the complete message
        return {
          message: fullMessage,
          sources: []
        };
      }

      // Handle regular response
      const data = await response.json();
      return {
        message: data.message,
        sources: data.sources
      };

    } catch (error) {
      console.error('Error in sendMessageToAgent:', error)
      throw error
    }
  }

  async getChatHistory(limit: number = 50): Promise<AgentMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('agent_chat_messages')
        .select('*')
        .eq('agent_id', this.agentId)
        .order('timestamp', { ascending: true })
        .limit(limit)

      if (error) throw error

      return (data as DatabaseMessage[]).map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: new Date(msg.timestamp)
      }))

    } catch (error) {
      console.error('Error fetching agent chat history:', error)
      throw error
    }
  }

  clearContext() {
    // Implement if needed
  }
} 