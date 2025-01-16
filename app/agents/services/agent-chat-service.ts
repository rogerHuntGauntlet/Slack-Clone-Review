import { AgentRAGService } from './rag-service';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class AgentChatService {
  private agentId: string;
  private conversationHistory: ChatMessage[] = [];
  private isRagMode: boolean = true;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  setRagMode(enabled: boolean) {
    this.isRagMode = enabled;
  }

  async chat(message: string, onToken?: (token: string) => void) {
    try {
      // Build messages array with conversation history
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: this.isRagMode 
            ? `You are an AI agent evaluator. Analyze the user's idea and provide detailed feedback on its feasibility, potential challenges, and suggestions for improvement. Be thorough but constructive.`
            : `You are a helpful AI assistant with expertise in the domain we've been discussing. Maintain context from our conversation and provide clear, natural responses. Be concise but informative.`
        },
        ...this.conversationHistory,
        {
          role: 'user',
          content: message
        }
      ];

      let response: string;

      if (onToken) {
        // Streaming response
        const apiResponse = await fetch('/api/agents/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            stream: true,
            isRagMode: this.isRagMode
          })
        });

        if (!apiResponse.ok) throw new Error('Failed to get streaming response');

        const reader = apiResponse.body?.getReader();
        if (!reader) throw new Error('Failed to get response reader');

        let fullResponse = '';
        try {
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const text = decoder.decode(value);
            if (text) {
              fullResponse += text;
              onToken(text);
            }
          }
        } finally {
          reader.releaseLock();
        }
        response = fullResponse;
      } else {
        // Non-streaming response
        const apiResponse = await fetch('/api/agents/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            stream: false,
            isRagMode: this.isRagMode
          })
        });

        if (!apiResponse.ok) throw new Error('Failed to get response');

        const data = await apiResponse.json();
        response = data.content;
      }

      // Add the exchange to conversation history
      this.conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      );

      return response;
    } catch (error: any) {
      console.error('Error in chat service:', error);
      throw error;
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }
} 