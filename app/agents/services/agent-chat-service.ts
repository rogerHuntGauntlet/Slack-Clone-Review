import { createClient } from '@/utils/supabase/client'

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
    this.supabase = createClient();
  }

  setRagMode(enabled: boolean) {
    this.ragMode = enabled;
  }

  async chat(message: string, onStream?: (chunk: string) => void): Promise<AgentChatResponse> {
    try {
      console.log('🤖 Chat initiated with message:', message);
      
      // First, validate the agent exists and is active and get its metadata
      console.log('🔍 Fetching agent data for ID:', this.agentId);
      const { data: agent, error: agentError } = await this.supabase
        .from('agents')
        .select(`
          *,
          agent_files (*)
        `)
        .eq('id', this.agentId)
        .eq('is_active', true)
        .single()

      if (agentError || !agent) {
        console.error('❌ Agent error:', agentError);
        throw new Error('Agent not found or inactive')
      }

      console.log('✅ Agent found:', { 
        name: agent.name, 
        hasNamespace: !!agent.pinecone_namespace,
        fileCount: agent.agent_files?.length 
      });

      // Determine which endpoint to use based on whether Pinecone is set up and RAG mode
      let endpoint = '/api/agents/llm-chat'; // Default to LLM chat with context
      let body: any = {
        agentId: this.agentId,
        message,
        stream: !!onStream,
        agentMetadata: {
          name: agent.name,
          description: agent.description,
          configuration: agent.configuration,
          files: agent.agent_files
        }
      };

      // Try RAG if the agent has a pinecone namespace and RAG mode is enabled
      if (agent.pinecone_namespace && this.ragMode) {
        try {
          console.log('🔄 Attempting to use RAG with namespace:', agent.pinecone_namespace);
          endpoint = '/api/agents/rag-chat';
          body.pineconeNamespace = agent.pinecone_namespace;
        } catch (error) {
          console.warn('⚠️ Failed to use RAG, falling back to LLM chat:', error);
          endpoint = '/api/agents/llm-chat';
          // Keep the body with agent metadata for context-aware LLM chat
        }
      } else {
        console.log('ℹ️ Using LLM chat with context (no RAG available)');
      }

      console.log('🚀 Sending request to endpoint:', endpoint);
      
      // Call the appropriate endpoint
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',  // Always request streaming
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        body: JSON.stringify({
          ...body,
          stream: true  // Force streaming mode
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ API error:', error);
        throw new Error(error.message || 'Failed to get response from agent');
      }

      const contentType = response.headers.get('content-type');
      console.log('✅ Got response:', { 
        status: response.status,
        type: contentType,
        isStream: contentType?.includes('text/event-stream')
      });

      // If we got a regular JSON response despite requesting streaming,
      // simulate streaming for consistent UI behavior
      if (contentType?.includes('application/json')) {
        console.log('⚠️ Got JSON response, simulating stream');
        const data = await response.json();
        
        if (onStream) {
          // Format the message into paragraphs
          const paragraphs = data.message.split(/\n+/).filter(Boolean);
          
          for (const paragraph of paragraphs) {
            // Split paragraph into natural chunks by punctuation
            const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
            
            for (const sentence of sentences) {
              // Split each sentence into smaller word groups
              const words = sentence.trim().split(' ');
              const chunkSize = 4; // Send 4 words at a time for more natural flow
              
              for (let i = 0; i < words.length; i += chunkSize) {
                const chunk = words.slice(i, i + chunkSize).join(' ');
                // Add punctuation if it's the end of the sentence
                const formattedChunk = i + chunkSize >= words.length ? chunk + ' ' : chunk + ' ';
                console.log('📝 Simulating chunk:', formattedChunk);
                onStream(formattedChunk);
                // Add a small delay between chunks
                await new Promise(resolve => setTimeout(resolve, 30));
              }
            }
            
            // Add paragraph break
            if (paragraphs.length > 1) {
              onStream('\n\n');
              await new Promise(resolve => setTimeout(resolve, 100)); // Longer pause between paragraphs
            }
          }
        }

        return {
          message: data.message,
          sources: data.sources
        };
      }

      // Handle actual streaming response
      if (onStream) {
        console.log('📡 Starting stream handling');
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullMessage = '';

        if (!reader) {
          console.error('❌ No reader available for stream');
          throw new Error('Stream reader not available');
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('📡 Stream complete');
              break;
            }
            
            // Decode the chunk and add to buffer
            const chunk = decoder.decode(value, { stream: true });
            console.log('📡 Raw chunk received:', chunk);
            buffer += chunk;
            
            // Process complete SSE messages
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(5).trim(); // Remove 'data: ' prefix and whitespace
                console.log('📡 Processing data line:', data);
                
                // Check if it's the end marker
                if (data === '[DONE]') {
                  console.log('📡 Received [DONE] marker');
                  continue;
                }
                
                try {
                  // Parse the JSON data
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    fullMessage += parsed.content;
                    console.log('📝 Streaming chunk:', parsed.content);
                    // Pass just the content to the callback
                    onStream(parsed.content);
                  }
                } catch (e) {
                  // If parsing fails, try to use the data directly
                  if (data && data !== '[DONE]') {
                    fullMessage += data;
                    console.log('📝 Streaming raw chunk:', data);
                    onStream(data);
                  } else {
                    console.warn('⚠️ Error parsing SSE data:', e, 'Raw data:', data);
                  }
                }
              }
            }
          }
        } catch (streamError) {
          console.error('❌ Stream processing error:', streamError);
          throw streamError;
        }

        // Return the complete message
        console.log('✅ Streaming complete, total length:', fullMessage.length);
        return {
          message: fullMessage,
          sources: []
        };
      }

      // Handle regular response (should not happen with forced streaming)
      const data = await response.json();
      console.log('✅ Regular response received, length:', data.message.length);
      return {
        message: data.message,
        sources: data.sources
      };

    } catch (error) {
      console.error('❌ Fatal error in chat:', error);
      throw error;
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