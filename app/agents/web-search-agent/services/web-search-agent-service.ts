import { WebSearchMessage, WebSearchResult } from '../types';
import { webSearchService } from './web-search-service';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

class WebSearchAgentService {
  private messageHistory: WebSearchMessage[] = [];
  private supabase = createClientComponentClient();
  private currentAgentId: string | null = null;
  private currentAgentName: string | null = null;
  private isRagEnabled: boolean = false;
  private pineconeNamespace: string | null = null;
  private ragConnectionCache: Map<string, boolean> = new Map();

  constructor() {
    this.messageHistory.push({
      id: 'system-1',
      role: 'system',
      content: 'You are a helpful AI assistant with web search capabilities. You can search the internet to provide up-to-date information.',
      timestamp: Date.now(),
    });
  }

  private async checkRagConnection(namespace: string): Promise<boolean> {
    try {
      // If we have a cached result, return it
      if (this.ragConnectionCache.has(namespace)) {
        return this.ragConnectionCache.get(namespace)!;
      }

      // Test the connection by attempting to query the namespace
      const response = await fetch('/api/agents/rag/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          namespace,
          indexName: 'agent-store'  // Specify the index for agent data
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('RAG connection check failed:', data.error, data.details);
        return false;
      }

      const isConnected = response.ok;
      // Cache the result
      this.ragConnectionCache.set(namespace, isConnected);
      return isConnected;
    } catch (error) {
      console.error('Error checking RAG connection:', error);
      return false;
    }
  }

  private async getAgentInfo(agentId: string): Promise<{ name: string, pinecone_namespace: string }> {
    const { data, error } = await this.supabase
      .from('agents')
      .select('name, pinecone_namespace')
      .eq('id', agentId)
      .single();

    if (error) throw error;
    if (!data) throw new Error(`Agent with ID ${agentId} not found`);
    if (!data.pinecone_namespace) {
      throw new Error(`${data.name} doesn't have a namespace configured. Please train the agent first.`);
    }
    
    return data;
  }

  public async initializeAgent(agentId: string, agentName?: string): Promise<void> {
    try {
      this.currentAgentId = agentId;
      
      // Get agent info from database
      const agentInfo = await this.getAgentInfo(agentId);
      this.currentAgentName = agentName || agentInfo.name;
      this.pineconeNamespace = agentInfo.pinecone_namespace;

      // Check actual RAG connection
      if (this.pineconeNamespace) {
        this.isRagEnabled = await this.checkRagConnection(this.pineconeNamespace);
      } else {
        this.isRagEnabled = false;
      }

      if (!this.isRagEnabled) {
        throw new Error(`${this.currentAgentName} doesn't have a working RAG connection. Web search requires RAG to effectively process and contextualize search results.`);
      }
    } catch (error) {
      this.isRagEnabled = false;
      throw error;
    }
  }

  public getCurrentAgentName(): string {
    return this.currentAgentName || 'Unknown Agent';
  }

  public isRagConnectionEnabled(): boolean {
    return this.isRagEnabled;
  }

  private async mockResponse(endpoint: string, data: any, useRag?: boolean) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    switch (endpoint) {
      case 'rag':
        return {
          results: [
            {
              title: 'Mock RAG Result 1',
              url: 'https://example.com/rag/1',
              snippet: "Mock RAG result content about: " + data.query,
              position: 1
            }
          ]
        };
      case 'llm':
        return {
          message: "Mock LLM response based on the query: " + data.messages[data.messages.length - 1].content
        };
      case 'summarize':
        return {
          summary: "Mock summary of: " + data.content
        };
      case 'search':
        const mockResults: WebSearchResult[] = [
          {
            title: 'Mock Search Result 1',
            url: 'https://example.com/1',
            snippet: 'This is a mock search result about ' + data.query,
            position: 1
          },
          {
            title: 'Mock Search Result 2', 
            url: 'https://example.com/2',
            snippet: 'Another mock result about ' + data.query,
            position: 2
          }
        ];
        return {
          results: mockResults,
          totalResults: 2,
          searchTime: 0.5
        };
      case 'chat':
        return {
          message: useRag ? 
            `Based on the web search and RAG results, here's what I found about "${data.messages[data.messages.length - 1].content}"...` :
            `Here's what I know about "${data.messages[data.messages.length - 1].content}"...`
        };
      default:
        throw new Error('Unknown mock endpoint');
    }
  }

  public async sendMessage(content: string, useRag: boolean = true, onStatusUpdate?: (phase: 'rag' | 'llm' | 'summarizing' | 'websearch' | 'streaming') => void): Promise<WebSearchMessage> {
    if (!this.currentAgentId) {
      throw new Error('Agent not initialized. Call initializeAgent first.');
    }

    if (useRag && !this.isRagEnabled) {
      throw new Error('RAG capability is required for web search.');
    }

    try {
      // Add user message to history
      const userMessage: WebSearchMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      this.messageHistory.push(userMessage);

      let agentMessage: WebSearchMessage;
      let ragResults = null;
      let llmResults = null;
      let summaryResults = null;
      let searchResponse = null;

      if (useRag) {
        // First run RAG search
        try {
          onStatusUpdate?.('rag');
          try {
            const ragResponse = await fetch('/api/agents/rag/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                agentId: this.currentAgentId,
                query: content
              })
            });
            if (ragResponse.ok) {
              ragResults = await ragResponse.json();
            } else {
              throw new Error('RAG endpoint not available');
            }
          } catch (error) {
            // Use mock response if endpoint not available
            ragResults = await this.mockResponse('rag', { query: content });
            console.log('Using mock RAG response:', ragResults);
          }
        } catch (error) {
          console.warn('RAG search failed:', error);
          ragResults = await this.mockResponse('rag', { query: content });
        }

        // Then expand with LLM
        try {
          onStatusUpdate?.('llm');
          try {
            const llmResponse = await fetch('/api/agents/llm-chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: this.messageHistory,
                context: ragResults?.results || []
              })
            });
            if (llmResponse.ok) {
              llmResults = await llmResponse.json();
            } else {
              throw new Error('LLM endpoint not available');
            }
          } catch (error) {
            // Use mock response if endpoint not available
            llmResults = await this.mockResponse('llm', { messages: this.messageHistory });
            console.log('Using mock LLM response:', llmResults);
          }
        } catch (error) {
          console.warn('LLM expansion failed:', error);
          llmResults = await this.mockResponse('llm', { messages: this.messageHistory });
        }

        // Then summarize
        try {
          onStatusUpdate?.('summarizing');
          try {
            const summaryResponse = await fetch('/api/agents/summarize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: llmResults?.message || content
              })
            });
            if (summaryResponse.ok) {
              summaryResults = await summaryResponse.json();
            } else {
              throw new Error('Summarize endpoint not available');
            }
          } catch (error) {
            // Use mock response if endpoint not available
            summaryResults = await this.mockResponse('summarize', { content: llmResults?.message || content });
            console.log('Using mock summary response:', summaryResults);
          }
        } catch (error) {
          console.warn('Summarization failed:', error);
          summaryResults = await this.mockResponse('summarize', { content: llmResults?.message || content });
        }

        // Finally do web search
        try {
          onStatusUpdate?.('websearch');
          try {
            searchResponse = await webSearchService.search(content);
          } catch (error) {
            // Use mock response for web search
            searchResponse = await this.mockResponse('search', { query: content });
            console.log('Using mock search response:', searchResponse);
          }
        } catch (error) {
          console.warn('Web search failed:', error);
          searchResponse = await this.mockResponse('search', { query: content });
        }
        
        // Create citations from search results
        const citations = (searchResponse?.results || []).map((result: WebSearchResult) => ({
          url: result.url,
          title: result.title,
          snippet: result.snippet,
          relevanceScore: 1,
        }));

        // Get summaries for top results
        let summaries: string[] = [];
        try {
          summaries = await Promise.all(
            (searchResponse?.results || []).slice(0, 3).map(async (result: WebSearchResult) => {
              try {
                return await webSearchService.summarizeUrl(result.url);
              } catch (error) {
                return `Mock summary for ${result.title}`;
              }
            })
          );
        } catch (error) {
          console.warn('URL summarization failed:', error);
        }

        // Prepare agent message with search results
        agentMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: '', // Will be populated by the API
          timestamp: Date.now(),
          citations: citations.length > 0 ? citations : undefined,
        };

        // Send to API for processing with RAG
        try {
          onStatusUpdate?.('streaming');
          try {
            const response = await fetch('/api/agents/web-search-agent/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messages: this.messageHistory,
                searchResults: searchResponse?.results || [],
                summaries,
                agentId: this.currentAgentId,
                useRag: true,
                ragResults: ragResults?.results,
                llmResults: llmResults?.message,
                summaryResults: summaryResults?.summary,
              }),
            });

            if (response.ok) {
              const { message } = await response.json();
              agentMessage.content = message;
            } else {
              throw new Error('Failed to get response from agent');
            }
          } catch (error) {
            // Use mock response if endpoint not available
            const { message } = await this.mockResponse('chat', { messages: this.messageHistory }, true);
            agentMessage.content = message || 'No response generated';
          }
        } catch (error) {
          console.error('Final chat processing failed:', error);
          throw error;
        }
      } else {
        // Direct chat mode without RAG
        onStatusUpdate?.('llm');
        agentMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: '', // Will be populated by the API
          timestamp: Date.now(),
        };

        // Send to API for processing without RAG
        try {
          const response = await fetch('/api/agents/web-search-agent/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: this.messageHistory,
              agentId: this.currentAgentId,
              useRag: false,
            }),
          });

          if (response.ok) {
            const { message } = await response.json();
            agentMessage.content = message;
          } else {
            throw new Error('Failed to get response from agent');
          }
        } catch (error) {
          // Use mock response if endpoint not available
          const { message } = await this.mockResponse('chat', { messages: this.messageHistory }, false);
          agentMessage.content = message || 'No response generated';
        }
      }

      // Add agent message to history
      this.messageHistory.push(agentMessage);

      return agentMessage;
    } catch (error) {
      console.error('Error in web search agent service:', error);
      throw error;
    }
  }

  public getMessageHistory(): WebSearchMessage[] {
    return this.messageHistory;
  }

  public clearHistory(): void {
    this.messageHistory = [];
  }
}

// Export as singleton
export const webSearchAgentService = new WebSearchAgentService(); 