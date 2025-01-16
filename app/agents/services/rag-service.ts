import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { TrainingFile } from '../types/agent-types';
import pLimit from 'p-limit';
import { FileProcessor } from './file-processor';

// Remove global OpenAI initialization
let openaiClient: OpenAI | null = null;

// Initialize Pinecone only when PINECONE_API_KEY is available
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || ''
});

interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    agentId: string;
    fileId: string;
    fileName: string;
    chunkIndex: number;
  };
}

export interface ProcessProgress {
  totalChunks: number;
  processedChunks: number;
  currentOperation: 'chunking' | 'embedding' | 'indexing';
}

export class AgentRAGService {
  private static CHUNK_SIZE = 500; // characters
  private static CHUNK_OVERLAP = 50;
  private static VECTOR_DIMENSION = 1536; // OpenAI ada-002 dimension
  private static MAX_CONCURRENT_EMBEDDINGS = 5;
  private static MAX_CONTENT_LENGTH = 1000000; // ~1MB of text

  private progressCallback?: (progress: ProcessProgress) => void;

  constructor(progressCallback?: (progress: ProcessProgress) => void) {
    this.progressCallback = progressCallback;
  }

  private getOpenAI(): OpenAI {
    if (!openaiClient) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }
      openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    return openaiClient;
  }

  private async getIndex() {
    try {
      const indexName = process.env.PINECONE_INDEX_NAME;
      if (!indexName) {
        throw new Error('PINECONE_INDEX_NAME environment variable is not set');
      }
      return pinecone.index(indexName);
    } catch (error: any) {
      throw new Error(`Failed to get Pinecone index: ${error.message}`);
    }
  }

  private validateContent(content: string) {
    if (!content || typeof content !== 'string') {
      throw new Error('Content must be a non-empty string');
    }
    if (content.length > AgentRAGService.MAX_CONTENT_LENGTH) {
      throw new Error(`Content exceeds maximum length of ${AgentRAGService.MAX_CONTENT_LENGTH} characters`);
    }
  }

  private chunkDocument(text: string): string[] {
    const chunks: string[] = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      // Get chunk with overlap
      const chunkEnd = Math.min(
        currentIndex + AgentRAGService.CHUNK_SIZE,
        text.length
      );
      const chunk = text.slice(currentIndex, chunkEnd).trim();
      if (chunk) chunks.push(chunk);

      // Move to next chunk, accounting for overlap
      currentIndex += AgentRAGService.CHUNK_SIZE - AgentRAGService.CHUNK_OVERLAP;
    }

    return chunks;
  }

  private async generateEmbedding(text: string) {
    try {
      const openai = this.getOpenAI();
      const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
        encoding_format: "float"
      });
      return response.data[0].embedding;
    } catch (error: any) {
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  async processAgentFile(agentId: string, file: TrainingFile, content: string) {
    try {
      this.validateContent(content);
      const index = await this.getIndex();
      
      // Update progress
      this.progressCallback?.({
        totalChunks: 0,
        processedChunks: 0,
        currentOperation: 'chunking'
      });

      const chunks = this.chunkDocument(content);
      const vectors = [];
      const limit = pLimit(AgentRAGService.MAX_CONCURRENT_EMBEDDINGS);
      let processedChunks = 0;

      // Update progress
      this.progressCallback?.({
        totalChunks: chunks.length,
        processedChunks: 0,
        currentOperation: 'embedding'
      });

      // Process chunks in parallel with rate limiting
      const embeddings = await Promise.all(
        chunks.map((chunk, i) => 
          limit(async () => {
            const embedding = await this.generateEmbedding(chunk);
            processedChunks++;
            
            // Update progress
            this.progressCallback?.({
              totalChunks: chunks.length,
              processedChunks,
              currentOperation: 'embedding'
            });

            return {
              id: `${agentId}-${file.name}-${i}`,
              values: embedding,
              metadata: {
                agentId,
                fileId: file.url,
                fileName: file.name,
                chunkIndex: i,
                content: chunk
              }
            };
          })
        )
      );

      // Update progress
      this.progressCallback?.({
        totalChunks: chunks.length,
        processedChunks: chunks.length,
        currentOperation: 'indexing'
      });

      // Batch upsert vectors
      for (let i = 0; i < embeddings.length; i += 100) {
        const batch = embeddings.slice(i, i + 100);
        await index.upsert(batch);
      }

    } catch (error: any) {
      throw new Error(`Failed to process agent file: ${error.message}`);
    }
  }

  async queryAgentKnowledge(agentId: string, query: string, topK: number = 5) {
    try {
      if (!query.trim()) {
        throw new Error('Query cannot be empty');
      }

      // Make API call to our backend endpoint
      const response = await fetch('/api/agents/query-knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          query,
          topK
        })
      });

      if (!response.ok) {
        throw new Error('Failed to query agent knowledge');
      }

      const results = await response.json();
      return results.matches;
    } catch (error: any) {
      console.error('Failed to query agent knowledge:', error);
      throw error;
    }
  }

  async deleteAgentKnowledge(agentId: string) {
    try {
      const response = await fetch('/api/agents/delete-knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId })
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent knowledge');
      }
    } catch (error: any) {
      console.error('Failed to delete agent knowledge:', error);
      throw error;
    }
  }
}

interface RAGProgress {
  subStep: string;
  currentChunk?: number;
  totalChunks?: number;
}

interface ProcessFileForRAGParams {
  file: File;
  agentId: string;
  namespace: string;
  metadata: {
    fileName: string;
    agentName: string;
    userId: string;
  };
  onProgress?: (progress: RAGProgress) => void;
}

export async function processFileForRAG({
  file,
  agentId,
  namespace,
  metadata,
  onProgress
}: ProcessFileForRAGParams): Promise<void> {
  const fileProcessor = new FileProcessor();
  
  try {
    onProgress?.({ subStep: 'Reading and processing file content...' });
    const content = await fileProcessor.processFile(file);
    
    onProgress?.({ subStep: 'Creating content chunks...' });
    const chunks = fileProcessor.createChunks(content);
    
    onProgress?.({ 
      subStep: 'Generating embeddings and storing in Pinecone...',
      totalChunks: chunks.length,
      currentChunk: 0
    });
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      onProgress?.({ 
        subStep: 'Generating embeddings and storing in Pinecone...',
        currentChunk: i + 1,
        totalChunks: chunks.length
      });
      
      const embedding = await generateEmbedding(chunk);
      await storeInPinecone({
        vector: embedding,
        metadata: {
          ...metadata,
          chunk,
          agentId
        },
        namespace
      });
    }
  } catch (error) {
    console.error('Error in RAG processing:', error);
    throw new Error('Failed to process file for RAG system');
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('/api/agents/embedding', {
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

async function storeInPinecone({ vector, metadata, namespace }: { 
  vector: number[], 
  metadata: any, 
  namespace: string 
}): Promise<void> {
  const response = await fetch('/api/agents/pinecone', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vector,
      metadata,
      namespace
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to store in Pinecone');
  }
} 