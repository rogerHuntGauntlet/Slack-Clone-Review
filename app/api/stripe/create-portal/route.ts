import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Initialize Supabase client with service role for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Get user's payment record from Supabase
    const { data: paymentRecord } = await supabase
      .from('payment_records')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (!paymentRecord?.stripe_customer_id) {
      return new NextResponse('No subscription found', { status: 404 });
    }

    // Create a Stripe billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: paymentRecord.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/access`,
    });

    return new NextResponse(JSON.stringify({ url: session.url }));
  } catch (error) {
    console.error('Error creating portal session:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 