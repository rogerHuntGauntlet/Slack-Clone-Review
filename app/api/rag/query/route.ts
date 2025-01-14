import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

interface DateRange {
    start: string | null;
    end: string | null;
}

interface SearchFilters {
    channels: string[];
    dateRange: DateRange;
}

interface SearchRequest {
    query: string;
    workspaceId: string;
    filters: SearchFilters;
}

interface PineconeFilter {
    workspaceId: string;
    channelId?: { $in: string[] };
    timestamp?: {
        $gte?: number;
        $lte?: number;
    };
}

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function generateEmbedding(text: string) {
    console.log('[OpenAI] Generating embedding for text length:', text.length);
    const startTime = Date.now();
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: text,
            encoding_format: "float"
        });
        console.log('[OpenAI] Embedding generated successfully in', Date.now() - startTime, 'ms');
        return response.data[0].embedding;
    } catch (error) {
        console.error('[OpenAI] Error generating embedding:', error);
        if (error instanceof Error) {
            console.error('[OpenAI] Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
        }
        throw error;
    }
}

export async function POST(request: Request) {
    try {
        console.log('[RAG Query] Processing request...');
        const { query, workspaceId, filters } = (await request.json()) as SearchRequest;
        const indexName = process.env.PINECONE_INDEX_NAME || 'slack-rag';
        
        if (!query || typeof query !== 'string') {
            console.error('[RAG Query] Invalid query:', query);
            return NextResponse.json({ 
                error: 'Invalid query',
                details: 'The search query must be a non-empty string.'
            }, { status: 400 });
        }
        
        console.log('[RAG Query] Query input:', { query, workspaceId, filters });
        
        // Get or initialize the index
        console.log('[Pinecone] Listing indexes...');
        const indexes = await pinecone.listIndexes();
        const index = indexes.indexes?.find(idx => idx.name === indexName);
        
        if (!index) {
            console.error('[Pinecone] Index not found:', indexName);
            return NextResponse.json({ 
                error: `Index ${indexName} not found`,
                details: 'The search index is not available.'
            }, { status: 404 });
        }

        console.log('[Pinecone] Using index:', indexName);
        const vectorStore = pinecone.Index(indexName);
        
        // Generate embedding for the query
        console.log('[RAG Query] Generating query embedding...');
        const queryEmbedding = await generateEmbedding(query);
        
        // Build filter based on workspace and other filters
        const filter: PineconeFilter = {
            workspaceId
        };
        
        if (filters?.channels?.length > 0) {
            filter.channelId = { $in: filters.channels };
        }
        
        if (filters?.dateRange?.start || filters?.dateRange?.end) {
            filter.timestamp = {};
            if (filters.dateRange.start && typeof filters.dateRange.start === 'string') {
                const startDate = new Date(filters.dateRange.start);
                if (!isNaN(startDate.getTime())) {
                    filter.timestamp.$gte = startDate.getTime();
                }
            }
            if (filters.dateRange.end && typeof filters.dateRange.end === 'string') {
                const endDate = new Date(filters.dateRange.end);
                if (!isNaN(endDate.getTime())) {
                    filter.timestamp.$lte = endDate.getTime();
                }
            }
        }
        
        // Query vector store
        console.log('[Pinecone] Querying vector store with filter:', filter);
        const results = await vectorStore.query({
            vector: queryEmbedding,
            topK: 5,
            filter,
            includeMetadata: true
        });
        
        console.log('[RAG Query] Found', results.matches.length, 'matches');
        
        // Format results
        const sources = results.matches.map(match => ({
            content: match.metadata?.content || '',
            channelName: match.metadata?.channelId || 'unknown',
            timestamp: match.metadata?.timestamp 
                ? new Date(typeof match.metadata.timestamp === 'number' ? match.metadata.timestamp : 0).toISOString()
                : '',
            userId: match.metadata?.userId || '',
            score: match.score || 0
        }));
        
        // Generate answer using OpenAI
        console.log('[RAG Query] Generating answer from sources...');
        const context = sources.map(s => `Message: ${s.content}\nFrom: ${s.userId}\nChannel: ${s.channelName}\nTime: ${s.timestamp}\n`).join('\n');
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: `You are a helpful assistant that analyzes conversation history from a Slack-like chat application.
Your task is to:
1. Understand the context from the provided messages
2. Answer the user's question by synthesizing information from these messages
3. Provide relevant quotes or examples from the messages to support your answer
4. If the context doesn't contain enough information to answer the question, clearly state that

Format your response in a clear, structured way:

Answer: [Your direct answer to the question]
Analysis: [Your analysis of the relevant messages and how they support your answer]
Supporting Evidence: [Relevant quotes from the messages]
Additional Context: [Any important context or caveats about your answer]`
                },
                {
                    role: "user",
                    content: `Context:\n${context}\n\nQuestion: ${query}`
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });
        
        const answer = completion.choices[0].message.content || '';
        console.log('[RAG Query] Generated answer:', answer);
        
        return NextResponse.json({ 
            answer,
            sources,
            processingTime: Date.now() - Date.now()
        });
        
    } catch (error) {
        console.error('[RAG Query] Error processing request:', error);
        if (error instanceof Error) {
            console.error('[RAG Query] Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // Handle specific error types
            if (error.message.includes('API key')) {
                return NextResponse.json({ 
                    error: 'Service configuration error',
                    details: 'The search service is not properly configured. Please check API keys.'
                }, { status: 503 });
            }
            
            if (error.message.includes('not found')) {
                return NextResponse.json({ 
                    error: 'Search index not found',
                    details: 'The search index is not available. Please check Pinecone configuration.'
                }, { status: 503 });
            }
        }
        
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'An unknown error occurred'
        }, { status: 500 });
    }
} 