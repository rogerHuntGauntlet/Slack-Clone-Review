export type FileType = 'text' | 'image' | 'video' | 'audio';

export interface TrainingFile {
  type: FileType;
  url: string;
  name: string;
  size: number;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  isSystem?: boolean;
  configuration?: Record<string, any>;
  pineconeIndex?: string;
  pineconeNamespace?: string;
  trainingFiles: TrainingFile[];
  tags: string[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentDTO {
  name: string;
  description: string;
  configuration?: Record<string, any>;
  pineconeIndex?: string;
  pineconeNamespace?: string;
  files?: File[];  // Browser File objects for upload
  tags: string[];
  onProgress?: (progress: CreationProgress) => void;
  templateId?: string;  // ID of the template to create from
}

export interface UpdateAgentDTO {
  id: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  configuration?: Record<string, any>;
  files?: File[];
  tags?: string[];
  userId?: string;
}

export interface PreviewResult {
  type: 'url' | 'text-type';
  content: string;
}

export interface AgentFile {
  file: File;
  type: FileType;
  progress: number;
  previewResult?: PreviewResult;
}

export interface TagSuggestion {
  tag: string;
  confidence: number;
  matchingAgents?: number;
  source: 'llm' | 'database';
}

export interface AgentMetadata {
  name: string;
  description: string;
  tags: string[];
}

export interface FilePreviewModalProps {
  file: File;
  type: FileType;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  url: string;
  previewType?: 'json' | 'markdown' | 'csv' | 'pdf' | 'text';
  files?: { file: File; url: string; previewType?: string }[];
  currentIndex?: number;
  onSelect?: (index: number) => void;
  onReorder?: (dragIndex: number, hoverIndex: number) => void;
  metadata?: AgentMetadata;
  onMetadataChange?: (metadata: AgentMetadata) => void;
  onTagSelect?: (tag: string) => void;
  suggestedTags?: TagSuggestion[];
}

export interface CreationProgress {
  step: 'database' | 'tags' | 'files' | 'rag' | 'complete';
  subStep?: string;
  currentFile?: number;
  totalFiles?: number;
  currentChunk?: number;
  totalChunks?: number;
  error?: string;
} 