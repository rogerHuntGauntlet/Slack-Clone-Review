import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { FileType } from '@/app/agents/types/agent-types';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || ''
});

function getFileType(mimeType: string): FileType {
  if (mimeType.startsWith('text/')) return 'text';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'text'; // Default to text
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
    encoding_format: "float"
  });
  return response.data[0].embedding;
}

async function processFileContent(
  file: File,
  agentId: string,
  namespace: string
): Promise<void> {
  console.log(`Processing file ${file.name} for agent ${agentId} in namespace ${namespace}`);
  
  const CHUNK_SIZE = 500;
  const CHUNK_OVERLAP = 50;
  
  // Read file content
  const content = await file.text();
  console.log(`File content length: ${content.length} characters`);
  
  // Split into chunks
  const chunks: string[] = [];
  let currentIndex = 0;
  while (currentIndex < content.length) {
    const chunkEnd = Math.min(currentIndex + CHUNK_SIZE, content.length);
    chunks.push(content.slice(currentIndex, chunkEnd));
    currentIndex += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  console.log(`Split content into ${chunks.length} chunks`);

  // Get Pinecone index
  const index = pinecone.index('agent-store');
  console.log('Got Pinecone index: agent-store');

  // Process chunks
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length}`);
    const chunk = chunks[i];
    const embedding = await generateEmbedding(chunk);
    console.log(`Generated embedding for chunk ${i + 1}`);
    
    // Store in Pinecone
    await index.namespace(namespace).upsert([{
      id: `${agentId}-${file.name}-${i}`,
      values: embedding,
      metadata: {
        agentId,
        fileName: file.name,
        chunkIndex: i,
        content: chunk
      }
    }]);
    console.log(`Stored chunk ${i + 1} in Pinecone namespace ${namespace}`);
  }
  console.log(`Completed processing file ${file.name}`);
}

export async function POST(request: Request) {
  try {
    // Verify environment variables
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    if (!process.env.PINECONE_API_KEY) {
      return NextResponse.json(
        { error: 'Pinecone API key not configured' },
        { status: 500 }
      );
    }

    // Verify authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request data
    const formData = await request.formData();
    const agentId = formData.get('agentId') as string;
    const files = formData.getAll('files') as File[];

    if (!agentId || !files.length) {
      return NextResponse.json(
        { error: 'Agent ID and files are required' },
        { status: 400 }
      );
    }

    // Verify agent belongs to user
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, pinecone_namespace')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      console.error('Agent verification failed:', agentError);
      return NextResponse.json(
        { error: 'Agent not found or access denied' },
        { status: 404 }
      );
    }

    console.log(`Processing ${files.length} files for agent ${agentId}`);
    
    // Process each file
    for (const file of files) {
      await processFileContent(file, agentId, agent.pinecone_namespace);
    }

    console.log('Successfully processed all files');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing files:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process files' },
      { status: 500 }
    );
  }
} 