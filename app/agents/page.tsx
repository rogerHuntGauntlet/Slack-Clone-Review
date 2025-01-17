'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useState, useEffect } from 'react';
import { SparklesIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import AgentCard from './components/AgentCard';
import { AgentIdeaInput } from './components/AgentIdeaInput';
import { CreateAgentDTO, Agent } from './types/agent-types';
import { AgentModal } from './components/AgentModal';
import { createAgent } from './services/agent-service';

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();
  const [evaluation, setEvaluation] = useState<string>('');
  const [evaluating, setEvaluating] = useState(false);
  const [ideaInput, setIdeaInput] = useState('');
  const [showPhdEvaluator, setShowPhdEvaluator] = useState(false);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [chatLogForAgent, setChatLogForAgent] = useState<string>('');
  const [editingAgent, setEditingAgent] = useState<Agent | undefined>(undefined);
  const [preloadedFiles, setPreloadedFiles] = useState<File[]>([]);

  // Agent templates
  const agentTemplates = [
    {
      id: 'customer-support',
      name: 'Customer Support Agent',
      description: 'An agent that handles customer inquiries and support tickets.',
      prompt: 'I want to create a customer support agent that can handle common customer inquiries. The agent should be able to understand customer questions, provide accurate responses, and escalate complex issues when necessary. It should have a friendly, professional tone and be able to handle multiple types of support requests including product information, troubleshooting, and account-related questions.'
    },
    {
      id: 'research-assistant',
      name: 'Research Assistant',
      description: 'An agent that helps with research and data analysis.',
      prompt: 'I want to create a research assistant agent that can help analyze academic papers, summarize findings, and identify key insights. The agent should be able to process scientific literature, extract relevant information, and present it in a clear, organized manner. It should also be able to identify patterns and connections across multiple papers.'
    },
    {
      id: 'content-creator',
      name: 'Content Creator',
      description: 'An agent that helps generate and optimize content.',
      prompt: 'I want to create a content creation agent that can help generate high-quality content for various platforms. The agent should understand content strategy, SEO principles, and different content formats. It should be able to maintain a consistent brand voice while adapting to different audience needs and platform requirements.'
    }
  ];

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      console.log('Loading agents for user:', user.id);

      const { data, error } = await supabase
        .from('agents')
        .select('*, agent_tags(tag_id, tags(name)), agent_files(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Raw agent data from database:', data);

      const transformedAgents = data
        .map((agent: any) => {
          console.log('Processing agent:', agent.name);
          console.log('Agent files:', agent.agent_files);
          
          return {
            ...agent,
            tags: agent.agent_tags?.map((at: any) => at.tags.name) || [],
            isActive: agent.is_active,
            isSystem: false,
            pineconeIndex: agent.pinecone_index,
            pineconeNamespace: agent.pinecone_namespace,
            userId: agent.user_id,
            createdAt: new Date(agent.created_at),
            updatedAt: new Date(agent.updated_at),
            trainingFiles: agent.agent_files?.map((file: any) => {
              console.log('Processing file for agent:', file);
              return {
                type: file.type,
                url: file.url,
                name: file.name,
                size: file.size
              };
            }) || []
          };
        })
        .filter((agent: any) => agent.name !== 'PhD Knowledge Agent');

      console.log('Transformed agents:', transformedAgents);
      setAgents(transformedAgents);
    } catch (error: any) {
      console.error('Error loading agents:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      setAgents(agents.map(agent => 
        agent.id === id ? { ...agent, isActive } : agent
      ));
    } catch (error: any) {
      console.error('Error toggling agent:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAgents(agents.filter(agent => agent.id !== id));
    } catch (error: any) {
      console.error('Error deleting agent:', error);
    }
  };

  const handleEvaluateIdea = async () => {
    if (!ideaInput.trim() || evaluating) return;
    
    setEvaluating(true);
    setError(undefined);
    setEvaluation(''); // Clear previous evaluation
    
    try {
      const response = await fetch('/api/agents/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: ideaInput }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to evaluate idea');
      }

      let text = '';
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream available');

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        text += decoder.decode(value);
        setEvaluation(text);
      }
    } catch (err: any) {
      console.error('Evaluation error:', err);
      setError(err.message || 'Failed to evaluate idea');
    } finally {
      setEvaluating(false);
    }
  };

  const handleCreateAgentFromChat = (chatLog: string) => {
    console.log('Starting handleCreateAgentFromChat with chat log length:', chatLog.length);
    
    // Extract metadata if present
    let name = '';
    let description = '';
    let cleanedChatLog = chatLog;

    const metadataMatch = chatLog.match(/\[AGENT_METADATA\]([\s\S]*?)\[\/AGENT_METADATA\]/);
    if (metadataMatch) {
      try {
        console.log('Found metadata section:', metadataMatch[1]);
        const metadata = JSON.parse(metadataMatch[1]);
        name = metadata.name;
        description = metadata.description;
        // Remove the metadata section from the chat log
        cleanedChatLog = chatLog.replace(/\[AGENT_METADATA\][\s\S]*?\[\/AGENT_METADATA\]\n\n/, '');
        console.log('Cleaned chat log length:', cleanedChatLog.length);
      } catch (e) {
        console.error('Failed to parse agent metadata:', e);
      }
    }

    console.log('Creating chat log file...');
    // Create a new File object from the cleaned chat log
    const chatLogFile = new File(
      [cleanedChatLog],
      'agent_evaluation.txt',
      { type: 'text/plain' }
    );
    console.log('Created file:', { name: chatLogFile.name, type: chatLogFile.type, size: chatLogFile.size });
    
    setChatLogForAgent(cleanedChatLog);
    console.log('Setting preloaded files...');
    setPreloadedFiles([chatLogFile]);
    
    // Pre-populate the form with metadata
    const newAgent = {
      id: '',  // Will be set by the database
      name: name || '',
      description: description || '',
      isActive: true,
      isSystem: false,
      trainingFiles: [],  // Will be populated after file upload
      tags: [],  // Will be generated from description
      userId: '',  // Will be set during creation
      createdAt: new Date(),
      updatedAt: new Date()
    };
    console.log('Setting editing agent:', newAgent);
    setEditingAgent(newAgent);
    
    setShowPhdEvaluator(false);
    setShowCreateAgent(true);
  };

  const handleCreateAgent = async (data: CreateAgentDTO) => {
    console.log('Starting handleCreateAgent with data:', {
      name: data.name,
      description: data.description,
      files: data.files?.map(f => ({ name: f.name, type: f.type, size: f.size })) || []
    });
    
    if (!data.files || data.files.length === 0) {
      console.error('No files provided to handleCreateAgent');
      data.onProgress?.({ 
        step: 'database',
        error: 'No training files provided'
      });
      return;
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      // Create the agent
      const agent = await createAgent(data, user.id);
      console.log('Agent created successfully:', agent);
      
      // Call the progress callback to indicate completion
      data.onProgress?.({ step: 'complete' });
      
      // Refresh the agents list
      await loadAgents();
      
      // Reset state and close modal
      console.log('Resetting state...');
      setShowCreateAgent(false);
      setChatLogForAgent('');
      setEditingAgent(undefined);
      setPreloadedFiles([]);
      console.log('State reset complete');
      
    } catch (error: any) {
      console.error('Error creating agent:', error);
      data.onProgress?.({ 
        step: 'database',
        error: error.message || 'Failed to create agent'
      });
    }
  };

  // Add console log for when editing is initiated
  const handleEdit = (agent: Agent) => {
    console.log('Editing agent:', agent);
    console.log('Agent training files:', agent.trainingFiles);
    setEditingAgent(agent);
    setShowCreateAgent(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error && !showPhdEvaluator) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  // Calculate metrics
  const activeAgents = agents.filter(a => a.isActive).length;
  const totalAgents = agents.length;
  const recentlyUpdated = agents.filter(a => {
    const lastUpdate = new Date(a.updatedAt);
    const now = new Date();
    return now.getTime() - lastUpdate.getTime() < 7 * 24 * 60 * 60 * 1000; // 7 days
  }).length;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Return to Workspace Button */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => router.push('/platform')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700 transition-colors text-sm border border-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Return to Workspace
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.indigo.100),theme(colors.gray.900))] opacity-20" />
        <div className="absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] bg-gray-800/10 shadow-xl shadow-indigo-600/10 ring-1 ring-white/10" />
        
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Create Powerful AI Agents
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Transform your ideas into intelligent agents that can handle complex tasks. 
              Our AI-powered platform helps you create, train, and deploy custom agents 
              that adapt to your specific needs.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <button
                onClick={() => setShowPhdEvaluator(true)}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <SparklesIcon className="h-5 w-5" />
                Start Creating
              </button>
              <a 
                href="#templates" 
                className="text-sm font-semibold leading-6 text-white hover:text-purple-400"
              >
                View Templates <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900/50 rounded-lg p-6">
              <div className="text-3xl font-bold text-white">{totalAgents}</div>
              <div className="text-sm text-gray-400 mt-1">Total Agents</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-6">
              <div className="text-3xl font-bold text-green-400">{activeAgents}</div>
              <div className="text-sm text-gray-400 mt-1">Active Agents</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-6">
              <div className="text-3xl font-bold text-purple-400">{recentlyUpdated}</div>
              <div className="text-sm text-gray-400 mt-1">Recently Updated</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Templates Section */}
        <div id="templates">
          <h2 className="text-xl font-semibold mb-4">Quick Start Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {agentTemplates.map(template => (
              <div 
                key={template.id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex flex-col"
              >
                <h3 className="font-medium text-white">{template.name}</h3>
                <p className="text-sm text-gray-400 mt-1 mb-4">{template.description}</p>
                <button
                  onClick={() => {
                    setIdeaInput(template.prompt);
                    setShowPhdEvaluator(true);
                  }}
                  className="mt-auto bg-purple-600/20 text-purple-400 px-4 py-2 rounded hover:bg-purple-600/30 transition-colors text-sm"
                >
                  Use Template
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* User Agents Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Your Agents</h2>
            <div className="flex gap-4">
              <button
                onClick={() => setShowPhdEvaluator(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                <SparklesIcon className="h-5 w-5" />
                Evaluate Agent Idea
              </button>
              <button
                onClick={() => setShowCreateAgent(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors text-sm"
              >
                Create Agent
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
                onEdit={handleEdit}
              />
            ))}
            {agents.length === 0 && (
              <div className="col-span-full text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-gray-400">No agents created yet. Start by using a template or creating your own!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPhdEvaluator && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPhdEvaluator(false)} />
          
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-3xl bg-gray-900 rounded-xl shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                    <SparklesIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Agent Idea Evaluator</h2>
                    <p className="text-gray-400">Get expert feedback on your agent ideas</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPhdEvaluator(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Chat Interface */}
              <div className="p-6">
                <AgentIdeaInput
                  value={ideaInput}
                  onChange={setIdeaInput}
                  onEvaluate={handleEvaluateIdea}
                  isEvaluating={evaluating}
                  error={error}
                  evaluation={evaluation}
                  onCreateAgent={handleCreateAgentFromChat}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateAgent && (
        <AgentModal
          isOpen={showCreateAgent}
          onClose={() => {
            setShowCreateAgent(false);
            setEditingAgent(undefined);
            setPreloadedFiles([]);
          }}
          onSubmit={handleCreateAgent}
          isCreatingFromTemplate={!editingAgent && !!chatLogForAgent}
          preloadedFiles={preloadedFiles}
          agent={editingAgent}
        />
      )}
    </div>
  );
} 