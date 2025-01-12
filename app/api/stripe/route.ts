import { headers } from 'next/headers';
import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new NextResponse('Webhook signature verification failed', { status: 400 });
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeletion(deletedSubscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new NextResponse('Webhook processed successfully', { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0].price.id;
  const status = subscription.status;
  const interval = subscription.items.data[0].price.recurring?.interval || 'month';
  const amount = subscription.items.data[0].price.unit_amount! / 100;

  // Get the user_id from the customer metadata
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  const userId = customer.metadata.user_id;

  // Update or create payment record
  const { error } = await supabase
    .from('payment_records')
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      status,
      plan_type: 'premium', // Adjust based on your plan types
      amount,
      currency: subscription.currency,
      interval,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'stripe_subscription_id'
    });

  if (error) {
    console.error('Error updating payment record:', error);
    throw error;
  }
}

async function handleSubscriptionDeletion(subscription: Stripe.Subscription) {
  const { error } = await supabase
    .from('payment_records')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .match({ stripe_subscription_id: subscription.id });

  if (error) {
    console.error('Error updating payment record:', error);
    throw error;
  }
} 