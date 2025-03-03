import { createBrowserClient } from '@supabase/ssr'
import type { AuthUser } from '@supabase/supabase-js'

// Initialize Supabase client
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Helper to get redirect URL that uses the current origin
export const getRedirectUrl = () => {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/api/auth/callback`
}

// Email configuration
export const emailConfig = {
  senderEmail: 'ohfpartners@ideatrek.io',
  senderName: 'OHF Partners',
  smtp: {
    host: 'ideatrek.io',
    port: 465,
    secure: true,
    auth: {
      user: process.env.NEXT_PUBLIC_SMTP_USER,
      pass: process.env.NEXT_PUBLIC_SMTP_PASS
    }
  }
}

// Function to check user payment status
export async function checkUserPaymentStatus(userId: string): Promise<boolean> {
  try {
    // Check for any active access record (payment, riddle, or founder code)
    const { data: accessRecord } = await supabase
      .from('access_records')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    // If user has active access through riddle or founder code
    if (accessRecord?.access_type === 'riddle' || accessRecord?.access_type === 'founder_code') {
      return false; // No payment needed
    }

    // Check for active subscription
    const { data: paymentRecord } = await supabase
      .from('payment_records')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    // Check if subscription exists and is not expired
    if (paymentRecord) {
      const currentPeriodEnd = new Date(paymentRecord.current_period_end);
      const now = new Date();
      return currentPeriodEnd < now; // Needs payment if subscription expired
    }

    // No active subscription found
    return true; // Needs payment
  } catch (error) {
    console.error('Error checking payment status:', error);
    return true; // Default to requiring payment on error
  }
}

// Supabase auth configuration
export const supabaseAuthConfig = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
} 