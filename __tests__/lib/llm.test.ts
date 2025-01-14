import { countTokens, truncateContext, handleLLMError } from '@/lib/llm';

describe('LLM Utilities', () => {
  describe('countTokens', () => {
    it('should estimate token count for a given text', () => {
      const text = 'This is a test message';
      const count = countTokens(text);
      expect(count).toBeGreaterThan(0);
    });

    it('should handle empty text', () => {
      const count = countTokens('');
      expect(count).toBe(0);
    });
  });

  describe('truncateContext', () => {
    it('should not truncate text within token limit', () => {
      const text = 'Short text';
      const truncated = truncateContext(text, 100);
      expect(truncated).toBe(text);
    });

    it('should truncate text exceeding token limit', () => {
      const longText = 'a'.repeat(10000);
      const truncated = truncateContext(longText, 100);
      expect(truncated.length).toBeLessThan(longText.length);
      expect(truncated).toMatch(/\.\.\.$/);
    });
  });

  describe('handleLLMError', () => {
    it('should return fallback response on error', async () => {
      const error = new Error('Test error');
      const response = await handleLLMError(error, 'test query');
      expect(response).toBeTruthy();
      expect(typeof response).toBe('string');
    });
  });
}); 