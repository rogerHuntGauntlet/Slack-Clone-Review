import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const error = requestUrl.searchParams.get('error')
    const error_description = requestUrl.searchParams.get('error_description')

    // If there's an error in the OAuth callback, redirect to auth page with error
    if (error || error_description) {
      const errorUrl = new URL('/auth', requestUrl.origin)
      errorUrl.searchParams.set('error', error_description || error || 'Unknown error')
      return NextResponse.redirect(errorUrl)
    }

    // If we have a code, exchange it for a session
    if (code) {
      const supabase = createClient()
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        const errorUrl = new URL('/auth', requestUrl.origin)
        errorUrl.searchParams.set('error', 'Failed to create session')
        return NextResponse.redirect(errorUrl)
      }

      // Successful authentication, redirect to access page
      return NextResponse.redirect(new URL('/access', requestUrl.origin))
    }

    // No code and no error, redirect to auth page
    return NextResponse.redirect(new URL('/auth', requestUrl.origin))
  } catch (error) {
    console.error('Callback error:', error)
    const errorUrl = new URL('/auth', request.url)
    errorUrl.searchParams.set('error', 'Internal server error')
    return NextResponse.redirect(errorUrl)
  }
} 