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
    try {
      await mkdir(tmpDir, { recursive: true });
    } catch (error) {
      console.error('Error creating tmp directory:', error);
      return NextResponse.json(
        { error: 'Failed to create temporary directory' },
        { status: 500 }
      );
    }

    // Save the file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = join(tmpDir, `${Date.now()}-${file.name}`);
    
    try {
      await writeFile(tempPath, buffer);
    } catch (error) {
      console.error('Error writing temporary file:', error);
      return NextResponse.json(
        { error: 'Failed to save file temporarily' },
        { status: 500 }
      );
    }

    let text = '';

    try {
      // Extract text based on file type
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const data = await pdf(buffer);
        text = data.text;
      } else if (file.name.toLowerCase().endsWith('.docx')) {
        const result = await mammoth.extractRawText({ path: tempPath });
        text = result.value;
      } else if (file.name.toLowerCase().endsWith('.doc')) {
        throw new Error('Legacy .doc files are not supported yet');
      } else {
        throw new Error('Unsupported file format');
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      // Clean up temp file
      await unlink(tempPath).catch(console.error);
      return NextResponse.json(
        { error: 'Failed to extract text from file' },
        { status: 500 }
      );
    }

    // Clean up temp file
    try {
      await unlink(tempPath);
    } catch (error) {
      console.error('Error cleaning up temporary file:', error);
      // Non-blocking error - we still return the text
    }

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Text extraction error:', error);
    return NextResponse.json(
      { error: error.message || 'Text extraction failed' },
      { status: 500 }
    );
  }
} 