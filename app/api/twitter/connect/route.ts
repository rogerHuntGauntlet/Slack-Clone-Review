import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const client = new TwitterApi({
      clientId: process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID!,
    });

    // Use localhost during development
    const redirectUri = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3001/horde'
      : `${process.env.NEXT_PUBLIC_BASE_URL}/horde`;

    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
      redirectUri,
      { 
        scope: [
          'tweet.read',
          'tweet.write',
          'users.read',
          'follows.read',
          'offline.access'
        ]
      }
    );

    // Store the state and code verifier in a secure way
    const crypto = require('crypto');
    const stateHash = crypto.createHash('sha256').update(state).digest('hex');
    
    global.twitterStates = global.twitterStates || new Map();
    global.twitterStates.set(stateHash, { codeVerifier, state });

    console.log('Generated OAuth URL:', url); // For debugging
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error initializing Twitter connection:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize Twitter connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
