import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { cwd } from 'process';
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Save the file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = join(cwd(), 'tmp', `${Date.now()}-${file.name}`);
    await writeFile(tempPath, buffer);

    // Create a readable stream from the file
    const fileStream = fs.createReadStream(tempPath);

    // Transcribe using Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      language: 'en',
    });

    // Clean up temp file
    await unlink(tempPath).catch(console.error);

    return NextResponse.json({ text: transcription.text });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: error.message || 'Transcription failed' },
      { status: 500 }
    );
  }
} 