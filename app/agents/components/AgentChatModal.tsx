'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Minimize2, Maximize2, Volume2, VolumeX } from 'lucide-react'
import { AnimatedAvatar } from '@/components/AnimatedAvatar'
import { sendMessageToAgent, getAgentChatHistory } from '../services/agent-chat-service'
import { WebSearchAgentChatModal } from '../web-search-agent/components/WebSearchAgentChatModal'

interface AgentChatModalProps {
  agentId: string
  agentName: string
  onClose: () => void
  pineconeNamespace?: string
}

export default function AgentChatModal({ 
  agentId, 
  agentName,
  onClose,
  pineconeNamespace 
}: AgentChatModalProps) {
  const [messages, setMessages] = useState<Array<{
    id: string
    content: string
    role: 'user' | 'agent'
    timestamp: Date
    sources?: Array<{
      title: string
      content: string
      relevance: number
    }>
  }>>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState<'rag' | 'llm' | 'streaming' | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [avatarEmotion, setAvatarEmotion] = useState<'neutral' | 'happy' | 'thinking' | 'surprised'>('happy')
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(true)
  const [isAvatarCollapsed, setIsAvatarCollapsed] = useState(false)
  const [currentSummary, setCurrentSummary] = useState<string>('')
  const [isMuted, setIsMuted] = useState(false)
  const [showWebSearchModal, setShowWebSearchModal] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

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
    // Pre-initialize speech synthesis
    if ('speechSynthesis' in window) {
      // Load voices
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          // Find and pre-select a good voice
          const preferredVoice = voices.find(
            voice => 
              voice.lang.startsWith('en') && 
              (voice.name.includes('Neural') || 
               voice.name.includes('Natural') ||
               !voice.name.includes('Microsoft'))
          );
          if (preferredVoice) {
            console.log('🎤 Pre-selected voice:', preferredVoice.name);
            // Create and speak a silent utterance to initialize the engine
            const warmupUtterance = new SpeechSynthesisUtterance('');
            warmupUtterance.voice = preferredVoice;
            warmupUtterance.volume = 0;
            window.speechSynthesis.speak(warmupUtterance);
          }
        }
      };

      // Load voices immediately if available
      loadVoices();
      
      // Also handle async voice loading
      window.speechSynthesis.onvoiceschanged = loadVoices;
      
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const speakWithWebSpeech = async (text: string) => {
    if (!('speechSynthesis' in window) || isMuted) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Split text into smaller chunks for more responsive speech
    const chunks = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    for (const chunk of chunks) {
      const utterance = new SpeechSynthesisUtterance(chunk.trim());
      
      // Customize voice settings
      utterance.rate = 1.1;  // Slightly faster
      utterance.pitch = 1.0; // Normal pitch
      utterance.volume = 1.0; // Full volume
      
      // Try to find a good voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        voice => 
          voice.lang.startsWith('en') && // English voices
          (voice.name.includes('Neural') || // Prefer neural/natural voices
           voice.name.includes('Natural') ||
           !voice.name.includes('Microsoft')) // Avoid old Microsoft voices
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

      utterance.onerror = (event) => {
        console.warn('Speech synthesis error:', event);
        setIsAvatarSpeaking(false);
        setAvatarEmotion('neutral');
      };

      // Return a promise that resolves when the chunk is done speaking
      await new Promise<void>((resolve) => {
        utterance.onend = () => {
          setIsAvatarSpeaking(false);
          resolve();
        };
        window.speechSynthesis.speak(utterance);
      });
    }
  };

  const playGreeting = async () => {
    if (isMuted) return;

    const greetingText = `Hi! I'm ${agentName}.`;
    
    try {
      // Try ElevenLabs first
      const response = await fetch('/api/agents/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: greetingText }),
      });

      if (!response.ok) {
        throw new Error('Failed to synthesize speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onplay = () => {
          setIsAvatarSpeaking(true);
          setAvatarEmotion('happy');
        };

        audioRef.current.onended = () => {
          setIsAvatarSpeaking(false);
          setAvatarEmotion('neutral');
          URL.revokeObjectURL(audioUrl);
        };

        await audioRef.current.play();
      }
    } catch (error) {
      console.warn('Falling back to Web Speech API:', error);
      speakWithWebSpeech(greetingText);
    }
  };

  const speakResponse = async (text: string) => {
    if (isMuted) return;

    try {
      // Try ElevenLabs first
      const response = await fetch('/api/agents/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to synthesize speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onplay = () => {
          setIsAvatarSpeaking(true);
          setAvatarEmotion('happy');
        };

        audioRef.current.onended = () => {
          setIsAvatarSpeaking(false);
          setAvatarEmotion('neutral');
          URL.revokeObjectURL(audioUrl);
        };

        await audioRef.current.play();
      }
    } catch (error) {
      console.warn('Falling back to Web Speech API:', error);
      await speakWithWebSpeech(text);
    }
  };

  useEffect(() => {
    // Load chat history first
    const loadChatHistory = async () => {
      try {
        const history = await getAgentChatHistory(agentId)
        const greetingMessage = {
          id: Date.now().toString(),
          content: `Hi there! I'm ${agentName}. How can I help you today?`,
          role: 'agent' as const,
          timestamp: new Date(),
        }
        
        if (history?.length > 0) {
          // Take the last 9 messages from history (to leave room for greeting)
          const recentHistory = history.slice(-9)
          // Set messages with greeting first, then recent history
          setMessages([greetingMessage, ...recentHistory])
        } else {
          // If no history, just set the greeting
          setMessages([greetingMessage])
        }
      } catch (error) {
        console.error('Error loading chat history:', error)
        // If error, at least show the greeting
        const greetingMessage = {
          id: Date.now().toString(),
          content: `Hi there! I'm ${agentName}. How can I help you today?`,
          role: 'agent' as const,
          timestamp: new Date(),
        }
        setMessages([greetingMessage])
      }
    }
    
    loadChatHistory()
    playGreeting()

    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.speechSynthesis.cancel()
    }
  }, [agentId, agentName, isMuted])

  // Function to generate a summary of the agent's response
  const generateSummary = async (content: string) => {
    try {
      // You'll need to implement this endpoint
      const response = await fetch('/api/agents/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      const data = await response.json();
      return data.summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    console.log('🎯 Submitting message:', inputValue);
    
    const userMessage = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user' as const,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setLoadingPhase('rag')
    setAvatarEmotion('thinking')
    setIsAvatarSpeaking(false)
    setCurrentSummary('')

    console.log('🔄 Starting chat, initial phase: rag');

    // Create a placeholder for the agent's response
    const agentMessageId = (Date.now() + 1).toString()
    const agentMessage = {
      id: agentMessageId,
      content: '',
      role: 'agent' as const,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, agentMessage])
    scrollToBottom('auto')

    try {
      let accumulatedMessage = '';
      let lastSummaryLength = 0;
      const summaryUpdateThreshold = 50; // Lower threshold for more frequent summaries

      console.log('📡 Calling sendMessageToAgent');
      setLoadingPhase('llm'); // Start with LLM phase
      
      const response = await sendMessageToAgent(
        agentId, 
        inputValue,
        async (chunk) => {
          if (!accumulatedMessage) {
            console.log('📝 Received first chunk, switching to streaming phase');
            setLoadingPhase('streaming');
          }
          
          // Immediately update the UI with the new chunk
          console.log('📝 Updating UI with chunk:', chunk);
          setMessages(prev => {
            const updated = prev.map(msg => 
              msg.id === agentMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            );
            console.log('📝 Updated messages:', updated.length);
            return updated;
          });
          
          accumulatedMessage += chunk;
          scrollToBottom('auto');
          
          // Generate summary more frequently for better voice feedback
          if (accumulatedMessage.length - lastSummaryLength >= summaryUpdateThreshold) {
            console.log('📊 Generating summary for accumulated content');
            lastSummaryLength = accumulatedMessage.length;
            setIsSummarizing(true);
            
            try {
              const summary = await generateSummary(accumulatedMessage);
              if (summary) {
                console.log('🗣️ Speaking summary:', summary);
                setCurrentSummary(summary);
                await speakResponse(summary);
              }
            } catch (summaryError) {
              console.warn('⚠️ Error generating summary:', summaryError);
              // If summary fails, try speaking the raw chunk
              if (!isMuted) {
                await speakResponse(chunk);
              }
            } finally {
              setIsSummarizing(false);
            }
          }
        }
      );
      
      if (response?.message) {
        console.log('✅ Chat complete, final message length:', response.message.length);
        
        // Generate final summary for the complete response
        try {
          const summary = await generateSummary(response.message);
          
          // Update the agent message with any sources
          setMessages(prev => {
            const updated = prev.map(msg => 
              msg.id === agentMessageId 
                ? {
                    ...msg,
                    content: response.message, // Ensure final message is set
                    summary,
                    sources: response.sources
                  }
                : msg
            );
            console.log('📝 Final message update:', updated.length);
            return updated;
          });
          
          setCurrentSummary(summary || '');
          setAvatarEmotion('happy');

          // Speak the final summary
          if (summary) {
            console.log('🗣️ Speaking final summary');
            await speakResponse(summary);
          }
        } catch (finalSummaryError) {
          console.warn('⚠️ Error generating final summary:', finalSummaryError);
          // If final summary fails, try speaking the last part of the message
          if (!isMuted) {
            const lastPart = response.message.split('.').slice(-2).join('.');
            await speakResponse(lastPart);
          }
        }
      } else {
        console.warn('⚠️ No message in response');
        throw new Error('No response from agent');
      }

    } catch (error) {
      console.error('❌ Error in chat:', error)
      setAvatarEmotion('surprised')
      
      // Update the agent message with error
      setMessages(prev => prev.map(msg => 
        msg.id === agentMessageId
          ? {
              ...msg,
              content: "I'm sorry, I encountered an error. Please try again."
            }
          : msg
      ))
      
      setTimeout(() => setAvatarEmotion('neutral'), 2000)
    } finally {
      console.log('🏁 Chat interaction complete');
      setIsLoading(false)
      setLoadingPhase(null)
      scrollToBottom('smooth')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
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
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                console.log('Opening web search for agent:', {
                  agentId,
                  agentName,
                  pineconeNamespace
                });
                setShowWebSearchModal(true);
              }}
              className="px-3 py-1.5 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors duration-200 flex items-center space-x-1"
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                />
              </svg>
              <span>Enable Web Search</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Web Search Modal */}
        {showWebSearchModal && (
          <WebSearchAgentChatModal
            isOpen={showWebSearchModal}
            onClose={() => setShowWebSearchModal(false)}
            agentId={agentId}
          />
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
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
                    {message.role === 'agent' && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          message.sources ? 
                          'bg-green-500/10 text-green-600 dark:text-green-400' : 
                          'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}>
                          {message.sources ? 'RAG' : 'LLM'}
                        </span>
                      </div>
                    )}
                    {message.content}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 text-sm border-t border-gray-200 dark:border-gray-600 pt-2">
                        <p className="font-medium mb-1">Sources:</p>
                        {message.sources.map((source, index) => (
                          <div key={index} className="mb-2">
                            <p className="font-medium text-blue-500 dark:text-blue-400">
                              {source.title}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400">
                              Relevance: {Math.round(source.relevance * 100)}%
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
                          Calling RAG to have a highly contextualized answer...
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
                          Using LLM with agent context...
                        </span>
                      </div>
                    )}
                    {loadingPhase === 'streaming' && isSummarizing && (
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                        <span className="text-sm text-blue-600 dark:text-blue-400">
                          Generating summary for avatar...
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
  )
} 