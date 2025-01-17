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

export async function sendMessageToAgent(
  agentId: string,
  message: string,
  pineconeNamespace?: string,
  onStream?: (chunk: string) => void
): Promise<AgentChatResponse> {
  const supabase = createClientComponentClient()

  try {
    // First, validate the agent exists and is active
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('is_active', true)
      .single()

    if (agentError || !agent) {
      throw new Error('Agent not found or inactive')
    }

    // Determine which endpoint to use based on whether Pinecone is set up
    const endpoint = agent.pinecone_namespace
      ? '/api/agents/rag-chat'
      : '/api/agents/chat';

    // Call the appropriate endpoint
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId,
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

export async function getAgentChatHistory(
  agentId: string,
  limit: number = 50
): Promise<AgentMessage[]> {
  const supabase = createClientComponentClient()

  try {
    const { data, error } = await supabase
      .from('agent_chat_messages')
      .select('*')
      .eq('agent_id', agentId)
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