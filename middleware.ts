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

  // Get current user metadata
  const { data: { user } } = await supabase.auth.getUser()
  const isNewSignup = user?.user_metadata?.is_new_signup === true
  
  console.log('Middleware Debug:', {
    path: req.nextUrl.pathname,
    isNewSignup,
    metadata: user?.user_metadata
  })

  // Check user's setup status
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('username')
    .eq('id', session.user.id)
    .single()

  const { data: workspaces } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', session.user.id)

  const hasProfile = profile?.username
  const hasWorkspaces = workspaces && workspaces.length > 0

  console.log('Middleware Status:', {
    hasProfile,
    hasWorkspaces,
    isNewSignup,
    currentPath: req.nextUrl.pathname
  })

  // If on onboarding page
  if (req.nextUrl.pathname.startsWith('/onboarding')) {
    // If setup is complete, redirect to platform
    if (hasProfile && hasWorkspaces && !isNewSignup) {
      console.log('Middleware: Redirecting to platform - Setup complete')
      return NextResponse.redirect(new URL('/platform', req.url))
    }
    console.log('Middleware: Allowing onboarding access - Setup incomplete')
    return res
  }

  // If on platform or other protected pages
  if (req.nextUrl.pathname.startsWith('/platform') || 
      req.nextUrl.pathname.startsWith('/workspace') || 
      req.nextUrl.pathname.startsWith('/chat')) {
    // If setup is not complete, redirect to onboarding
    if (!hasProfile || !hasWorkspaces || isNewSignup) {
      console.log('Middleware: Redirecting to onboarding - Setup incomplete')
      const onboardingUrl = new URL('/onboarding', req.url)
      onboardingUrl.searchParams.set('status', isNewSignup ? 'new' : (!hasProfile ? 'needs_profile' : 'needs_workspace'))
      return NextResponse.redirect(onboardingUrl)
    }
    console.log('Middleware: Allowing platform access - Setup complete')
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