'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Minimize2, Maximize2, Volume2, VolumeX, Mic, MicOff, Move } from 'lucide-react';
import { AnimatedAvatar } from '@/components/AnimatedAvatar';
import { webSearchAgentService } from '../services/web-search-agent-service';
import { WebSearchStorageService, WebSearchMessage } from '../services/web-search-storage-service';
import { useWebSearch } from '../hooks';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';

// Update SpeechRecognition type declarations
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  0: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionError extends Event {
  error: string;
}

interface CustomSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  onend: ((ev: Event) => void) | null;
  onerror: ((ev: SpeechRecognitionError) => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

interface WebSearchAgentChatModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  agentId: string;
}

export const WebSearchAgentChatModal: React.FC<WebSearchAgentChatModalProps> = ({
  isOpen,
  onCloseAction,
  agentId,
}) => {
  const { 
    search, 
    results: searchResults, 
    isLoading: isSearching,
    error: searchError,
    settings,
    updateSettings,
    cacheStats
  } = useWebSearch();

  const [messages, setMessages] = useState<WebSearchMessage[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<CustomSpeechRecognition | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [countdownProgress, setCountdownProgress] = useState(0);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showAutoSendNotification, setShowAutoSendNotification] = useState(false);
  const storageServiceRef = useRef<WebSearchStorageService | null>(null);
  const [avatarPosition, setAvatarPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPosition = useRef({ x: 0, y: 0 });
  const dragStartOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    storageServiceRef.current = new WebSearchStorageService(agentId);
  }, [agentId]);

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

  // Initialize voice synthesis with error handling
  useEffect(() => {
    try {
      if ('speechSynthesis' in window) {
        const loadVoices = () => {
          try {
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
          } catch (error) {
            console.error('Error loading voices:', error);
            // Continue without voice synthesis
          }
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
        
        return () => {
          try {
            window.speechSynthesis.onvoiceschanged = null;
          } catch (error) {
            console.error('Error cleaning up voice synthesis:', error);
          }
        };
      }
    } catch (error) {
      console.error('Error initializing voice synthesis:', error);
      // Continue without voice synthesis
    }
  }, []);

  const speakWithWebSpeech = async (content: string, searchResults?: any[]) => {
    if (!('speechSynthesis' in window) || isMuted) return;
    
    try {
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

      try {
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
        console.error('Error in speech synthesis:', error);
        setIsAvatarSpeaking(false);
        setAvatarEmotion('neutral');
      }
    } catch (error) {
      console.error('Error in voice synthesis:', error);
      setIsAvatarSpeaking(false);
      setAvatarEmotion('neutral');
    }
  };

  // Initialize web search agent with error handling
  useEffect(() => {
    const initializeAgent = async () => {
      try {
        setIsCheckingRag(true);
        setRagError(null);
        console.log('Initializing web search agent with ID:', agentId);
        await webSearchAgentService.initializeAgent(agentId);
        setIsRagEnabled(true);
        setAgentName(webSearchAgentService.getCurrentAgentName() || 'AI Assistant');
      } catch (error) {
        console.error('Error initializing web search:', error);
        setIsRagEnabled(false);
        setRagError(error instanceof Error ? error.message : 'Failed to initialize web search');
        // Set a fallback agent name if initialization fails
        setAgentName('AI Assistant');
      } finally {
        setIsCheckingRag(false);
      }
    };

    initializeAgent();

    return () => {
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        window.speechSynthesis.cancel();
      } catch (error) {
        console.error('Error cleaning up audio:', error);
      }
    };
  }, [agentId]);

  // Add initial greeting with error handling
  useEffect(() => {
    try {
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
          speakWithWebSpeech(greetingMessage.content).catch(error => {
            console.error('Error speaking greeting:', error);
          });
        }
      }
    } catch (error) {
      console.error('Error setting initial greeting:', error);
      // Set a basic greeting if the custom one fails
      setMessages([{
        id: Date.now().toString(),
        content: "Hello! I'm here to help you.",
        role: 'assistant' as const,
        timestamp: new Date(),
      }]);
    }
  }, [agentName, isRagEnabled, isMuted, messages.length]);

  // Update loading phase when search is in progress
  useEffect(() => {
    if (isSearching) {
      setLoadingPhase('websearch');
    } else if (loadingPhase === 'websearch') {
      setLoadingPhase(null);
    }
  }, [isSearching, loadingPhase]);

  // Handle search errors
  useEffect(() => {
    if (searchError) {
      const errorMessage: WebSearchMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Error during web search: ${searchError}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [searchError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: WebSearchMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setLoadingPhase('websearch');

    try {
      // Perform web search
      if (isRagMode) {
        try {
          await search(inputValue);
        } catch (error) {
          console.error('Web search failed:', error);
          // Continue with basic chat if web search fails
        }
      }

      // Use the search results in the agent's response
      let response;
      try {
        response = await webSearchAgentService.sendMessage(inputValue, false);
      } catch (error) {
        console.error('Error getting agent response:', error);
        response = {
          content: "I apologize, but I'm having trouble processing your request. Please try again or rephrase your question.",
          citations: []
        };
      }
      
      const assistantMessage: WebSearchMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        citations: response.citations
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Speak the response if speech is enabled
      if (!isMuted) {
        try {
          await speakWithWebSpeech(response.content, searchResults);
        } catch (error) {
          console.error('Error speaking response:', error);
        }
      }

      // Store the conversation
      if (storageServiceRef.current) {
        try {
          await storageServiceRef.current.storeMessage(userMessage);
          await storageServiceRef.current.storeMessage(assistantMessage);
        } catch (error) {
          console.error('Error storing messages:', error);
        }
      }

    } catch (error) {
      console.error('Error in chat:', error);
      const errorMessage: WebSearchMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setLoadingPhase(null);
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionConstructor = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognitionConstructor() as unknown as CustomSpeechRecognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognitionRef.current = recognition;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Clear any existing timeouts when new speech is detected
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        setCountdownProgress(0);

        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInputValue(transcript);

        // Start countdown and set timeout for silence detection
        if (transcript.trim()) {
          let progress = 0;
          countdownIntervalRef.current = setInterval(() => {
            progress += 1;
            setCountdownProgress(Math.min(progress, 100));
          }, 20); // Update every 20ms for smooth animation

          silenceTimeoutRef.current = setTimeout(() => {
            if (isListening && transcript.trim()) {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
              }
              recognitionRef.current?.stop();
              setAvatarEmotion('happy');
              setShowAutoSendNotification(true);
              
              // Create a proper form submit event
              const form = document.querySelector('form');
              if (form) {
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                form.dispatchEvent(submitEvent);
              }
              
              // Hide notification after send
              setTimeout(() => setShowAutoSendNotification(false), 2000);
            }
          }, 2000);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setCountdownProgress(0);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setCountdownProgress(0);
        // Clear any existing timeouts when speech recognition ends
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      setCountdownProgress(0);
    };
  }, [handleSubmit]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      console.error('Speech recognition not supported');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      setCountdownProgress(0);
    } else {
      setInputValue('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      formData.append('agentId', agentId);

      const response = await fetch('/api/agents/web-search-agent/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }

      const uploadedFileData = await response.json();
      setUploadedFiles(prev => [...prev, ...uploadedFileData]);

      // Add a system message about the uploaded files
      const fileNames = Array.from(files).map(f => f.name).join(', ');
      const systemMessage = {
        id: Date.now().toString(),
        content: `Files uploaded: ${fileNames}. I'll analyze these for our conversation.`,
        role: 'assistant' as const,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, systemMessage]);
    } catch (error) {
      console.error('Error uploading files:', error);
      const errorMessage = {
        id: Date.now().toString(),
        content: 'Sorry, there was an error uploading the files. Please try again.',
        role: 'assistant' as const,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStartPosition.current = {
      x: e.clientX,
      y: e.clientY
    };
    dragStartOffset.current = {
      x: avatarPosition.x,
      y: avatarPosition.y
    };
  };

  const handleDrag = (e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartPosition.current.x;
    const deltaY = e.clientY - dragStartPosition.current.y;

    setAvatarPosition({
      x: dragStartOffset.current.x + deltaX,
      y: dragStartOffset.current.y + deltaY
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging]);

  return isOpen ? (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      {/* Avatar Overlay - Now draggable */}
      <div 
        className="absolute"
        style={{
          left: avatarPosition.x,
          top: avatarPosition.y,
          zIndex: 60,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        <div 
          className={`transition-all duration-300 ease-in-out ${
            isAvatarCollapsed ? 'w-16 h-16' : 'w-[200px] h-[200px]'
          }`}
        >
          <div className="relative w-full h-full">
            <div className="absolute inset-0 bg-gray-900/15 backdrop-blur-sm rounded-lg" />
            <div 
              className="relative w-full h-full flex flex-col"
              onMouseDown={handleDragStart}
            >
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
              <button
                className="absolute top-2 left-2 p-1.5 bg-gray-800/80 text-white rounded-full hover:bg-gray-700 transition-colors"
                title="Drag to move"
              >
                <Move size={14} />
              </button>
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
      </div>

      <div className="bg-white dark:bg-gray-800 w-full max-w-4xl h-[80vh] rounded-lg shadow-xl flex flex-col relative">
        {/* Audio Element */}
        <audio ref={audioRef} />

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">Chat with {agentName}</h2>
          </div>
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
              onClick={onCloseAction}
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
                  <div className="prose dark:prose-invert max-w-none">
                    {message.role === 'assistant' && (
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          message.citations ? 
                          'bg-green-500/10 text-green-600 dark:text-green-400' : 
                          'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}>
                          {message.citations ? 'Web Search' : 'Chat'}
                        </span>
                        <button
                          onClick={() => storageServiceRef.current?.storeMessage(message)}
                          className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
                        >
                          Save to Agent Memory
                        </button>
                      </div>
                    )}
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      className={`${message.role === 'user' ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}
                      components={{
                        p: ({children, ...props}) => <p className="mb-2 last:mb-0" {...props}>{children}</p>,
                        a: ({children, href, ...props}) => (
                          <a href={href} className="text-blue-400 hover:underline" {...props}>{children}</a>
                        ),
                        ul: ({children, ...props}) => <ul className="list-disc pl-4 mb-2" {...props}>{children}</ul>,
                        ol: ({children, ...props}) => <ol className="list-decimal pl-4 mb-2" {...props}>{children}</ol>,
                        li: ({children, ...props}) => <li className="mb-1" {...props}>{children}</li>,
                        code: ({node, className, ...props}) => {
                          const isInline = !className;
                          return isInline ? (
                            <code className="bg-black/10 dark:bg-white/10 rounded px-1" {...props} />
                          ) : (
                            <code className="block bg-black/10 dark:bg-white/10 rounded p-2 my-2 overflow-x-auto" {...props} />
                          );
                        },
                        pre: ({children, ...props}) => <pre className="bg-black/10 dark:bg-white/10 rounded p-2 my-2 overflow-x-auto" {...props}>{children}</pre>,
                        blockquote: ({children, ...props}) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-2" {...props}>{children}</blockquote>,
                      } as Components}
                    >
                      {message.content}
                    </ReactMarkdown>
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
            <div className="flex items-center space-x-2">
              <div className="flex-1 flex items-center space-x-2 p-2 border dark:border-gray-600 rounded-lg bg-transparent">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent outline-none"
                  disabled={isLoading}
                />
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    {showAutoSendNotification && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-3 py-1 rounded-full text-sm whitespace-nowrap animate-fade-in-out">
                        Auto-sending message...
                      </div>
                    )}
                    {isListening && countdownProgress > 0 && (
                      <div className="absolute inset-0 rounded-full">
                        <svg className="w-9 h-9" viewBox="0 0 36 36">
                          <circle
                            stroke="currentColor"
                            strokeOpacity="0.2"
                            fill="none"
                            cx="18"
                            cy="18"
                            r="16"
                            strokeWidth="2"
                          />
                          <circle
                            stroke="currentColor"
                            strokeLinecap="round"
                            fill="none"
                            cx="18"
                            cy="18"
                            r="16"
                            strokeWidth="2"
                            strokeDasharray={`${countdownProgress}, 100`}
                            transform="rotate(-90 18 18)"
                            className="text-red-500"
                          />
                        </svg>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`p-2 rounded-full transition-colors relative z-10 ${
                        isListening 
                          ? 'text-red-500 hover:bg-red-500/10' 
                          : 'text-gray-500 hover:bg-gray-500/10'
                      }`}
                      disabled={isLoading}
                    >
                      {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.md"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isLoading}
                    className={`p-2 rounded-full transition-colors relative z-10 ${
                      isUploading 
                        ? 'text-blue-500' 
                        : 'text-gray-500 hover:bg-gray-500/10'
                    }`}
                  >
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
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