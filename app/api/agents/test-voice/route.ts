import { NextResponse } from 'next/server';

export async function GET() {
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;

  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: 'No API key found' }, { status: 500 });
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ 
        error: 'API key test failed',
        status: response.status,
        details: error
      }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ 
      success: true, 
      voices: data.voices?.length || 0,
      keyPrefix: ELEVENLABS_API_KEY.substring(0, 8) + '...'
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 