import { OpenAI } from 'openai';
import { Pinecone, RecordMetadata, RecordMetadataValue } from '@pinecone-database/pinecone';
import pLimit from 'p-limit';

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || ''
});

// OpenAI client initialization
let openaiClient: OpenAI | null = null;

interface WebSearchMetadata extends Record<string, RecordMetadataValue> {
  agentId: string;
  url: string;
  title: string;
  chunkIndex: number;
  timestamp: number;
  content: string;
}

interface WebSearchChunk {
  id: string;
  content: string;
  metadata: WebSearchMetadata;
}

interface WebSearchRAGProgress {
  totalChunks: number;
  processedChunks: number;
  currentOperation: 'chunking' | 'embedding' | 'indexing';
}

export class WebSearchRAGService {
  private static CHUNK_SIZE = 500; // characters
  private static CHUNK_OVERLAP = 50;
  private static VECTOR_DIMENSION = 1536; // OpenAI ada-002 dimension
  private static MAX_CONCURRENT_EMBEDDINGS = 5;
  private static MAX_CONTENT_LENGTH = 100000; // ~100KB of text per web result
  private static NAMESPACE_PREFIX = 'web-search';

  private progressCallback?: (progress: WebSearchRAGProgress) => void;

  constructor(progressCallback?: (progress: WebSearchRAGProgress) => void) {
    this.progressCallback = progressCallback;
  }

  private getOpenAI(): OpenAI {
    if (!openaiClient) {
      openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || '',
      });
    }
    return openaiClient;
  }

  private async getIndex() {
    const indexName = process.env.PINECONE_INDEX_NAME || 'agents';
    return pinecone.index(indexName);
  }

  private validateContent(content: string) {
    if (content.length > WebSearchRAGService.MAX_CONTENT_LENGTH) {
      throw new Error(`Content too large: ${content.length} characters`);
    }
  }

  private chunkDocument(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + WebSearchRAGService.CHUNK_SIZE, text.length);
      chunks.push(text.slice(start, end));
      start = end - WebSearchRAGService.CHUNK_OVERLAP;
    }
    
    return chunks;
  }

  private async generateEmbedding(text: string) {
    const openai = this.getOpenAI();
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  }

  async processWebSearchResult(agentId: string, url: string, title: string, content: string) {
    this.validateContent(content);
    const chunks = this.chunkDocument(content);
    const index = await this.getIndex();

    let processedChunks = 0;
    const totalChunks = chunks.length;
    const limit = pLimit(WebSearchRAGService.MAX_CONCURRENT_EMBEDDINGS);

    // Generate embeddings and store in Pinecone
    const operations = chunks.map((chunk, idx) => {
      return limit(async () => {
        const embedding = await this.generateEmbedding(chunk);
        const documentChunk: WebSearchChunk = {
          id: `${url}-${idx}`,
          content: chunk,
          metadata: {
            agentId,
            url,
            title,
            chunkIndex: idx,
            timestamp: Date.now(),
            content: chunk,
          },
        };

        await index.upsert([{
          id: documentChunk.id,
          values: embedding,
          metadata: documentChunk.metadata,
        }]);

        processedChunks++;
        this.progressCallback?.({
          totalChunks,
          processedChunks,
          currentOperation: 'embedding',
        });
      });
    });

    await Promise.all(operations);
  }

  async queryWebSearchKnowledge(agentId: string, query: string, topK: number = 5) {
    const openai = this.getOpenAI();
    const index = await this.getIndex();

    const queryEmbedding = await this.generateEmbedding(query);
    
    const results = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: {
        agentId: { $eq: agentId }
      }
    });

    return results.matches.map(match => ({
      content: match.metadata?.content || '',
      url: match.metadata?.url || '',
      title: match.metadata?.title || '',
      score: match.score || 0,
    }));
  }

  async deleteWebSearchKnowledge(agentId: string) {
    const index = await this.getIndex();
    await index.deleteMany({
      filter: {
        agentId: { $eq: agentId }
      }
    });
  }
} 