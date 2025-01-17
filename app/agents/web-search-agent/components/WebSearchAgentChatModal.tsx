'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Minimize2, Maximize2, Volume2, VolumeX } from 'lucide-react';
import { AnimatedAvatar } from '@/components/AnimatedAvatar';
import { webSearchAgentService } from '../services/web-search-agent-service';

interface WebSearchAgentChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
}

export const WebSearchAgentChatModal: React.FC<WebSearchAgentChatModalProps> = ({
  isOpen,
  onClose,
  agentId,
}) => {
  const [messages, setMessages] = useState<Array<{
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
    citations?: Array<{
      url: string;
      title: string;
      snippet: string;
      relevanceScore: number;
    }>;
  }>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<'rag' | 'llm' | 'summarizing' | 'websearch' | 'streaming' | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [avatarEmotion, setAvatarEmotion] = useState<'neutral' | 'happy' | 'thinking' | 'surprised'>('happy');
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(true);
  const [isAvatarCollapsed, setIsAvatarCollapsed] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const [isRagMode, setIsRagMode] = useState(true);
  const [isRagEnabled, setIsRagEnabled] = useState(false);
  const [agentName, setAgentName] = useState<string>('');
  const [isCheckingRag, setIsCheckingRag] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Function to scroll to bottom of chat
  const scrollToBottom = (behavior: 'auto' | 'smooth' = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize voice synthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const preferredVoice = voices.find(
            voice => 
              voice.lang.startsWith('en') && 
              (voice.name.includes('Neural') || 
               voice.name.includes('Natural') ||
               !voice.name.includes('Microsoft'))
          );
          if (preferredVoice) {
            const warmupUtterance = new SpeechSynthesisUtterance('');
            warmupUtterance.voice = preferredVoice;
            warmupUtterance.volume = 0;
            window.speechSynthesis.speak(warmupUtterance);
          }
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
      
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const speakWithWebSpeech = async (content: string, searchResults?: any[]) => {
    if (!('speechSynthesis' in window) || isMuted) return;
    
    try {
      // Get voice-friendly summary first
      const response = await fetch('/api/agents/web-search-agent/summarize-for-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, searchResults })
      });

      if (!response.ok) {
        throw new Error('Failed to get voice summary');
      }

      const { voiceSummary } = await response.json();
      if (!voiceSummary) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(voiceSummary);
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        voice => 
          voice.lang.startsWith('en') && 
          (voice.name.includes('Neural') || 
           voice.name.includes('Natural') ||
           !voice.name.includes('Microsoft'))
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        setIsAvatarSpeaking(true);
        setAvatarEmotion('happy');
      };

      utterance.onend = () => {
        setIsAvatarSpeaking(false);
        setAvatarEmotion('neutral');
      };

      utterance.onerror = () => {
        setIsAvatarSpeaking(false);
        setAvatarEmotion('neutral');
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Error in voice synthesis:', error);
      setIsAvatarSpeaking(false);
      setAvatarEmotion('neutral');
    }
  };

  // Initialize web search agent
  useEffect(() => {
    const initializeAgent = async () => {
      try {
        setIsCheckingRag(true);
        setRagError(null);
        console.log('Initializing web search agent with ID:', agentId);
        await webSearchAgentService.initializeAgent(agentId);
        setIsRagEnabled(true);
        setAgentName(webSearchAgentService.getCurrentAgentName());
        console.log('Web search agent initialized successfully:', {
          agentName: webSearchAgentService.getCurrentAgentName(),
          isRagEnabled: true
        });
      } catch (error) {
        console.error('Error initializing web search:', error);
        setIsRagEnabled(false);
        setRagError(error instanceof Error ? error.message : 'Failed to initialize web search');
      } finally {
        setIsCheckingRag(false);
      }
    };

    initializeAgent();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.speechSynthesis.cancel();
    };
  }, [agentId]);

  // Add initial greeting after initialization
  useEffect(() => {
    if (messages.length === 0 && agentName) {
      const greetingMessage = {
        id: Date.now().toString(),
        content: `Hi there! I'm ${agentName}. ${isRagEnabled ? 
          "I can help you find information from the internet or chat directly with you. Use the toggle above to switch modes." : 
          "I can chat with you about any topic you'd like."}`,
        role: 'assistant' as const,
        timestamp: new Date(),
      };
      setMessages([greetingMessage]);
      
      if (!isMuted) {
        speakWithWebSpeech(greetingMessage.content);
      }
    }
  }, [agentName, isRagEnabled, isMuted, messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user' as const,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setAvatarEmotion('thinking');
    setIsAvatarSpeaking(false);
    setCurrentSummary('');

    // Create a placeholder for the assistant's response
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage = {
      id: assistantMessageId,
      content: '',
      role: 'assistant' as const,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, assistantMessage]);
    scrollToBottom('auto');

    try {
      let response;
      if (isRagMode && isRagEnabled) {
        response = await webSearchAgentService.sendMessage(
          inputValue, 
          true,
          (phase) => {
            setLoadingPhase(phase);
            if (phase === 'summarizing') {
              setAvatarEmotion('thinking');
            } else if (phase === 'streaming') {
              setAvatarEmotion('happy');
            }
          }
        );
      } else {
        response = await webSearchAgentService.sendMessage(
          inputValue, 
          false,
          (phase) => {
            setLoadingPhase(phase);
            if (phase === 'streaming') {
              setAvatarEmotion('happy');
            }
          }
        );
      }
      
      // Update message and reset loading states immediately after getting response
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId
          ? { ...msg, content: response.content, citations: response.citations }
          : msg
      ));
      setIsLoading(false);
      setLoadingPhase(null);
      setAvatarEmotion('happy');
      scrollToBottom('smooth');

      // Start voice synthesis after updating UI
      speakWithWebSpeech(response.content, response.citations).catch(error => {
        console.error('Error in voice synthesis:', error);
        setIsAvatarSpeaking(false);
        setAvatarEmotion('neutral');
      });

    } catch (error) {
      console.error('Error in chat:', error);
      setAvatarEmotion('surprised');
      
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId
          ? {
              ...msg,
              content: error instanceof Error ? error.message : "I'm sorry, I encountered an error. Please try again."
            }
          : msg
      ));
      
      setTimeout(() => setAvatarEmotion('neutral'), 2000);
    } finally {
      // Ensure loading states are reset even if there's an error
      setIsLoading(false);
      setLoadingPhase(null);
    }
  };

  return isOpen ? (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 w-full max-w-4xl h-[80vh] rounded-lg shadow-xl flex flex-col relative">
        {/* Audio Element */}
        <audio ref={audioRef} />
        
        {/* Avatar Overlay */}
        <div 
          className={`absolute left-4 top-4 transition-all duration-300 ease-in-out ${
            isAvatarCollapsed ? 'w-16 h-16' : 'w-[200px] h-[200px]'
          }`}
        >
          <div className="relative w-full h-full">
            <div className="absolute inset-0 bg-gray-900/15 backdrop-blur-sm rounded-lg" />
            <div className="relative w-full h-full flex flex-col">
              <div className={`${isAvatarCollapsed ? 'scale-75' : 'scale-100'} transition-transform duration-300`}>
                <AnimatedAvatar 
                  speaking={isAvatarSpeaking}
                  emotion={avatarEmotion}
                />
              </div>
              {!isAvatarCollapsed && (
                <>
                  {currentSummary && (
                    <div className="mt-2 p-2 text-sm bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-sm overflow-y-auto max-h-[100px]">
                      <p className="text-gray-700 dark:text-gray-300">{currentSummary}</p>
                    </div>
                  )}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="absolute bottom-2 right-2 p-2 bg-gray-800/80 text-white rounded-full hover:bg-gray-700 transition-colors"
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                </>
              )}
            </div>
            <button
              onClick={() => setIsAvatarCollapsed(!isAvatarCollapsed)}
              className="absolute -top-2 -right-2 p-1 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors"
            >
              {isAvatarCollapsed ? (
                <Maximize2 size={14} />
              ) : (
                <Minimize2 size={14} />
              )}
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold ml-[220px]">Chat with {agentName}</h2>
          <div className="flex items-center space-x-4">
            {isCheckingRag ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent"></div>
                <span className="text-sm text-gray-500">Checking connection...</span>
              </div>
            ) : isRagEnabled && (
              <div className="flex items-center space-x-2">
                <span className="text-sm">
                  {isRagMode ? 'Web Search Mode' : 'Chat Mode'}
                </span>
                <button
                  onClick={() => setIsRagMode(!isRagMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isRagMode ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`${
                      isRagMode ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {ragError && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 rounded-md">
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                Web Search Connection Error
              </h3>
              <p className="text-red-800 dark:text-red-200">{ragError}</p>
            </div>
          )}

          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto space-y-4"
          >
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  <div className="prose dark:prose-invert">
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          message.citations ? 
                          'bg-green-500/10 text-green-600 dark:text-green-400' : 
                          'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}>
                          {message.citations ? 'Web Search' : 'Chat'}
                        </span>
                      </div>
                    )}
                    {message.content}
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-2 text-sm border-t border-gray-200 dark:border-gray-600 pt-2">
                        <p className="font-medium mb-1">Sources:</p>
                        {message.citations.map((citation, index) => (
                          <div key={index} className="mb-2">
                            <a 
                              href={citation.url}
                              target="_blank"
                              rel="noopener noreferrer" 
                              className="font-medium text-blue-500 dark:text-blue-400 hover:underline"
                            >
                              {citation.title}
                            </a>
                            <p className="text-gray-600 dark:text-gray-400">
                              {citation.snippet}
                            </p>
                            <p className="text-gray-500 dark:text-gray-500 text-sm">
                              Relevance: {Math.round(citation.relevanceScore * 100)}%
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex flex-col space-y-2">
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                    {loadingPhase === 'rag' && (
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          Running RAG search...
                        </span>
                      </div>
                    )}
                    {loadingPhase === 'llm' && (
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          Expanding with LLM search...
                        </span>
                      </div>
                    )}
                    {loadingPhase === 'summarizing' && (
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          Summarizing for clarity...
                        </span>
                      </div>
                    )}
                    {loadingPhase === 'websearch' && (
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                        <span className="text-sm text-blue-600 dark:text-blue-400">
                          Conducting web search...
                        </span>
                      </div>
                    )}
                    {loadingPhase === 'streaming' && (
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                        <span className="text-sm text-blue-600 dark:text-blue-400">
                          Generating response...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="mt-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-2 border dark:border-gray-600 rounded-lg bg-transparent"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  ) : null;
}; 