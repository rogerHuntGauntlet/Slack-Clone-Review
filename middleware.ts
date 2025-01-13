import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  console.log('🚀 Middleware: Starting execution for path:', req.nextUrl.pathname)
  
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  console.log('📝 Middleware: Checking session...')
  console.log('🍪 Cookies present:', req.cookies.getAll())
  
  // Try to get session from Supabase
  const {
    data: { session },
    error
  } = await supabase.auth.getSession()

  // If no Supabase session, check for session cookie
  const sessionCookie = req.cookies.get('session')
  const fallbackSession = sessionCookie ? JSON.parse(sessionCookie.value) : null
  
  const activeSession = session || fallbackSession

  if (error) {
    console.error('❌ Session error:', error)
  }
  console.log('🔑 Session status:', activeSession ? 'Authenticated' : 'Not authenticated')

  // If user is not authenticated and trying to access protected routes, redirect to auth
  if (!activeSession) {
    const isProtectedRoute = req.nextUrl.pathname.startsWith('/workspace') ||
      req.nextUrl.pathname.startsWith('/chat') ||
      req.nextUrl.pathname.startsWith('/platform') ||
      req.nextUrl.pathname.startsWith('/onboarding')

    console.log('🛡️ Checking protected route:', { isProtectedRoute, path: req.nextUrl.pathname })
    
    if (isProtectedRoute) {
      console.log('⚠️ Unauthorized access attempt to protected route, redirecting to auth')
      const authUrl = new URL('/auth', req.url)
      authUrl.searchParams.set('next', req.nextUrl.pathname)
      return NextResponse.redirect(authUrl)
    }
    return res
  }

  // Skip checks for auth and callback routes
  if (req.nextUrl.pathname.startsWith('/auth')) {
    console.log('🔄 Skipping middleware checks for auth route')
    return res
  }

  console.log('👤 Fetching user metadata...')
  const { data: { user } } = await supabase.auth.getUser()
  const isNewSignup = user?.user_metadata?.is_new_signup === true
  
  console.log('👥 Fetching user profile...')
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('username')
    .eq('id', activeSession.user.id)
    .single()

  console.log('🏢 Fetching user workspaces...')
  const { data: workspaces } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', activeSession.user.id)

  const hasProfile = profile?.username
  const hasWorkspaces = workspaces && workspaces.length > 0

  console.log('📊 User status:', {
    hasProfile,
    hasWorkspaces,
    isNewSignup,
    currentPath: req.nextUrl.pathname
  })

  // If on onboarding page
  if (req.nextUrl.pathname.startsWith('/onboarding')) {
    console.log('🔄 Processing onboarding route...')
    if (hasProfile && hasWorkspaces && !isNewSignup) {
      console.log('↪️ Redirecting to platform - Setup already complete')
      return NextResponse.redirect(new URL('/platform', req.url))
    }
    console.log('✅ Allowing onboarding access - Setup incomplete')
    return res
  }

  // If on platform or other protected pages
  if (req.nextUrl.pathname.startsWith('/platform') || 
      req.nextUrl.pathname.startsWith('/workspace') || 
      req.nextUrl.pathname.startsWith('/chat')) {
    console.log('🔄 Processing protected route access...')
    if (!hasProfile || !hasWorkspaces || isNewSignup) {
      console.log('↪️ Redirecting to onboarding - Setup incomplete')
      const onboardingUrl = new URL('/onboarding', req.url)
      onboardingUrl.searchParams.set('status', isNewSignup ? 'new' : (!hasProfile ? 'needs_profile' : 'needs_workspace'))
      return NextResponse.redirect(onboardingUrl)
    }
    console.log('✅ Allowing protected route access - Setup complete')
  }

  console.log('🏁 Middleware execution complete')
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
   // '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 