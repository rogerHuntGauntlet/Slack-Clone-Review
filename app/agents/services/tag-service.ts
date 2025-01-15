import { TagSuggestion } from '../types/agent-types';

export async function generateTagsFromDescription(description: string): Promise<TagSuggestion[]> {
  try {
    const response = await fetch('/api/agents/generate-tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate tags');
    }

    const { tags } = await response.json();
    return tags.map((tag: string) => ({
      tag,
      confidence: 1,
      source: 'llm' as const
    }));
  } catch (error) {
    console.error('Error generating tags:', error);
    return [];
  }
} 