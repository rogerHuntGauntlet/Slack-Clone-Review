import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import crypto from 'crypto';

// Define types for Twitter state storage
interface TwitterState {
  codeVerifier: string;
  state: string;
  redirectUri: string;
  timestamp: number;
}

declare global {
  var twitterStates: Map<string, TwitterState>;
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Initialize Twitter client with required credentials
    const client = new TwitterApi({
      clientId: process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });

    // Use the exact callback URL configured in Twitter Developer Portal
    const redirectUri = process.env.NEXT_PUBLIC_TWITTER_CALLBACK_URL || 'https://www.ohfpartners.com/horde';

    // Generate OAuth2 auth link with PKCE
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

    // Store PKCE data securely
    const stateHash = crypto.createHash('sha256').update(state).digest('hex');
    
    // Use a more secure storage method in production
    global.twitterStates = global.twitterStates || new Map<string, TwitterState>();
    global.twitterStates.set(stateHash, { 
      codeVerifier, 
      state,
      redirectUri,
      timestamp: Date.now()
    });

    // Clean up old states (older than 10 minutes)
    const TEN_MINUTES = 10 * 60 * 1000;
    Array.from(global.twitterStates.entries()).forEach(([key, value]) => {
      if (Date.now() - value.timestamp > TEN_MINUTES) {
        global.twitterStates.delete(key);
      }
    });

    console.log('Generated OAuth URL:', url);
    console.log('Using redirect URI:', redirectUri); // Debug log
    
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error initializing Twitter connection:', error);
    
    // Return appropriate error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to initialize Twitter connection',
      details: errorMessage,
      // Don't expose internal errors in production
      ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined })
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
