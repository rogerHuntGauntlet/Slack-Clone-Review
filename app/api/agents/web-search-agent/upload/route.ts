import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { WebSearchStorageService } from '@/app/agents/web-search-agent/services/web-search-storage-service';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const agentId = formData.get('agentId') as string;

    if (!files.length || !agentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate file types and sizes
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    for (const file of files) {
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds maximum size of 10MB` },
          { status: 400 }
        );
      }
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `File type ${file.type} not supported` },
          { status: 400 }
        );
      }
    }

    // Process files
    const storageService = new WebSearchStorageService(agentId);
    const uploadedFiles = await storageService.uploadFiles(files);

    return NextResponse.json(uploadedFiles);
  } catch (error) {
    console.error('Error in file upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 