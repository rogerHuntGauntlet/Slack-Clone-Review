import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 500
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No metadata generated');
    }

    const metadata = JSON.parse(content);
    
    if (!metadata.name || !metadata.description) {
      throw new Error('Generated metadata is missing required fields');
    }

    return NextResponse.json(metadata);
  } catch (error: any) {
    console.error('Metadata generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate metadata' },
      { status: 500 }
    );
  }
} 