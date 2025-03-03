import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
    
    // After exchanging the code, immediately redirect to access page
    return NextResponse.redirect(new URL('/access', requestUrl.origin))
  }

  // No auth code, redirect to auth page
  return NextResponse.redirect(new URL('/auth', requestUrl.origin))
} 