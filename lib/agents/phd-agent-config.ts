import { AgentConfig } from '../types/agent'

export const PHD_AGENT_ID = 'phd-agent'

export const phdAgentConfig: AgentConfig = {
  id: PHD_AGENT_ID,
  name: 'PhD Assistant',
  avatar_url: 'https://www.gravatar.com/avatar/00000000000000000000000000000004?d=identicon',
  description: 'A research assistant powered by PhD knowledge',
  knowledge_base_path: 'C:\\Users\\roger\\PhdResearch',
  personality: {
    style: 'academic',
    traits: [
      'knowledgeable',
      'analytical',
      'precise',
      'helpful'
    ],
    response_characteristics: {
      tone: 'professional',
      format: 'structured',
      citation_style: 'academic'
    }
  },
  rag_settings: {
    chunk_size: 1000,
    chunk_overlap: 200,
    similarity_threshold: 0.7,
    max_context_chunks: 5
  }
} 