import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../services/agent-chat-service';
import ReactMarkdown from 'react-markdown';

interface AgentChatProps {
  agentId: string;
  agentName: string;
  onSendMessage: (message: string) => Promise<string>;
  isStreaming: boolean;
  streamingResponse: string;
}

export default function AgentChat({ agentId, agentName, onSendMessage, isStreaming, streamingResponse }: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Get agent response
      const response = await onSendMessage(userMessage);
      
      // Add agent response
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">{agentName}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="prose prose-sm dark:prose-invert">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isStreaming && streamingResponse && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-900">
              <div className="prose prose-sm dark:prose-invert">
                <ReactMarkdown>{streamingResponse}</ReactMarkdown>
              </div>
              <div className="flex space-x-1 mt-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || isStreaming}
          />
          <button
            type="submit"
            disabled={isLoading || isStreaming}
            className={`px-4 py-2 rounded-lg bg-blue-500 text-white font-medium ${
              isLoading || isStreaming
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-blue-600 active:bg-blue-700'
            }`}
          >
            {isLoading || isStreaming ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
} 