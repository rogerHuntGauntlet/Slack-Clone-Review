import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { AuthUser } from '@supabase/supabase-js'
import type { Session, User } from 'next-auth'

// Initialize Supabase client
export const supabase = createClientComponentClient()

// Helper to get redirect URL that uses the current origin
export const getRedirectUrl = () => {
  if (typeof window === 'undefined') return ''
  return 'https://www.ohfpartners.com/access?redirectedfromauth=supabase'
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
async function checkUserPaymentStatus(userId: string): Promise<boolean> {
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

// Auth configuration
export const authConfig = {
  providers: ['github', 'google'] as const,
  callbacks: {
    redirectTo: getRedirectUrl(),
    async session({ session, user }: { session: Session | null; user: User & { id: string } }) {
      // Check if user needs to complete payment
      const needsPayment = await checkUserPaymentStatus(user.id)
      if (needsPayment) {
        return {
          ...session,
          redirectUrl: '/access'
        }
      }
      return session
    }
  },
  // Supabase specific settings
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
} 