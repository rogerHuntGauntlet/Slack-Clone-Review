import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    // Get all Twitter accounts
    const { data: accounts, error } = await supabase
      .from('twitter_accounts')
      .select('user_id, username')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching Twitter accounts:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch accounts',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({ accounts: accounts || [] });
  } catch (error: any) {
    console.error('Error in accounts route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newAccount = await request.json();

    if (!newAccount.userId) {
      return NextResponse.json({ 
        error: 'Missing userId parameter'
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('twitter_accounts')
      .insert([newAccount]);

    if (error) {
      console.error('Error creating Twitter account:', error);
      return NextResponse.json({ 
        error: 'Failed to create Twitter account',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Failed to create Twitter account',
      details: error.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ 
        error: 'Missing user ID',
        details: 'User ID is required'
      }, { status: 400 });
    }

    // Delete the account
    const { error } = await supabase
      .from('twitter_accounts')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting Twitter account:', error);
      return NextResponse.json({ 
        error: 'Failed to delete account',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in delete account route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
