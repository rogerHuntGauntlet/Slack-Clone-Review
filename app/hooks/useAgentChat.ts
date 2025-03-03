import { useState, useCallback } from 'react';
import OpenAI from 'openai';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface UseAgentChatProps {
  systemPrompt: string;
}

export const useAgentChat = ({ systemPrompt }: UseAgentChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: systemPrompt }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });

  const sendMessage = useCallback(async (content: string) => {
    setIsLoading(true);
    setError(null);

    const userMessage: Message = {
      role: 'user',
      content
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [...messages, userMessage],
        temperature: 0.7,
        max_tokens: 500,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.choices[0].message.content || 'I apologize, but I could not generate a response.'
      };

      setMessages(prev => [...prev, assistantMessage]);
      return assistantMessage;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [messages, openai]);

  const resetChat = useCallback(() => {
    setMessages([{ role: 'system', content: systemPrompt }]);
    setError(null);
    setIsLoading(false);
  }, [systemPrompt]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    resetChat
  };
}; 