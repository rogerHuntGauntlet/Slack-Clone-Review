import { NextRequest, NextResponse } from 'next/server';
import { AgentRAGService } from '../../services/rag-service';
import { FileProcessor } from '../../services/file-processor';

const ragService = new AgentRAGService();
const fileProcessor = new FileProcessor();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const agentId = formData.get('agentId') as string;
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as 'text' | 'image' | 'video' | 'audio';

    if (!agentId || !file || !fileType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate file
    try {
      fileProcessor.validateFile(file, fileType);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'File validation failed' },
        { status: 400 }
      );
    }

    // Extract content
    const content = await fileProcessor.extractContent(file, fileType);

    // Process for RAG
    await ragService.processAgentFile(agentId, {
      type: fileType,
      url: '', // Will be set by storage service
      name: file.name,
      size: file.size
    }, content);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('RAG processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process file' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    const query = searchParams.get('query');
    const topK = parseInt(searchParams.get('topK') || '5');

    if (!agentId || !query) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const results = await ragService.queryAgentKnowledge(agentId, query, topK);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('RAG query error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to query knowledge base' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agentId parameter' },
        { status: 400 }
      );
    }

    await ragService.deleteAgentKnowledge(agentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('RAG deletion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete knowledge base' },
      { status: 500 }
    );
  }
} 