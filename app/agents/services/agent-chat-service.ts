import { AgentRAGService } from './rag-service';
import { OpenAI } from 'openai';
import { ChatCompletionChunk } from 'openai/resources/chat';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class AgentChatService {
  private ragService: AgentRAGService;
  private context: ChatMessage[] = [];
  private agentId: string;

  constructor(agentId: string) {
    this.ragService = new AgentRAGService();
    this.agentId = agentId;
    // Add system message to set context
    this.context.push({
      role: 'system',
      content: 'You are a helpful AI assistant with access to a knowledge base. Use the provided context to answer questions accurately. If you are not sure about something, say so.'
    });
  }

  async chat(message: string, onToken?: (token: string) => void): Promise<string> {
    try {
      console.log('1. Starting chat processing in AgentChatService');
      // Get relevant context from RAG
      console.log('2. Querying RAG for context');
      const results = await this.ragService.queryAgentKnowledge(this.agentId, message);
      console.log('3. RAG results received:', results);
      
      // Format context from results
      const contextStr = results
        .map(r => `[Source: ${r.fileName}]\n${r.content}`)
        .join('\n\n');
      console.log('4. Context formatted');

      // Add context and user message
      this.context.push({
        role: 'user',
        content: `Context:\n${contextStr}\n\nQuestion: ${message}`
      });
      console.log('5. Context added to conversation');

      let response = '';

      if (onToken) {
        console.log('6. Starting streaming response');
        // Handle streaming response
        const stream = await openai.chat.completions.create({
          model: 'gpt-4-1106-preview',
          messages: this.context,
          temperature: 0.7,
          max_tokens: 500,
          stream: true
        });
        console.log('7. OpenAI stream created');

        for await (const chunk of stream) {
          const token = chunk.choices[0]?.delta?.content || '';
          if (token) {
            console.log('Token received:', token);
            onToken(token);
            response += token;
          }
        }
        console.log('8. Stream processing complete');
      } else {
        console.log('6. Starting non-streaming response');
        // Handle non-streaming response
        const completion = await openai.chat.completions.create({
          model: 'gpt-4-1106-preview',
          messages: this.context,
          temperature: 0.7,
          max_tokens: 500,
          stream: false
        });
        console.log('7. OpenAI response received');

        response = completion.choices[0].message.content || 'Sorry, I could not generate a response.';
      }

      // Add assistant's response to context
      this.context.push({
        role: 'assistant',
        content: response
      });
      console.log('9. Response added to context');

      // Keep context window manageable
      if (this.context.length > 10) {
        console.log('10. Trimming context window');
        // Keep system message and last 4 exchanges (8 messages)
        this.context = [
          this.context[0],
          ...this.context.slice(-8)
        ];
      }

      console.log('11. Chat processing complete');
      return response;
    } catch (error: any) {
      console.error('Error in AgentChatService:', error);
      throw new Error(`Failed to process chat: ${error.message}`);
    }
  }

  clearContext() {
    // Keep only the system message
    this.context = [this.context[0]];
  }
} 