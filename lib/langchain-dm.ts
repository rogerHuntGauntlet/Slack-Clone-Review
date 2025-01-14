import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';
import { createContextualChain, truncateContext, createLLM } from './llm';

// Maximum number of previous messages to include as context
const MAX_CONTEXT_MESSAGES = 10;

// System prompt for the DM assistant
const DM_SYSTEM_PROMPT = `You are a helpful AI assistant in a direct messaging conversation.
You should be friendly but professional, and help users with their questions and tasks.
Base your responses on the conversation history when relevant, and maintain a consistent tone throughout the conversation.
If you don't know something or aren't sure, be honest about it.`;

// Interface for message history
interface MessageHistory {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Process a new message with conversation context
export async function processDMMessage(
  message: string,
  history: MessageHistory[],
  onToken?: (token: string) => void
): Promise<string> {
  // Prepare conversation context
  const recentHistory = history.slice(-MAX_CONTEXT_MESSAGES);
  const contextString = recentHistory
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');
  
  // Create a contextual chain with streaming if needed
  const chain = createContextualChain(DM_SYSTEM_PROMPT);
  
  // Setup streaming configuration if callback provided
  const streamingConfig = onToken ? {
    callbacks: [{
      handleLLMNewToken: onToken
    }]
  } : undefined;

  try {
    // Process message with context
    const truncatedContext = await truncateContext(contextString);
    const response = await chain.invoke({
      input: message,
      context: truncatedContext
    }, streamingConfig);

    return response;
  } catch (error) {
    console.error('Error processing DM:', error);
    throw error;
  }
}

// Helper to format messages for the AI
export function formatMessageHistory(messages: any[]): MessageHistory[] {
  return messages.map(msg => ({
    role: msg.user_id === '00000000-0000-0000-0000-000000000001' ? 'assistant' : 'user',
    content: msg.content,
    timestamp: msg.created_at
  }));
}

// Get a suggested response based on the current conversation
export async function getSuggestedResponse(
  history: MessageHistory[]
): Promise<string> {
  const suggestionPrompt = PromptTemplate.fromTemplate(`
Based on this conversation history, suggest a question or message that the USER could ask next:

{context}

Suggest a brief, natural follow-up question or message that the user might want to ask the AI assistant.
Keep it concise and conversational, as if the user is chatting casually.
Focus on questions that would naturally continue the conversation or explore related topics.
`);

  const chain = RunnableSequence.from([
    suggestionPrompt,
    createLLM(),
    new StringOutputParser()
  ]);

  const contextString = history
    .slice(-3) // Only use last 3 messages for suggestions
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  try {
    const truncatedContext = await truncateContext(contextString);
    const suggestion = await chain.invoke({
      context: truncatedContext
    });
    
    // Clean up the suggestion to remove any prefixes like "You could ask: " or "User: "
    return suggestion.replace(/^(You could ask:|User:|Suggested question:|Q:|A:)\s*/i, '').trim();
  } catch (error) {
    console.error('Error getting suggestion:', error);
    return '';
  }
} 