import { WebSearchRAGService } from '../web-search-rag-service';
import { OpenAI } from 'openai';
import { Pinecone, QueryResponse, RecordMetadata } from '@pinecone-database/pinecone';
import { expect, jest, describe, it, beforeEach } from '@jest/globals';

// Mock OpenAI
const mockOpenAIResponse = {
  data: [{ embedding: Array(1536).fill(0.1) }]
};

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue(mockOpenAIResponse)
    }
  }))
}));

// Mock Pinecone
const mockQueryResponse: QueryResponse<RecordMetadata> = {
  matches: [
    {
      id: 'test-id',
      metadata: {
        content: 'test content',
        url: 'https://test.com',
        title: 'Test Page',
      },
      score: 0.9,
      values: [],
    }
  ],
  namespace: 'test-namespace'
};

const mockPineconeIndex = {
  upsert: jest.fn().mockResolvedValue({ upsertedCount: 1 }),
  query: jest.fn().mockResolvedValue(mockQueryResponse),
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 })
};

jest.mock('@pinecone-database/pinecone', () => ({
  Pinecone: jest.fn().mockImplementation(() => ({
    index: jest.fn().mockReturnValue(mockPineconeIndex)
  }))
}));

describe('WebSearchRAGService', () => {
  let service: WebSearchRAGService;
  let progressCallback: jest.Mock;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    progressCallback = jest.fn();
    service = new WebSearchRAGService(progressCallback);
  });

  describe('processWebSearchResult', () => {
    const testParams = {
      agentId: 'test-agent',
      url: 'https://test.com',
      title: 'Test Page',
      content: 'This is a test content that will be chunked and processed.'
    };

    it('should process content and store embeddings', async () => {
      await service.processWebSearchResult(
        testParams.agentId,
        testParams.url,
        testParams.title,
        testParams.content
      );

      // Verify OpenAI embeddings were called
      expect(OpenAI).toHaveBeenCalled();

      // Verify Pinecone upsert was called
      expect(mockPineconeIndex.upsert).toHaveBeenCalled();

      // Verify progress callback was called
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(expect.objectContaining({
        currentOperation: 'embedding'
      }));
    });

    it('should throw error for content exceeding max length', async () => {
      const longContent = 'a'.repeat(100001); // Exceeds MAX_CONTENT_LENGTH

      await expect(
        service.processWebSearchResult(
          testParams.agentId,
          testParams.url,
          testParams.title,
          longContent
        )
      ).rejects.toThrow('Content too large');
    });

    it('should handle empty content', async () => {
      await service.processWebSearchResult(
        testParams.agentId,
        testParams.url,
        testParams.title,
        ''
      );

      expect(mockPineconeIndex.upsert).not.toHaveBeenCalled();
    });
  });

  describe('queryWebSearchKnowledge', () => {
    it('should query and return formatted results', async () => {
      const results = await service.queryWebSearchKnowledge(
        'test-agent',
        'test query'
      );

      // Verify OpenAI embeddings were called for query
      expect(OpenAI).toHaveBeenCalled();

      // Verify Pinecone query was called
      expect(mockPineconeIndex.query).toHaveBeenCalledWith(expect.objectContaining({
        filter: {
          agentId: { $eq: 'test-agent' }
        }
      }));

      // Verify results format
      expect(results).toEqual([
        {
          content: 'test content',
          url: 'https://test.com',
          title: 'Test Page',
          score: 0.9
        }
      ]);
    });

    it('should handle no results', async () => {
      // Mock Pinecone to return no matches for this test
      const emptyResponse: QueryResponse<RecordMetadata> = {
        matches: [],
        namespace: 'test-namespace'
      };
      mockPineconeIndex.query.mockResolvedValueOnce(emptyResponse);

      const results = await service.queryWebSearchKnowledge(
        'test-agent',
        'test query'
      );

      expect(results).toEqual([]);
    });

    it('should use default topK value', async () => {
      await service.queryWebSearchKnowledge('test-agent', 'test query');

      expect(mockPineconeIndex.query).toHaveBeenCalledWith(expect.objectContaining({
        topK: 5
      }));
    });

    it('should use custom topK value', async () => {
      await service.queryWebSearchKnowledge('test-agent', 'test query', 10);

      expect(mockPineconeIndex.query).toHaveBeenCalledWith(expect.objectContaining({
        topK: 10
      }));
    });
  });

  describe('deleteWebSearchKnowledge', () => {
    it('should delete knowledge for specific agent', async () => {
      await service.deleteWebSearchKnowledge('test-agent');

      expect(mockPineconeIndex.deleteMany).toHaveBeenCalledWith({
        filter: {
          agentId: { $eq: 'test-agent' }
        }
      });
    });
  });

  describe('private methods', () => {
    it('should chunk document correctly', async () => {
      const content = 'a'.repeat(1000);
      // @ts-ignore - accessing private method for testing
      const chunks = service.chunkDocument(content);
      
      // Verify chunk size and overlap
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].length).toBeLessThanOrEqual(500); // CHUNK_SIZE
      
      // Verify overlap
      const overlap = chunks[0].slice(-50); // CHUNK_OVERLAP
      expect(chunks[1].startsWith(overlap)).toBe(true);
    });

    it('should generate embeddings', async () => {
      // @ts-ignore - accessing private method for testing
      const embedding = await service.generateEmbedding('test');
      
      expect(embedding).toHaveLength(1536); // VECTOR_DIMENSION
      expect(embedding).toEqual(expect.arrayContaining([0.1]));
    });
  });
}); 