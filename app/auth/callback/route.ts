import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { addUserToUniversalWorkspace } from '@/lib/supabase'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.redirect(new URL('/auth?error=auth_failed', requestUrl.origin))
    }

    if (!user) {
      console.log('No user found in session')
      return NextResponse.redirect(new URL('/auth?error=no_user', requestUrl.origin))
    }

    try {
      // Only check if user has a profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      // If user has a profile, go to platform, otherwise onboarding
      if (profile && !profileError) {
        return NextResponse.redirect(new URL('/platform', requestUrl.origin))
      } else {
        return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
      }
    } catch (error) {
      console.error('Error in auth callback:', error)
      return NextResponse.redirect(new URL('/auth?error=callback_failed', requestUrl.origin))
    }
  }

  // No auth code, redirect to auth page
  return NextResponse.redirect(new URL('/auth', requestUrl.origin))
}
