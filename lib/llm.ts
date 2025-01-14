import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';
import type { TiktokenModel } from '@dqbd/tiktoken';

// Types for chain inputs/outputs
export interface ChainInput {
  input: string;
  context?: string;
  systemPrompt?: string;
}

export interface ChainOutput {
  response: string;
  tokenCount: number;
}

// Maximum number of tokens to use for context
const MAX_CONTEXT_TOKENS = 4000;

// Initialize the LLM with streaming capabilities
export const createLLM = () => {
  console.log('[LLM] Creating LLM instance...');
  try {
    if (typeof window !== 'undefined') {
      // Client-side: Get API key from environment variable
      if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
        console.error('[LLM] OpenAI API key not found in client environment');
        throw new Error('OpenAI API key not found in environment variables');
      }
      console.log('[LLM] Creating client-side LLM instance');
      return new ChatOpenAI({
        modelName: 'gpt-4-turbo-preview',
        temperature: 0.7,
        streaming: true,
        maxTokens: 1000,
        openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      });
    }
    
    // Server-side: Use server-side environment variable
    if (!process.env.OPENAI_API_KEY) {
      console.error('[LLM] OpenAI API key not found in server environment');
      throw new Error('OpenAI API key not found in environment variables');
    }
    console.log('[LLM] Creating server-side LLM instance');
    return new ChatOpenAI({
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.7,
      streaming: true,
      maxTokens: 1000,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  } catch (error) {
    console.error('[LLM] Error creating LLM instance:', error);
    if (error instanceof Error) {
      console.error('[LLM] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    throw error;
  }
};

// Create a basic prompt template
const defaultPromptTemplate = PromptTemplate.fromTemplate<ChainInput>(`
You are a helpful AI assistant. Please respond to the following:

{input}

Please provide a clear and concise response.
`);

// Create a basic chain that can be reused
export const createDefaultChain = () => {
  console.log('[LLM] Creating default chain...');
  try {
    const chain = RunnableSequence.from([
      defaultPromptTemplate,
      createLLM(),
      new StringOutputParser(),
    ]);
    console.log('[LLM] Default chain created successfully');
    return chain;
  } catch (error) {
    console.error('[LLM] Error creating default chain:', error);
    throw error;
  }
};

// Helper function for accurate token counting
export async function countTokens(text: string, model: string = 'gpt-4'): Promise<number> {
  console.log('[LLM] Counting tokens for text length:', text.length);
  try {
    const { encoding_for_model } = await import('@dqbd/tiktoken');
    const enc = encoding_for_model(model as TiktokenModel);
    const tokens = enc.encode(text);
    const count = tokens.length;
    enc.free();
    console.log('[LLM] Token count:', count);
    return count;
  } catch (error) {
    console.warn('[LLM] Error counting tokens, falling back to estimate:', error);
    const estimate = Math.ceil(text.length / 4);
    console.log('[LLM] Estimated token count:', estimate);
    return estimate;
  }
}

// Helper function to truncate context if needed
export async function truncateContext(
  context: string,
  maxTokens = MAX_CONTEXT_TOKENS,
  model: string = 'gpt-4'
): Promise<string> {
  console.log('[LLM] Checking context length...');
  const tokenCount = await countTokens(context, model);
  if (tokenCount <= maxTokens) {
    console.log('[LLM] Context within token limit');
    return context;
  }
  
  console.log('[LLM] Context exceeds token limit, truncating...');
  try {
    const { encoding_for_model } = await import('@dqbd/tiktoken');
    const enc = encoding_for_model(model as TiktokenModel);
    const tokens = enc.encode(context);
    const truncatedTokens = tokens.slice(0, maxTokens);
    const truncatedText = enc.decode(truncatedTokens);
    enc.free();
    console.log('[LLM] Context truncated successfully');
    return truncatedText + '...';
  } catch (error) {
    console.warn('[LLM] Error truncating with tokens, falling back to character-based:', error);
    const ratio = maxTokens / tokenCount;
    const truncateLength = Math.floor(context.length * ratio);
    const truncatedText = context.slice(0, truncateLength) + '...';
    console.log('[LLM] Context truncated using character-based method');
    return truncatedText;
  }
}

// Create a custom chain with context window management
export function createContextualChain(systemPrompt: string) {
  console.log('[LLM] Creating contextual chain...');
  try {
    const contextualPrompt = PromptTemplate.fromTemplate<ChainInput>(`
System: ${systemPrompt}

Context: {context}

User: {input}

Please provide a clear and concise response based on the context provided.
`);

    const chain = RunnableSequence.from([
      contextualPrompt,
      createLLM(),
      new StringOutputParser(),
    ]);
    console.log('[LLM] Contextual chain created successfully');
    return chain;
  } catch (error) {
    console.error('[LLM] Error creating contextual chain:', error);
    throw error;
  }
}

// Fallback handler for when the main LLM fails
export async function handleLLMError(error: Error, input: string): Promise<string> {
  console.error('[LLM] Primary model failed:', error);
  console.log('[LLM] Attempting fallback with GPT-3.5...');
  
  try {
    // Create a more conservative fallback LLM
    const fallbackLLM = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0.3,
      maxTokens: 2000,
      openAIApiKey: typeof window !== 'undefined' 
        ? process.env.NEXT_PUBLIC_OPENAI_API_KEY 
        : process.env.OPENAI_API_KEY,
    });

    const fallbackPrompt = PromptTemplate.fromTemplate<{ input: string }>(`
Something went wrong with the primary AI model. As a fallback, please provide a basic response to:

{input}

Keep the response simple and conservative.
`);

    const fallbackChain = RunnableSequence.from([
      fallbackPrompt,
      fallbackLLM,
      new StringOutputParser(),
    ]);

    console.log('[LLM] Invoking fallback chain...');
    const response = await fallbackChain.invoke({ input });
    console.log('[LLM] Fallback response generated successfully');
    return response;
  } catch (fallbackError) {
    console.error('[LLM] Fallback model also failed:', fallbackError);
    if (fallbackError instanceof Error) {
      console.error('[LLM] Fallback error details:', {
        message: fallbackError.message,
        stack: fallbackError.stack,
        name: fallbackError.name
      });
    }
    return 'I apologize, but I am currently unable to process your request. Please try again later.';
  }
} 