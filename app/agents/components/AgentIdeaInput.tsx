import { useState, useRef, useEffect } from 'react';
import { ExclamationCircleIcon, MicrophoneIcon, VideoCameraIcon, PaperClipIcon, SparklesIcon } from '@heroicons/react/24/outline';

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
}

export function AgentIdeaInput({ 
  value, 
  onChange, 
  onEvaluate, 
  isEvaluating, 
  error: externalError, 
  evaluation,
  onError,
  onCreateAgent
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
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: value
    }]);

    // Add initial searching status
    setMessages(prev => [...prev, {
      id: 'thinking',
      role: 'assistant',
      content: '',
      status: 'searching',
      statusMessage: 'Searching knowledge base for relevant information...'
    }]);

    // After a short delay, show analyzing status
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

    // After another delay, show writing status
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

  return (
    <div className="flex flex-col h-[600px]">
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
              {isLoading(message.status) ? (
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
              ) : (
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
              )}
            </div>
          </div>
        ))}
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
          {/* Create Agent Button - only show if we have an evaluation */}
          {messages.some(m => m.role === 'assistant' && m.status === 'done') && (
            <div className="px-6 pt-4">
              <button
                onClick={handleCreateAgent}
                disabled={isGeneratingMetadata}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 ${
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
                onClick={isRecording ? handleStopRecording : handleStartAudioRecording}
                className={`p-2 rounded-full ${
                  isRecording ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title={isRecording ? 'Stop recording' : 'Start audio recording'}
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
            </div>

            <button
              onClick={handleSubmit}
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