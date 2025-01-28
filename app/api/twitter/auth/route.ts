import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export async function POST(request: Request) {
  try {
    const { code, state } = await request.json();
    
    if (!code || !state) {
      console.error('Missing code or state in request');
      return NextResponse.json({ 
        error: 'Missing required parameters',
        details: 'Both code and state are required'
      }, { status: 400 });
    }

    // Verify state
    const stateHash = crypto.createHash('sha256').update(state).digest('hex');
    const storedData = global.twitterStates?.get(stateHash);
    
    if (!storedData || storedData.state !== state) {
      console.error('Invalid state or state mismatch');
      return NextResponse.json({ 
        error: 'Invalid state',
        details: 'The state parameter does not match the stored state'
      }, { status: 400 });
    }

    // Initialize the Twitter client
    const client = new TwitterApi({
      clientId: process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });

    try {
      // Exchange the code for access token
      const { accessToken, refreshToken } = await client.loginWithOAuth2({
        code,
        codeVerifier: storedData.codeVerifier,
        redirectUri: 'https://www.ohfpartners.com/horde',
      });

      // Get user info using the access token
      const twitterClient = new TwitterApi(accessToken);
      const me = await twitterClient.v2.me();

      if (!me.data?.id || !me.data?.username) {
        throw new Error('Failed to get user information from Twitter');
      }

      // Save or update the account in Supabase
      const { data: existingAccount, error: checkError } = await supabase
        .from('twitter_accounts')
        .select('id')
        .eq('user_id', me.data.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking existing account:', checkError);
        throw new Error('Failed to check existing account');
      }

      const { error: upsertError } = await supabase
        .from('twitter_accounts')
        .upsert({
          user_id: me.data.id,
          username: me.data.username,
          access_token: accessToken,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        console.error('Error saving Twitter account:', upsertError);
        throw new Error('Failed to save Twitter account');
      }

      // Clean up the stored state
      global.twitterStates?.delete(stateHash);

      return NextResponse.json({ 
        success: true,
        username: me.data.username
      });

    } catch (twitterError: any) {
      console.error('Twitter API error:', twitterError);
      return NextResponse.json({ 
        error: 'Twitter API error',
        details: twitterError.message || 'Error communicating with Twitter'
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Authentication error:', error);
    return NextResponse.json({ 
      error: 'Authentication failed',
      details: error.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
}
