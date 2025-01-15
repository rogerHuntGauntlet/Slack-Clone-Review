import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

async function generateEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });
  return response.data[0].embedding;
}

async function getRelevantContext(query: string, topK: number = 3) {
  console.log('Generating embedding for query:', query);
  const queryEmbedding = await generateEmbedding(query);
  
  console.log('Querying Pinecone...');
  const index = pinecone.index(process.env.PHD_PINECONE_INDEX_NAME || 'phd-knowledge');
  const queryResponse = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  });

  console.log('Found matches:', queryResponse.matches.length);
  return queryResponse.matches.map(match => ({
    content: match.metadata?.content || '',
    section: match.metadata?.section || '',
    source: match.metadata?.source || '',
    score: match.score,
  }));
}

export async function POST(req: Request) {
  try {
    const { message, agentId } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('Getting relevant context for:', message);
    const relevantDocs = await getRelevantContext(message, 3);
    
    // Format context for the LLM
    const context = relevantDocs.map(doc => `
Section: ${doc.section}
Source: ${doc.source}
Content: ${doc.content}
---`).join('\n');

    console.log('Generating evaluation with context...');
    
    // Create a new stream
    const stream = new ReadableStream({
      async start(controller) {
        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            {
              role: "system",
              content: `You are a PhD research assistant evaluating ideas through the lens of academic research on platform optimization and innovation. 
Your role is to provide constructive feedback and analysis based on the research framework.

When analyzing ideas, consider:
1. Alignment with research findings
2. Potential implications for stakeholders
3. Technical feasibility
4. Innovation potential
5. Ethical considerations

Format your response in a clear, structured manner with sections for:
- Initial Assessment
- Research Alignment
- Technical Considerations
- Recommendations

Provide your response as a single, coherent stream of text.
`
            },
            {
              role: "user",
              content: `Please analyze this idea using the provided research context:

Research Context:
${context}

Idea to Evaluate:
${message}

Please provide a comprehensive evaluation.`
            }
          ],
          temperature: 0.7,
          max_tokens: 1500,
          stream: true,
        });

        const encoder = new TextEncoder();
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Evaluation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to evaluate idea' },
      { status: 500 }
    );
  }
} 