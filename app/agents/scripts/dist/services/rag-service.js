import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
// Initialize clients
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
});
export class AgentRAGService {
    async getOrCreateIndex() {
        const indexes = await pinecone.listIndexes();
        const indexExists = indexes.indexes?.find(idx => idx.name === AgentRAGService.INDEX_NAME);
        if (!indexExists) {
            await pinecone.createIndex({
                name: AgentRAGService.INDEX_NAME,
                dimension: AgentRAGService.VECTOR_DIMENSION,
                metric: 'cosine',
                spec: {
                    serverless: {
                        cloud: process.env.PINECONE_ENVIRONMENT === 'gcp-starter' ? 'gcp' : 'aws',
                        region: process.env.PINECONE_ENVIRONMENT === 'gcp-starter' ? 'us-central1' : 'us-west-2'
                    }
                }
            });
            // Wait for index to be ready
            let isReady = false;
            while (!isReady) {
                const description = await pinecone.describeIndex(AgentRAGService.INDEX_NAME);
                isReady = description.status.ready;
                if (!isReady) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }
        return pinecone.index(AgentRAGService.INDEX_NAME);
    }
    chunkDocument(text) {
        const chunks = [];
        let currentIndex = 0;
        while (currentIndex < text.length) {
            // Get chunk with overlap
            const chunkEnd = Math.min(currentIndex + AgentRAGService.CHUNK_SIZE, text.length);
            chunks.push(text.slice(currentIndex, chunkEnd));
            // Move to next chunk, accounting for overlap
            currentIndex += AgentRAGService.CHUNK_SIZE - AgentRAGService.CHUNK_OVERLAP;
        }
        return chunks;
    }
    async generateEmbedding(text) {
        const response = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: text,
            encoding_format: "float"
        });
        return response.data[0].embedding;
    }
    async processAgentFile(agentId, file, content) {
        const index = await this.getOrCreateIndex();
        const chunks = this.chunkDocument(content);
        const vectors = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = await this.generateEmbedding(chunk);
            vectors.push({
                id: `${agentId}-${file.name}-${i}`,
                values: embedding,
                metadata: {
                    agentId,
                    fileId: file.url,
                    fileName: file.name,
                    chunkIndex: i,
                    content: chunk
                }
            });
            // Batch upsert if we have 100 vectors or it's the last chunk
            if (vectors.length === 100 || i === chunks.length - 1) {
                await index.upsert(vectors);
                vectors.length = 0; // Clear the array
            }
        }
    }
    async queryAgentKnowledge(agentId, query, topK = 5) {
        const index = await this.getOrCreateIndex();
        const queryEmbedding = await this.generateEmbedding(query);
        const results = await index.query({
            vector: queryEmbedding,
            topK,
            filter: { agentId: { $eq: agentId } },
            includeMetadata: true
        });
        return results.matches
            .filter(match => match.metadata) // Filter out any undefined metadata
            .map(match => ({
            score: match.score || 0,
            content: match.metadata.content,
            fileName: match.metadata.fileName
        }));
    }
    async deleteAgentKnowledge(agentId) {
        const index = await this.getOrCreateIndex();
        await index.deleteMany({
            filter: { agentId: { $eq: agentId } }
        });
    }
}
AgentRAGService.CHUNK_SIZE = 500; // characters
AgentRAGService.CHUNK_OVERLAP = 50;
AgentRAGService.VECTOR_DIMENSION = 1536; // OpenAI ada-002 dimension
AgentRAGService.INDEX_NAME = 'agent-store';
