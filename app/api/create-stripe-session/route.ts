import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseClient } from '@/lib/supabase'

// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

if (!process.env.NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID) {
  throw new Error('NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID is not set in environment variables');
}

// For local development, use localhost if BASE_URL is not set
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia'
})

export async function POST(req: Request) {
  try {
    const { userId, email } = await req.json()
    
    if (!userId || !email) {
      console.error('Missing fields:', { userId, email })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('Creating Stripe session with:', {
      email,
      userId,
      priceId: process.env.NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID,
      baseUrl: BASE_URL
    })

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      metadata: {
        userId: userId
      },
      line_items: [
        {
          price: process.env.NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${BASE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/pricing`,
    })

    return NextResponse.json({ sessionUrl: session.url })
  } catch (error: any) {
    console.error('Stripe session creation error details:', {
      message: error.message,
      type: error.type,
      stack: error.stack
    })
    return NextResponse.json(
      { error: error.message || 'Failed to create payment session' },
      { status: 500 }
    )
  }
} 