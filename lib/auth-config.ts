import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Initialize Supabase client
export const supabase = createClientComponentClient()

// Helper to get redirect URL that uses the current origin
export const getRedirectUrl = () => {
  if (typeof window === 'undefined') return ''
  const origin = window.location.origin
  // Remove any reference to ohfpartners.com
  return origin.includes('ohfpartners.com') 
    ? `${new URL(origin).protocol}//${new URL(origin).host}/auth/callback`
    : `${origin}/auth/callback`
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

// Auth configuration
export const authConfig = {
  providers: ['github', 'google'] as const,
  callbacks: {
    redirectTo: getRedirectUrl(),
  },
  // Supabase specific settings
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
} 