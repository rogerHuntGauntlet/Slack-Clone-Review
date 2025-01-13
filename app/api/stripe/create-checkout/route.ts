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
    const { userId, priceId } = await req.json();

    if (!userId || !priceId) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Get user's email from Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Check if user already has a Stripe customer ID
    const { data: paymentRecord } = await supabase
      .from('payment_records')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    let customerId = paymentRecord?.stripe_customer_id;

    // If no customer ID exists, create a new customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: {
          user_id: userId,
        },
      });
      customerId = customer.id;
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/platform?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        user_id: userId,
      },
      allow_promotion_codes: true,
    });

    return new NextResponse(JSON.stringify({ url: session.url }));
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 