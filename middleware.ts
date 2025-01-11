import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is not authenticated and trying to access protected routes, redirect to auth
  if (!session) {
    const isProtectedRoute = req.nextUrl.pathname.startsWith('/workspace') ||
      req.nextUrl.pathname.startsWith('/chat') ||
      req.nextUrl.pathname.startsWith('/platform') ||
      req.nextUrl.pathname.startsWith('/onboarding')

    if (isProtectedRoute) {
      const authUrl = new URL('/auth', req.url)
      authUrl.searchParams.set('next', req.nextUrl.pathname)
      return NextResponse.redirect(authUrl)
    }
    return res
  }

  // Skip checks for auth and callback routes
  if (req.nextUrl.pathname.startsWith('/auth')) {
    return res
  }

  // For all other routes (except onboarding), check if user needs onboarding
  if (!req.nextUrl.pathname.startsWith('/onboarding')) {
    // Check if user has a profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    // Check if user has any workspaces
    const { data: workspaces, error: workspacesError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', session.user.id)

    const hasProfile = profile && !profileError
    const hasWorkspaces = workspaces && workspaces.length > 0
    const isNewSignup = session.user.user_metadata?.is_new_signup === true

    // Only redirect to onboarding if user needs it
    if (!hasProfile || !hasWorkspaces || isNewSignup) {
      let status = 'returning'
      if (isNewSignup) {
        status = 'new'
      } else if (!hasProfile) {
        status = 'needs_profile'
      } else if (!hasWorkspaces) {
        status = 'needs_workspace'
      }

      const onboardingUrl = new URL('/onboarding', req.url)
      onboardingUrl.searchParams.set('status', status)
      return NextResponse.redirect(onboardingUrl)
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 