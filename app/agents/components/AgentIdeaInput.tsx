import { useState, useRef, useEffect } from 'react';
import { ExclamationCircleIcon, MicrophoneIcon, VideoCameraIcon, PaperClipIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { AgentChatService } from '../services/agent-chat-service';
import { AnimatedAvatar } from '@/components/AnimatedAvatar';
import { VoiceService } from '@/services/voice-service';

interface SpeechRecognitionBase extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend?: ((this: SpeechRecognition, ev: Event) => any) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognition extends SpeechRecognitionBase {
  lang: string;
}

interface WebkitSpeechRecognition extends SpeechRecognitionBase {
  lang: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => WebkitSpeechRecognition;
  }
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal: boolean;
    };
    length: number;
  };
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'searching' | 'analyzing' | 'writing' | 'done';
  statusMessage?: string;
}

interface AgentIdeaInputProps {
  value: string;
  onChange: (value: string) => void;
  onEvaluate: () => void;
  isEvaluating: boolean;
  error?: string;
  evaluation?: string;
  onError?: (error: string) => void;
  onCreateAgent?: (chatLog: string) => void;
  agentId?: string;
}

export function AgentIdeaInput({ 
  value, 
  onChange, 
  onEvaluate, 
  isEvaluating, 
  error: externalError, 
  evaluation,
  onError,
  onCreateAgent,
  agentId = 'default-agent'
}: AgentIdeaInputProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | undefined>(externalError);
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstMessage = messages.length === 0;
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const chatServiceRef = useRef<AgentChatService | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const voiceServiceRef = useRef<VoiceService | null>(null);
  const [isAvatarVisible, setIsAvatarVisible] = useState(true);
  const [avatarEmotion, setAvatarEmotion] = useState<'neutral' | 'happy' | 'thinking' | 'surprised'>('neutral');
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [voiceChatStatus, setVoiceChatStatus] = useState<'inactive' | 'listening' | 'processing' | 'submitting'>('inactive');
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  const speakResponse = async (text: string) => {
    if (!voiceServiceRef.current) {
      console.error('Voice service not initialized. Please check your ElevenLabs API key.');
      return;
    }

    try {
      setIsPlayingVoice(true);
      setIsAvatarSpeaking(true);
      setAvatarEmotion('neutral');
      
      // Simplify the text first
      const response = await fetch('/api/agents/simplify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "You are an AI that simplifies technical responses into natural, conversational language. Keep the key points but make it sound more human and brief (2-3 sentences max)."
            },
            {
              role: "user",
              content: `Please simplify this response into natural speech:\n\n${text}`
            }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to simplify response');
      }

      const { text: simplifiedText } = await response.json();
      
      // Split text into sentences for more natural delivery
      const sentences = simplifiedText.match(/[^.!?]+[.!?]+/g) || [simplifiedText];
      
      // Set avatar to speaking state before starting
      setIsAvatarSpeaking(true);
      setAvatarEmotion('neutral');
      
      for (const sentence of sentences) {
        try {
          const audioData = await voiceServiceRef.current.synthesizeSpeech(sentence.trim());
          await voiceServiceRef.current.playAudio(audioData);
          
          // Small pause between sentences
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error('Error processing sentence:', sentence, error);
        }
      }

      // After all sentences, show happy emotion
      setAvatarEmotion('happy');
    } catch (error) {
      console.error('Error playing voice:', error);
      setAvatarEmotion('surprised');
    } finally {
      setIsPlayingVoice(false);
      setIsAvatarSpeaking(false);
    }
  };

  useEffect(() => {
    if (!hasShownWelcome) {
      setHasShownWelcome(true);
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hi there! 👋 I'm your AI assistant, ready to help you create your own AI agent. Here's how to get the most out of our interaction:

### How to Use This Tool
- Share your agent idea in the text box below - be as detailed as you can!
- I'll evaluate your idea and provide expert feedback
- You can use voice chat (microphone icon) or upload files (paperclip icon)
- Once we refine your idea, click "Create my agent" to bring it to life

I'm excited to help you build something amazing! What kind of agent would you like to create?`,
        status: 'done'
      }]);
      
      // Only trigger speech once, which will handle the avatar animation
      speakResponse(`Hi there! I'm your AI assistant, ready to help you create your own AI agent. Share your idea in the text box below, and I'll help you bring it to life!`);
    }
  }, [speakResponse]);

  useEffect(() => {
    if (agentId) {
      chatServiceRef.current = new AgentChatService(agentId);
    }
  }, [agentId]);

  // When we get the first evaluation, switch to conversation mode
  useEffect(() => {
    if (evaluation && !isConversationMode && messages.length === 0) {
      setIsConversationMode(true);
      if (chatServiceRef.current) {
        chatServiceRef.current.setRagMode(false);
      }
      // Add the initial exchange to messages
      setMessages([
        { id: Date.now().toString(), role: 'user', content: value, status: 'done' },
        { id: (Date.now() + 1).toString(), role: 'assistant', content: evaluation, status: 'done' }
      ]);
    }
  }, [evaluation, isConversationMode, value]);

  const startRecording = async (isVideo: boolean = false) => {
    try {
      const constraints = isVideo 
        ? { audio: true, video: true }
        : { audio: true };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (isVideo && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: isVideo ? 'video/webm' : 'audio/webm' });
        const formData = new FormData();
        formData.append('file', blob);

        try {
          const response = await fetch('/api/agents/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to transcribe recording');
          }

          const { text } = await response.json();
          onChange(text);
        } catch (err: any) {
          const errorMsg = err.message || 'Failed to transcribe recording';
          setError(errorMsg);
          onError?.(errorMsg);
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
      };

      mediaRecorder.start();
      isVideo ? setIsVideoRecording(true) : setIsRecording(true);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to start recording';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const handleStartAudioRecording = () => startRecording(false);
  const handleStartVideoRecording = () => startRecording(true);

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsVideoRecording(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (file.type.startsWith('text/')) {
        const text = await file.text();
        onChange(text);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/agents/extract-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to extract text from file');
      }

      const { text } = await response.json();
      onChange(text);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to process file';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  // Update messages when evaluation changes
  useEffect(() => {
    if (evaluation) {
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        
        // If there's no message or the last message is from the user, create a new assistant message
        if (!lastMessage || lastMessage.role === 'user') {
          return [...prev, {
            id: 'assistant-response',
            role: 'assistant',
            content: evaluation,
            status: 'done'
          }];
        }
        
        // Otherwise, update the existing assistant message
        return prev.map((msg, index) => {
          if (index === prev.length - 1) {
            return {
              ...msg,
              content: evaluation,
              status: 'done'
            };
          }
          return msg;
        });
      });
    }
  }, [evaluation]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Update error when external error changes
  useEffect(() => {
    setError(externalError);
  }, [externalError]);

  const handleSubmit = () => {
    if (!value.trim() || isEvaluating) return;

    // Add user message
    const userMessageId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: userMessageId,
      role: 'user',
      content: value,
      status: 'done'
    }]);

    if (!isConversationMode) {
      // Initial RAG evaluation
      setMessages(prev => [...prev, {
        id: 'thinking',
        role: 'assistant',
        content: '',
        status: 'searching',
        statusMessage: 'Searching knowledge base for relevant information...'
      }]);

      setTimeout(() => {
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== 'thinking');
          return [...filtered, {
            id: 'thinking',
            role: 'assistant',
            content: '',
            status: 'analyzing',
            statusMessage: 'Analyzing context and formulating expert evaluation...'
          }];
        });
      }, 3000);

      setTimeout(() => {
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== 'thinking');
          return [...filtered, {
            id: 'thinking',
            role: 'assistant',
            content: '',
            status: 'writing',
            statusMessage: 'Writing comprehensive evaluation and recommendations...'
          }];
        });
      }, 6000);

      onEvaluate();
    } else {
      // Conversation mode - simpler loading state
      setMessages(prev => [...prev, {
        id: 'thinking',
        role: 'assistant',
        content: '',
        status: 'writing',
        statusMessage: 'Thinking...'
      }]);

      // Use chat service directly
      if (chatServiceRef.current) {
        chatServiceRef.current.chat(value).then(response => {
          setMessages(prev => {
            const filtered = prev.filter(m => m.id !== 'thinking');
            return [...filtered, {
              id: Date.now().toString(),
              role: 'assistant',
              content: response,
              status: 'done'
            }];
          });
        }).catch(err => {
          console.error('Chat error:', err);
          setError('Failed to get response. Please try again.');
          onError?.('Failed to get response. Please try again.');
          // Remove thinking message
          setMessages(prev => prev.filter(m => m.id !== 'thinking'));
        });
      }
    }
    
    onChange(''); // Clear the input after submission
  };

  // Check if message is in a loading state
  const isLoading = (status?: 'searching' | 'analyzing' | 'writing' | 'done') => {
    return status === 'searching' || status === 'analyzing' || status === 'writing';
  };

  const formatChatLogForAgent = () => {
    return messages.map(msg => {
      if (msg.role === 'user') {
        return `User Input:\n${msg.content}\n`;
      } else if (msg.role === 'assistant' && msg.status === 'done') {
        return `Expert Evaluation:\n${msg.content}\n`;
      }
      return '';
    }).join('\n---\n\n');
  };

  const handleCreateAgent = async () => {
    const chatLog = formatChatLogForAgent();
    if (!chatLog.trim()) {
      console.error('No chat content available');
      return;
    }

    setIsGeneratingMetadata(true);

    try {
      const response = await fetch('/api/agents/generate-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are an AI assistant that generates metadata for AI agents. Based on the conversation provided, generate:
1. A concise but descriptive name for the agent (max 50 chars)
2. A clear description of what the agent does (max 500 chars)

Format your response as a JSON object with fields: name and description.
Make the name and description engaging but professional.`
            },
            {
              role: "user",
              content: `Here is the conversation log:\n\n${chatLog}\n\nBased on this conversation, generate a name and description for this agent.`
            }
          ]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate agent metadata');
      }

      const metadata = await response.json();
      
      // Add metadata to the chat log with a special format that can be parsed by the parent
      const enhancedChatLog = `[AGENT_METADATA]
{
  "name": "${metadata.name}",
  "description": "${metadata.description}"
}
[/AGENT_METADATA]

${chatLog}`;

      onCreateAgent?.(enhancedChatLog);
    } catch (error) {
      console.error('Error generating agent metadata:', error);
      // Fallback to basic chat log if metadata generation fails
      onCreateAgent?.(chatLog);
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  const startVoiceChat = async () => {
    if (!agentId || isEvaluating) return;

    setIsVoiceChatActive(true);
    setVoiceChatStatus('listening');
    setTranscription('');

    try {
      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionConstructor) {
        throw new Error('Speech recognition not supported');
      }

      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      speechRecognitionRef.current = recognition;

      let lastSpeechTime = Date.now();
      let silenceTimer: NodeJS.Timeout | null = null;
      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        lastSpeechTime = Date.now();
        
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }

        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join(' ');

        if (event.results[event.results.length - 1].isFinal) {
          finalTranscript = transcript;
        }
        
        setTranscription(transcript);

        silenceTimer = setTimeout(() => {
          if (finalTranscript.trim()) {
            setVoiceChatStatus('processing');
            recognition.stop();
            onChange(finalTranscript);
            
            // Only proceed with evaluation if we have actual content
            if (finalTranscript.trim().length > 5) {
              // Add a small delay before countdown to show "Processing..." state
              setTimeout(() => {
                setVoiceChatStatus('submitting');
                setCountdown(3);
                
                let count = 3;
                const countdownInterval = setInterval(() => {
                  count--;
                  setCountdown(count);
                  if (count === 0) {
                    clearInterval(countdownInterval);
                    const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
                    if (submitButton) {
                      submitButton.click();
                    } else {
                      handleSubmit();
                    }
                    setCountdown(null);
                    setVoiceChatStatus('inactive');
                  }
                }, 1000);
              }, 500);
            } else {
              setVoiceChatStatus('inactive');
              setTranscription('');
            }
          }
        }, 2000); // Reduced silence time to 2 seconds for better responsiveness
      };

      recognition.addEventListener('end', () => {
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }
        setIsVoiceChatActive(false);
        if (voiceChatStatus === 'listening') {
          setVoiceChatStatus('inactive');
        }
      });

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }
        setIsVoiceChatActive(false);
        setVoiceChatStatus('inactive');
        setTranscription('');
        
        // Show error message to user
        const errorMessage = event.error === 'not-allowed' 
          ? 'Please allow microphone access to use voice chat.'
          : 'Voice chat error. Please try again.';
        setError(errorMessage);
        onError?.(errorMessage);
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start voice chat:', err);
      setIsVoiceChatActive(false);
      setVoiceChatStatus('inactive');
      setError('Failed to start voice chat. Please try again.');
    }
  };

  const stopVoiceChat = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
    setIsVoiceChatActive(false);
    setVoiceChatStatus('inactive');
    setTranscription('');
    setCountdown(null);
  };

  const handleVoiceChatToggle = () => {
    if (isVoiceChatActive) {
      stopVoiceChat();
    } else {
      startVoiceChat();
    }
  };

  // Show transcription in the textarea
  useEffect(() => {
    if (transcription) {
      onChange(transcription);
    }
  }, [transcription]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [countdown]);

  // Initialize voice service
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
    if (apiKey) {
      voiceServiceRef.current = VoiceService.getInstance(apiKey);
    } else {
      console.error('ElevenLabs API key not found in environment variables');
    }
  }, []);

  // Use ElevenLabs voice when evaluation changes
  useEffect(() => {
    if (evaluation && !isPlayingVoice) {
      speakResponse(evaluation);
    }
  }, [evaluation]);

  // Toggle ElevenLabs voice
  const toggleSpeech = async () => {
    if (isPlayingVoice) {
      setIsPlayingVoice(false);
      setIsAvatarSpeaking(false);
    } else if (evaluation) {
      speakResponse(evaluation);
    }
  };

  // Stop speaking when starting voice input
  useEffect(() => {
    if (isVoiceChatActive) {
      setIsPlayingVoice(false);
      setIsAvatarSpeaking(false);
    }
  }, [isVoiceChatActive]);

  // Update avatar state based on message status
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant') {
      if (lastMessage.status === 'searching') {
        setAvatarEmotion('thinking');
        setIsAvatarSpeaking(false);
      } else if (lastMessage.status === 'analyzing') {
        setAvatarEmotion('thinking');
        setIsAvatarSpeaking(false);
      } else if (lastMessage.status === 'writing') {
        setAvatarEmotion('neutral');
        setIsAvatarSpeaking(true);
      } else if (lastMessage.status === 'done') {
        setAvatarEmotion('happy');
        setIsAvatarSpeaking(false);
      }
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-[600px] relative">
      {/* Avatar Overlay */}
      {isAvatarVisible && (
        <div className="absolute top-4 right-4 w-[300px] z-50">
          <div className="relative">
            <button
              onClick={() => setIsAvatarVisible(false)}
              className="absolute top-2 right-2 p-1 rounded-full bg-gray-800/50 hover:bg-gray-700/50 text-white z-10"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <AnimatedAvatar 
              speaking={isAvatarSpeaking} 
              emotion={avatarEmotion}
            />
          </div>
        </div>
      )}

      {/* Toggle Avatar Button (when hidden) */}
      {!isAvatarVisible && (
        <button
          onClick={() => setIsAvatarVisible(true)}
          className="absolute top-4 right-4 p-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white z-50"
          title="Show AI Avatar"
        >
          <VideoCameraIcon className="h-6 w-6" />
        </button>
      )}

      {/* Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="prose prose-invert prose-sm max-w-none">
                  {message.content.split('\n').map((line, i) => {
                    if (line.startsWith('###')) {
                      return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{line.replace('###', '').trim()}</h3>;
                    } else if (line.startsWith('-') || line.startsWith('•')) {
                      return <p key={i} className="ml-4 mb-1">{line}</p>;
                    } else if (line.trim() === '') {
                      return <div key={i} className="h-2" />;
                    } else {
                      return <p key={i} className="mb-1">{line}</p>;
                    }
                  })}
                </div>
              </div>
              {isLoading(message.status) && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                  {message.statusMessage && (
                    <p className="text-sm text-gray-400">{message.statusMessage}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Show live transcription and countdown when voice chat is active */}
        {isVoiceChatActive && (transcription || countdown) && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-700 text-gray-300">
              <div className="flex items-center gap-2">
                {voiceChatStatus === 'listening' && (
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
                {voiceChatStatus === 'processing' && (
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                )}
                <div>{transcription}</div>
              </div>
              {voiceChatStatus === 'submitting' && countdown !== null && (
                <div className="mt-2 flex items-center justify-center">
                  <div className="text-2xl font-bold text-purple-400 animate-pulse">
                    Sending in {countdown}...
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Video Preview */}
      {isVideoRecording && (
        <div className="mx-6 h-40 bg-gray-800 rounded overflow-hidden border border-gray-700">
          <video
            ref={videoPreviewRef}
            className="w-full h-full object-cover"
            muted
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-6 p-2 mb-4 rounded bg-red-500/10">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Input Area */}
      <div className="p-6 border-t border-gray-700">
        <div className="flex flex-col gap-3">
          {/* Create Agent Button - only show in RAG mode with evaluation */}
          {!isConversationMode && messages.some(m => m.role === 'assistant' && m.status === 'done') && (
            <div className="px-6 pt-4 flex gap-2">
              <button
                onClick={handleCreateAgent}
                disabled={isGeneratingMetadata}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 ${
                  isGeneratingMetadata 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                } text-white rounded-lg transition-colors`}
              >
                {isGeneratingMetadata ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Generating agent details...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5" />
                    Create my agent
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  onChange('');
                  setMessages([]);
                  setIsConversationMode(false);
                  if (chatServiceRef.current) {
                    chatServiceRef.current.setRagMode(true);
                  }
                }}
                className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg flex items-center gap-2"
                title="Clear conversation and start over"
              >
                <XMarkIcon className="h-5 w-5" />
                Clear All
              </button>
            </div>
          )}

          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={isFirstMessage ? "Share your agent idea..." : "Ask a follow-up question..."}
            className="w-full h-20 px-4 py-2 text-gray-200 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          
          <div className="flex items-center gap-2">
            <div className="flex gap-2">
              <button
                onClick={handleVoiceChatToggle}
                className={`p-2 rounded-full transition-all duration-200 ${
                  voiceChatStatus === 'inactive'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : voiceChatStatus === 'listening'
                    ? 'bg-red-500 text-white animate-pulse'
                    : voiceChatStatus === 'processing'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-purple-500 text-white'
                }`}
                title={
                  voiceChatStatus === 'inactive'
                    ? 'Start voice chat'
                    : voiceChatStatus === 'listening'
                    ? 'Stop recording'
                    : voiceChatStatus === 'processing'
                    ? 'Processing...'
                    : 'Submitting...'
                }
              >
                <MicrophoneIcon className="h-5 w-5" />
              </button>

              <button
                onClick={isVideoRecording ? handleStopRecording : handleStartVideoRecording}
                className={`p-2 rounded-full ${
                  isVideoRecording ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title={isVideoRecording ? 'Stop recording' : 'Start video recording'}
              >
                <VideoCameraIcon className="h-5 w-5" />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600"
                title="Upload file"
              >
                <PaperClipIcon className="h-5 w-5" />
              </button>

              {value.trim() && (
                <button
                  onClick={() => onChange('')}
                  className="p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20"
                  title="Clear input"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            <button
              onClick={handleSubmit}
              type="submit"
              disabled={isEvaluating || !value.trim()}
              className={`ml-auto px-4 py-2 rounded-lg flex items-center gap-2 ${
                isEvaluating || !value.trim()
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-500'
              }`}
            >
              {isEvaluating ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>{isFirstMessage ? "Evaluating..." : "Thinking..."}</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5" />
                  <span>{isFirstMessage ? "Evaluate" : "Send"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf,.doc,.docx"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
} 