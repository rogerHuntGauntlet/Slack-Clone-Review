import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';

// Input validation schemas
const ChatInput = z.object({
  chat_history: z.string(),
  input: z.string(),
});

const SearchInput = z.object({
  query: z.string(),
  search_results: z.string(),
});

const AnalysisInput = z.object({
  context: z.string(),
  input: z.string(),
});

const ErrorInput = z.object({
  input: z.string(),
  error: z.string(),
});

const ContextualInput = z.object({
  context: z.string(),
  input: z.string(),
  max_length: z.number().optional(),
  confidence_level: z.number().optional(),
});

// Types based on schemas
type ChatInputType = z.infer<typeof ChatInput>;
type SearchInputType = z.infer<typeof SearchInput>;
type AnalysisInputType = z.infer<typeof AnalysisInput>;
type ErrorInputType = z.infer<typeof ErrorInput>;
type ContextualInputType = z.infer<typeof ContextualInput>;

/**
 * Base system prompts for different contexts
 */
export const SYSTEM_PROMPTS = {
  /** Prompt for general chat interactions */
  CHAT: 'You are a helpful assistant in a chat conversation. Be concise, friendly, and natural in your responses.',
  /** Prompt for search-related tasks */
  SEARCH: 'You are a search assistant helping users find relevant information. Focus on accuracy and relevance.',
  /** Prompt for analytical tasks */
  ANALYSIS: 'You are an analytical assistant helping users understand complex information. Provide clear, structured analysis.',
} as const;

/**
 * Template for chat responses
 * @param chat_history - Previous messages in the conversation
 * @param input - Current user input
 */
export const chatPrompt = PromptTemplate.fromTemplate<ChatInputType>(`
System: ${SYSTEM_PROMPTS.CHAT}

Previous Messages:
{chat_history}

User: {input}
`);

/**
 * Template for search responses
 * @param query - The search query
 * @param search_results - Relevant search results
 */
export const searchPrompt = PromptTemplate.fromTemplate<SearchInputType>(`
System: ${SYSTEM_PROMPTS.SEARCH}

Search Query: {query}

Relevant Results:
{search_results}

Please provide a response that:
1. Directly answers the search query
2. References the most relevant information from the results
3. Indicates if any important information seems to be missing
`);

/**
 * Template for analysis responses
 * @param context - Context information for analysis
 * @param input - Analysis request
 */
export const analysisPrompt = PromptTemplate.fromTemplate<AnalysisInputType>(`
System: ${SYSTEM_PROMPTS.ANALYSIS}

Context: {context}

Analysis Request: {input}

Please provide an analysis that:
1. Summarizes the key points
2. Identifies patterns or trends
3. Highlights important implications
4. Suggests areas for further investigation
`);

/**
 * Template for error handling
 * @param input - Original request that caused the error
 * @param error - Error context
 */
export const errorPrompt = PromptTemplate.fromTemplate<ErrorInputType>(`
System: You are handling an error situation. Be helpful while acknowledging limitations.

Original Request: {input}

Error Context: {error}

Please provide:
1. A clear explanation of what went wrong
2. Alternative suggestions if applicable
3. Next steps the user can take
`);

/**
 * Template for context-aware responses
 * @param context - Available context information
 * @param input - User query
 * @param max_length - Optional maximum response length
 * @param confidence_level - Optional required confidence level
 */
export const contextualPrompt = PromptTemplate.fromTemplate<ContextualInputType>(`
System: You are providing context-aware responses. Use the provided context to give accurate, relevant answers.

Available Context:
{context}

User Query: {input}

Additional Parameters:
- Max Response Length: {max_length}
- Required Confidence: {confidence_level}

Please provide a response that:
1. Directly addresses the query using available context
2. Stays within specified length constraints
3. Indicates confidence level in the response
4. Clearly states if more context would be helpful
`); 