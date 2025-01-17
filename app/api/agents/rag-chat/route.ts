import { OpenAI } from 'openai';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { AgentRAGService } from '@/app/agents/services/rag-service';

interface KnowledgeResult {
  content: string;
  fileName: string;
  score: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { agentId, message, pineconeNamespace } = await request.json();
    const supabase = createRouteHandlerClient({ cookies });

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Verify agent has Pinecone set up
    if (!agent.pinecone_namespace) {
      return NextResponse.json(
        { error: 'Agent does not have RAG enabled, use the direct chat endpoint' },
        { status: 400 }
      );
    }

    // Query relevant knowledge from Pinecone
    const ragService = new AgentRAGService();
    const relevantKnowledge = await ragService.queryAgentKnowledge(agentId, message, 3);

    // Create messages array with context
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are an AI agent named ${agent.name}. ${agent.description || ''}
      
Your goal is to help users by engaging in natural conversation while staying true to your description and purpose.
Please be helpful, friendly, and concise in your responses.

Here is some relevant context from your knowledge base:
${(relevantKnowledge as KnowledgeResult[]).map(k => `
Content: ${k.content}
Source: ${k.fileName}
Relevance Score: ${k.score}
`).join('\n')}

Remember:
- Use the provided context to inform your responses
- Stay in character as defined by your description
- Be direct and to the point
- If you're unsure about something, admit it
- Don't make up information
- Keep responses focused and relevant`
      },
      {
        role: 'user',
        content: message
      }
    ];

    // Get chat completion from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      temperature: 0.7,
      max_tokens: 1000, // Allow longer responses for RAG
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';

    // Store the message and response in the database
    const { error: chatError } = await supabase
      .from('agent_chat_messages')
      .insert([
        {
          agent_id: agentId,
          content: message,
          role: 'user',
          timestamp: new Date().toISOString()
        },
        {
          agent_id: agentId,
          content: response,
          role: 'agent',
          timestamp: new Date().toISOString()
        }
      ]);

    if (chatError) {
      console.error('Error storing chat messages:', chatError);
    }

    return NextResponse.json({
      message: response,
      sources: (relevantKnowledge as KnowledgeResult[]).map(k => ({
        title: k.fileName,
        content: k.content,
        relevance: k.score
      }))
    });

  } catch (error) {
    console.error('Error in RAG chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
} 