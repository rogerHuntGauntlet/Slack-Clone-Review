import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ensureUniversalWorkspaceMembership } from './lib/supabase/onboarding'

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS = 50 // Maximum requests per window
const ipRequestMap = new Map<string, { count: number; timestamp: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const requestData = ipRequestMap.get(ip)

  if (!requestData) {
    ipRequestMap.set(ip, { count: 1, timestamp: now })
    return false
  }

  if (now - requestData.timestamp > RATE_LIMIT_WINDOW) {
    ipRequestMap.set(ip, { count: 1, timestamp: now })
    return false
  }

  if (requestData.count >= MAX_REQUESTS) {
    return true
  }

  requestData.count++
  return false
}

export async function middleware(req: NextRequest) {
  // Get client IP
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown'

  // Check rate limit for auth routes
  if (req.nextUrl.pathname.startsWith('/auth') && isRateLimited(ip)) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession()

  // If we have a session and user, ensure they're in the OHF Community workspace
  if (session?.user) {
    try {
      // Run this in the background without blocking the response
      ensureUniversalWorkspaceMembership(session.user.id).catch(error => {
        console.error('Error ensuring workspace membership:', error)
      })
    } catch (error) {
      // Log error but don't block the request
      console.error('Error in workspace membership check:', error)
    }
  }

  // Handle auth redirects
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
  const isAccessPage = req.nextUrl.pathname.startsWith('/access')
  
  if (!session && !isAuthPage && !req.nextUrl.pathname.startsWith('/api')) {
    // Redirect to login if no session
    const redirectUrl = new URL('/auth', req.url)
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (session?.redirectUrl && !isAccessPage) {
    // Redirect to payment if needed
    return NextResponse.redirect(new URL(session.redirectUrl, req.url))
  }

  return res
}

// Specify which routes should be protected
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
} 