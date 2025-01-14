import { processDMMessage, formatMessageHistory, getSuggestedResponse } from '@/lib/langchain-dm';
import { expect } from 'chai';

// Mock message history for testing
const mockHistory = [
  {
    role: 'user' as const,
    content: 'Hello, how are you?',
    timestamp: '2024-01-15T10:00:00Z'
  },
  {
    role: 'assistant' as const,
    content: 'I\'m doing well, thank you! How can I help you today?',
    timestamp: '2024-01-15T10:00:01Z'
  }
];

// Mock messages from database
const mockDbMessages = [
  {
    user_id: '123',
    content: 'Hello, how are you?',
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    user_id: '00000000-0000-0000-0000-000000000001',
    content: 'I\'m doing well, thank you! How can I help you today?',
    created_at: '2024-01-15T10:00:01Z'
  }
];

describe('Langchain DM Processing', () => {
  describe('formatMessageHistory', () => {
    it('should correctly format database messages to message history', () => {
      const formatted = formatMessageHistory(mockDbMessages);
      expect(formatted).to.deep.equal(mockHistory);
    });

    it('should handle empty message array', () => {
      const formatted = formatMessageHistory([]);
      expect(formatted).to.deep.equal([]);
    });
  });

  describe('processDMMessage', () => {
    it('should process a message and return a response', async () => {
      const response = await processDMMessage('Hello', mockHistory);
      expect(typeof response).to.equal('string');
      expect(response.length).to.be.greaterThan(0);
    });

    it('should handle streaming callbacks', async () => {
      const tokens: string[] = [];
      const onToken = (token: string) => tokens.push(token);

      await processDMMessage('Hello', mockHistory, onToken);
      expect(tokens.length).to.be.greaterThan(0);
    });

    it('should throw error for invalid input', async () => {
      try {
        await processDMMessage('', []);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe('getSuggestedResponse', () => {
    it('should return a suggested response based on history', async () => {
      const suggestion = await getSuggestedResponse(mockHistory);
      expect(typeof suggestion).to.equal('string');
      expect(suggestion.length).to.be.greaterThan(0);
    });

    it('should handle empty history', async () => {
      const suggestion = await getSuggestedResponse([]);
      expect(typeof suggestion).to.equal('string');
    });
  });
}); 