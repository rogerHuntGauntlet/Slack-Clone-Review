import { NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { cwd } from 'process';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Create tmp directory if it doesn't exist
    const tmpDir = join(cwd(), 'tmp');
    await mkdir(tmpDir, { recursive: true });

    // Save the file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = join(tmpDir, `${Date.now()}-${file.name}`);
    await writeFile(tempPath, buffer);

    let text = '';

    // Extract text based on file type
    if (file.name.toLowerCase().endsWith('.pdf')) {
      const data = await pdf(buffer);
      text = data.text;
    } else if (file.name.toLowerCase().endsWith('.docx')) {
      const result = await mammoth.extractRawText({ path: tempPath });
      text = result.value;
    } else if (file.name.toLowerCase().endsWith('.doc')) {
      // For older .doc files, we might need a different library
      // or convert to .docx first using LibreOffice/OpenOffice
      throw new Error('Legacy .doc files are not supported yet');
    } else {
      throw new Error('Unsupported file format');
    }

    // Clean up temp file
    await unlink(tempPath).catch(console.error);

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Text extraction error:', error);
    return NextResponse.json(
      { error: error.message || 'Text extraction failed' },
      { status: 500 }
    );
  }
} 