import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Agent, CreateAgentDTO, UpdateAgentDTO, TrainingFile, FileType } from '../types/agent-types';
import { mockAgents } from '../data/mock-agents';
import { AgentRAGService } from './rag-service';

const supabase = createClientComponentClient();
let ragService: AgentRAGService | null = null;

function getRagService(): AgentRAGService {
  if (!ragService) {
    ragService = new AgentRAGService();
  }
  return ragService!;
}

interface AgentRecord {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  configuration: Record<string, any>;
  user_id: string;
  created_at: string;
  updated_at: string;
  agent_files: Array<{
    type: FileType;
    url: string;
    name: string;
    size: number;
  }>;
  agent_tags: Array<{
    tag_id: string;
    tags: {
      name: string;
    };
  }>;
}

interface TagRecord {
  id: string;
  name: string;
  created_at: string;
}

export interface AgentCollection {
  templates: Agent[];
  userAgents: Agent[];
  phdAgent?: Agent;  // Special PhD agent for evaluating other agents
}

async function getPhdAgent(): Promise<Agent | undefined> {
  // Use mock data for PhD agent
  const phdAgent = {
    id: 'phd-agent',
    name: 'PhD Knowledge Agent',
    description: 'An advanced AI agent that can evaluate and provide feedback on agent ideas.',
    isActive: true,
    configuration: {},
    userId: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    trainingFiles: [],
    tags: ['system', 'evaluator'],
    isSystem: true
  };
  return phdAgent;
}

export async function getAllAgents(userId: string): Promise<AgentCollection> {
  const [userAgents, templates, phdAgent] = await Promise.all([
    getUserAgents(userId),
    getTemplateAgents(),
    getPhdAgent()
  ]);

  // Filter out the PhD agent from templates if it exists there
  const filteredTemplates = templates.filter(agent => agent.name !== 'PhD Knowledge Agent');

  return {
    templates: filteredTemplates,
    userAgents,
    phdAgent
  };
}

async function getUserAgents(userId: string): Promise<Agent[]> {
  const { data: agents, error } = await supabase
    .from('agents')
    .select(`
      *,
      agent_files (*),
      agent_tags (
        tag_id,
        tags (name)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Transform the data to match our Agent type and filter out PhD Knowledge Agent
  return (agents as AgentRecord[])
    .filter(agent => agent.name !== 'PhD Knowledge Agent')
    .map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      isActive: agent.is_active,
      configuration: agent.configuration,
      userId: agent.user_id,
      createdAt: new Date(agent.created_at),
      updatedAt: new Date(agent.updated_at),
      trainingFiles: agent.agent_files.map(file => ({
        type: file.type,
        url: file.url,
        name: file.name,
        size: file.size
      })),
      tags: agent.agent_tags.map(tag => tag.tags.name)
    }));
}

export async function getTemplateAgents(): Promise<Agent[]> {
  // Use mock data for now since database isn't set up
  return mockAgents.map(agent => ({
    ...agent,
    isSystem: true
  }));
}

export async function createAgentFromTemplate(templateId: string, userId: string, customName?: string): Promise<Agent> {
  const template = mockAgents.find(a => a.id === templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  const dto: CreateAgentDTO = {
    name: customName || `${template.name} Copy`,
    description: template.description,
    configuration: template.configuration,
    tags: [...template.tags, 'from-template'] // Add a special tag to track template-based agents
  };

  return createAgent(dto, userId);
}

export async function createAgent(dto: CreateAgentDTO, userId: string): Promise<Agent> {
  // First create the agent in database
  dto.onProgress?.({ step: 'database', subStep: 'Creating agent in database...' });
  
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .insert({
      name: dto.name,
      description: dto.description,
      configuration: dto.configuration,
      user_id: userId,
      pinecone_namespace: `agent-${userId}-${Date.now()}` // Add unique namespace for this agent
    })
    .select()
    .single();

  if (agentError) {
    dto.onProgress?.({ step: 'database', error: agentError.message });
    throw agentError;
  }

  // Create user profile for the agent
  dto.onProgress?.({ step: 'database', subStep: 'Creating agent user profile...' });
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: agent.id,
      username: dto.name,
      email: `agent-${agent.id}@gauntlet.ai`,
      avatar_url: `https://www.gravatar.com/avatar/${agent.id}?d=identicon`,
      status: 'online',
      is_agent: true
    });

  if (profileError) {
    dto.onProgress?.({ step: 'database', error: profileError.message });
    throw profileError;
  }

  // Handle tags if they exist
  const tags = dto.tags || [];
  if (tags.length > 0) {
    dto.onProgress?.({ step: 'tags', subStep: 'Adding tags...' });
    
    try {
      // Upsert tags first
      const { data: tagData, error: tagsError } = await supabase
        .from('tags')
        .upsert(
          tags.map(name => ({ name })),
          { onConflict: 'name' }
        )
        .select();

      if (tagsError) throw tagsError;

      // Create agent-tag relationships
      const { error: relationError } = await supabase
        .from('agent_tags')
        .insert(
          (tagData as TagRecord[]).map((tag: TagRecord) => ({
            agent_id: agent.id,
            tag_id: tag.id
          }))
        );

      if (relationError) throw relationError;
    } catch (error: any) {
      dto.onProgress?.({ step: 'tags', error: error.message });
      throw error;
    }
  }

  // Handle file uploads if they exist
  const uploadedFiles: TrainingFile[] = [];
  if (dto.files && dto.files.length > 0) {
    try {
      for (let i = 0; i < dto.files.length; i++) {
        dto.onProgress?.({ 
          step: 'files', 
          subStep: 'Uploading files to storage...', 
          currentFile: i + 1, 
          totalFiles: dto.files.length 
        });
        
        const file = dto.files[i];
        const uploadedFile = await uploadTrainingFile(agent.id, file); // Now we have the correct agent.id
        uploadedFiles.push(uploadedFile);
      }

      // Process files through RAG service
      dto.onProgress?.({ 
        step: 'files', 
        subStep: 'Processing files for knowledge base...', 
        currentFile: 1, 
        totalFiles: uploadedFiles.length 
      });

      // Create FormData with files
      const formData = new FormData();
      formData.append('agentId', agent.id);
      dto.files.forEach(file => {
        formData.append('files', file);
      });

      // Send files to process-files endpoint
      const response = await fetch('/api/agents/process-files', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process files');
      }
    } catch (error: any) {
      dto.onProgress?.({ 
        step: 'files', 
        error: error.message 
      });
      throw error;
    }
  }

  // Return the created agent with all its relationships
  return getUserAgents(userId).then(agents => agents.find(a => a.id === agent.id)!);
}

export async function updateAgent(dto: UpdateAgentDTO): Promise<void> {
  // Update agent
  const { error: agentError } = await supabase
    .from('agents')
    .update({
      name: dto.name,
      description: dto.description,
      is_active: dto.isActive,
      configuration: dto.configuration,
      updated_at: new Date().toISOString()
    })
    .eq('id', dto.id);

  if (agentError) throw agentError;

  // Process new files for RAG if they exist
  if (dto.files && dto.files.length > 0) {
    // Get the agent's pinecone namespace
    const { data: agent } = await supabase
      .from('agents')
      .select('pinecone_namespace')
      .eq('id', dto.id)
      .single();

    if (!agent?.pinecone_namespace) {
      throw new Error('Agent namespace not found');
    }

    try {
      for (const file of dto.files) {
        // First upload the file
        const uploadedFile = await uploadTrainingFile(dto.id, file);
        
        // Then process it for RAG
        await ragService?.processAgentFile(dto.id, uploadedFile, await file.text());
      }
    } catch (error) {
      console.error('Error processing files for RAG:', error);
      throw new Error('Failed to process training files for agent knowledge base');
    }
  }

  // Handle tags update
  if (dto.tags) {
    // First, remove existing tags
    const { error: deleteError } = await supabase
      .from('agent_tags')
      .delete()
      .eq('agent_id', dto.id);

    if (deleteError) throw deleteError;

    if (dto.tags.length > 0) {
      // Upsert new tags
      const { data: tags, error: tagsError } = await supabase
        .from('tags')
        .upsert(
          dto.tags.map(name => ({ name })),
          { onConflict: 'name' }
        )
        .select();

      if (tagsError) throw tagsError;

      // Create new relationships
      const { error: relationError } = await supabase
        .from('agent_tags')
        .insert(
          (tags as TagRecord[]).map((tag: TagRecord) => ({
            agent_id: dto.id,
            tag_id: tag.id
          }))
        );

      if (relationError) throw relationError;
    }
  }
}

export async function deleteAgent(id: string): Promise<void> {
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function uploadTrainingFile(
  agentId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<TrainingFile> {
  // Generate a unique file path
  const timestamp = new Date().getTime();
  const fileExt = file.name.split('.').pop();
  const filePath = `${agentId}/${timestamp}-${file.name}`;
  const bucketName = 'agent-files'; // Changed from 'agents' to 'agent-files'

  try {
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        onUploadProgress: ({ count, total }: { count: number; total: number }) => {
          const progress = (count / total) * 100;
          onProgress?.(progress);
        }
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      if (uploadError.message.includes('Bucket not found')) {
        throw new Error('Storage bucket not configured. Please ensure the agent-files bucket exists in Supabase storage.');
      }
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    // Create file record
    const { data: fileRecord, error: fileError } = await supabase
      .from('agent_files')
      .insert({
        agent_id: agentId,
        type: getFileType(file.type),
        url: publicUrl,
        name: file.name,
        size: file.size
      })
      .select()
      .single();

    if (fileError) {
      // If file record creation fails, try to clean up the uploaded file
      await supabase.storage.from(bucketName).remove([filePath]);
      throw fileError;
    }

    return {
      type: fileRecord.type as FileType,
      url: fileRecord.url,
      name: fileRecord.name,
      size: fileRecord.size
    };
  } catch (error: any) {
    // Add more context to the error
    throw new Error(`Failed to upload file ${file.name}: ${error.message}`);
  }
}

function getFileType(mimeType: string): 'text' | 'image' | 'video' | 'audio' {
  if (mimeType.startsWith('text/') || mimeType.includes('pdf') || mimeType.includes('document')) {
    return 'text';
  }
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }
  return 'text'; // Default to text for unknown types
} 