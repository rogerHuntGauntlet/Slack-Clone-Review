import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize clients
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

interface IdeaCheckResponse {
    analysis: string;
    relevantSections: string[];
    suggestedImprovements?: string[];
}

async function generateEmbedding(text: string) {
    const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
        encoding_format: "float"
    });
    return response.data[0].embedding;
}

async function getRelevantContext(query: string, topK: number = 3) {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Search Pinecone
    const indexName = process.env.PHD_PINECONE_INDEX_NAME || 'phd-knowledge';
    const namespace = process.env.PHD_PINECONE_NAMESPACE || 'research';
    
    const index = pinecone.Index(indexName);
    const queryResponse = await index.namespace(namespace).query({
        topK,
        includeMetadata: true,
        vector: queryEmbedding
    });

    return queryResponse.matches.map(match => ({
        content: match.metadata?.content || '',
        section: match.metadata?.section || '',
        source: match.metadata?.source || '',
        score: match.score
    }));
}

async function checkIdea(idea: string): Promise<IdeaCheckResponse> {
    // Get relevant context from the research
    const relevantDocs = await getRelevantContext(idea, 3);
    
    // Format context for the LLM
    const context = relevantDocs.map(doc => `
Section: ${doc.section}
Source: ${doc.source}
Content: ${doc.content}
---`).join('\n');

    // Create prompt for the LLM
    const prompt = `You are an AI research assistant analyzing ideas through the lens of a PhD thesis on platform optimization and innovation. Your role is to provide constructive feedback and analysis based on the research framework.

Context from the research:
${context}

User's idea:
${idea}

Please analyze this idea considering:
1. How it aligns with or challenges the research framework
2. Potential implications for stakeholder value and ethical outcomes
3. Practical considerations for implementation
4. Suggestions for improvement or further development

Provide your analysis in a clear, constructive manner that helps the user understand both the strengths and areas for improvement in their idea.`;

    // Get LLM response
    const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
    });

    const analysis = completion.choices[0].message.content || '';
    const suggestions = extractSuggestions(analysis);

    return {
        analysis,
        relevantSections: relevantDocs.map(doc => doc.section).filter((section): section is string => typeof section === 'string'),
        suggestedImprovements: suggestions.length > 0 ? suggestions : []
    };
}

function extractSuggestions(analysis: string): string[] {
    // Extract suggestions from the analysis
    // This is a simple implementation - could be made more sophisticated
    return analysis
        .split('\n')
        .filter(line => line.toLowerCase().includes('suggest') || line.toLowerCase().includes('improve'))
        .map(line => line.trim())
        .filter(Boolean);
}

// Export for use in API routes
export { checkIdea, IdeaCheckResponse };

// Example usage for testing
async function test() {
    try {
        const response = await checkIdea("I want to create an AI-powered platform that optimizes supply chain operations while ensuring ethical considerations and stakeholder value.");
        console.log('Analysis:', response.analysis);
        console.log('\nRelevant Sections:', response.relevantSections);
        console.log('\nSuggestions:', response.suggestedImprovements);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run test
test(); 