import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.7,
      max_tokens: 150, // Keep responses brief
    });

    const text = completion.choices[0].message.content || '';
    
    return NextResponse.json({ text });
  } catch (error) {
    console.error('Error in simplify route:', error);
    return NextResponse.json(
      { error: 'Failed to simplify response' },
      { status: 500 }
    );
  }
} 