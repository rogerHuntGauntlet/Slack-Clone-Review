import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface WebSearchFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  content?: string;
}

export interface WebSearchMessage {
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
}

interface PineconeMetadata {
  type: 'file' | 'message';
  name?: string;
  content: string;
  fileType?: string;
  role?: 'user' | 'assistant';
  timestamp: string;
  citations?: Array<{
    url: string;
    title: string;
    snippet: string;
    relevanceScore: number;
  }>;
}

interface PineconeMatch {
  id: string;
  score: number;
  metadata?: PineconeMetadata;
}

interface PineconeQueryResponse {
  matches?: PineconeMatch[];
}

export class WebSearchStorageService {
  private supabase = createClientComponentClient();

  constructor(private agentId: string) {}

  private async getAgentNamespace(): Promise<string> {
    const { data, error } = await this.supabase
      .from('agents')
      .select('web_search_namespace')
      .eq('id', this.agentId)
      .single();

    if (error) throw error;
    if (!data?.web_search_namespace) {
      // Create a new namespace if it doesn't exist
      const namespace = `web-search-${this.agentId}`;
      await this.supabase
        .from('agents')
        .update({ web_search_namespace: namespace })
        .eq('id', this.agentId);
      return namespace;
    }

    return data.web_search_namespace;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch('/api/agents/web-search-agent/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate embedding');
    }

    const { embedding } = await response.json();
    return embedding;
  }

  private async pineconeOperation(operation: 'upsert' | 'query', namespace: string, data: any): Promise<PineconeQueryResponse> {
    const response = await fetch('/api/agents/web-search-agent/pinecone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation,
        namespace,
        data
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to perform Pinecone operation');
    }

    return response.json();
  }

  async uploadFiles(files: File[]): Promise<WebSearchFile[]> {
    const uploadedFiles: WebSearchFile[] = [];

    for (const file of files) {
      // 1. Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('web-search-files')
        .upload(`${this.agentId}/${file.name}`, file);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from('web-search-files')
        .getPublicUrl(`${this.agentId}/${file.name}`);

      // 3. Create file record
      const fileRecord: WebSearchFile = {
        id: Date.now().toString(),
        name: file.name,
        type: file.type,
        size: file.size,
        url: publicUrl
      };

      // 4. Store file content in Pinecone if it's a text file
      if (file.type.startsWith('text/') || file.name.endsWith('.md')) {
        const content = await file.text();
        fileRecord.content = content;
        await this.storeFileInPinecone(fileRecord);
      }

      uploadedFiles.push(fileRecord);
    }

    return uploadedFiles;
  }

  private async storeFileInPinecone(file: WebSearchFile) {
    if (!file.content) return;

    const namespace = await this.getAgentNamespace();
    const embedding = await this.generateEmbedding(file.content);

    await this.pineconeOperation('upsert', namespace, {
      vectors: [{
        id: `file-${file.id}`,
        values: embedding,
        metadata: {
          type: 'file',
          name: file.name,
          content: file.content,
          fileType: file.type,
          timestamp: new Date().toISOString()
        } as PineconeMetadata
      }]
    });
  }

  async storeMessage(message: WebSearchMessage) {
    const namespace = await this.getAgentNamespace();
    const embedding = await this.generateEmbedding(message.content);

    await this.pineconeOperation('upsert', namespace, {
      vectors: [{
        id: `message-${message.id}`,
        values: embedding,
        metadata: {
          type: 'message',
          content: message.content,
          role: message.role,
          timestamp: message.timestamp.toISOString(),
          citations: message.citations
        } as PineconeMetadata
      }]
    });
  }

  async searchContext(query: string, limit: number = 5): Promise<Array<{
    content: string;
    type: 'file' | 'message';
    timestamp: string;
    relevanceScore: number;
  }>> {
    const namespace = await this.getAgentNamespace();
    const embedding = await this.generateEmbedding(query);

    const results = await this.pineconeOperation('query', namespace, {
      vector: embedding,
      topK: limit
    });

    return (results.matches || []).map((match: PineconeMatch) => ({
      content: String(match.metadata?.content || ''),
      type: (match.metadata?.type || 'message') as 'file' | 'message',
      timestamp: String(match.metadata?.timestamp || new Date().toISOString()),
      relevanceScore: match.score || 0
    }));
  }
} 