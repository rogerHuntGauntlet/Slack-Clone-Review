export interface AgentConfig {
  id: string
  name: string
  avatar_url: string
  description: string
  knowledge_base_path: string
  personality: {
    style: string
    traits: string[]
    response_characteristics: {
      tone: string
      format: string
      citation_style: string
    }
  }
  rag_settings: {
    chunk_size: number
    chunk_overlap: number
    similarity_threshold: number
    max_context_chunks: number
  }
} 