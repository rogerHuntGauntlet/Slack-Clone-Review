import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  try {
    // Check if we're on the client side
    if (typeof window !== 'undefined') {
      return NextResponse.json({ available: false });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ available: false });
    }

    const openai = new OpenAI({ apiKey });
    
    // Try a simple API call to verify the key works
    try {
      await openai.models.list();
      return NextResponse.json({ available: true });
    } catch (apiError) {
      console.error('OpenAI API call failed:', apiError);
      return NextResponse.json({ available: false });
    }
  } catch (error) {
    console.error('OpenAI check failed:', error);
    return NextResponse.json({ available: false });
  }
} 