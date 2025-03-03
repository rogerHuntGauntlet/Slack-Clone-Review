import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify payment status
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment has not been completed' },
        { status: 400 }
      );
    }

    const supabase = createClient({ cookies });
    
    // Get the current user session
    const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession();
    
    let userSession;
    if (sessionError || !supabaseSession) {
      console.log("no session found, checking for cookie: ")
      try {
        const cookieStore = cookies();
        const cookie = cookieStore.get('sb-session');
        if (cookie) {
          userSession = JSON.parse(cookie.value);
          console.log("session from cookie: ", userSession)
        } else {
          throw new Error('No session cookie found');
        }
      } catch (err) {
        console.error('Session error:', err);
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        );
      }
    } else {
      userSession = supabaseSession;
    }

    if (!userSession?.user?.id) {
      return NextResponse.json(
        { error: 'No user ID found in session' },
        { status: 401 }
      );
    }

    // Verify the user matches the payment
    if (session.customer_email !== userSession.user.email) {
      return NextResponse.json(
        { error: 'Payment session does not match current user' },
        { status: 403 }
      );
    }

    // Update user's access in database
    const { error: updateError } = await supabase
      .from('user_access')
      .upsert({
        user_id: userSession.user.id,
        access_type: 'lifetime',
        payment_id: session.payment_intent as string,
        updated_at: new Date().toISOString(),
      });

    if (updateError) {
      console.error('Error updating user access:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user access' },
        { status: 500 }
      );
    }

    // Update user metadata to indicate payment completion
    const { error: metadataError } = await supabase.auth.updateUser({
      data: { 
        has_completed_payment: true,
        is_new_signup: true // Set this to ensure they go through onboarding
      }
    });

    if (metadataError) {
      console.error('Error updating user metadata:', metadataError);
      return NextResponse.json(
        { error: 'Failed to update user metadata' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Payment verification error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      const status = error.statusCode || 500;
      const message = error.message || 'Payment verification failed';
      
      return NextResponse.json(
        { error: message },
        { status }
      );
    }

    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
} 