import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Helper to create URLs with preserved query params
const createRedirectUrl = (baseUrl: string, req: NextRequest) => {
  const url = new URL(baseUrl, req.url)
  const params = req.nextUrl.searchParams
  // Preserve important query parameters
  if (params.has('workspaceId')) url.searchParams.set('workspaceId', params.get('workspaceId')!)
  if (params.has('next')) url.searchParams.set('next', params.get('next')!)
  if (params.has('status')) url.searchParams.set('status', params.get('status')!)
  return url
}

export async function middleware(req: NextRequest) {
  console.log('🚀 Middleware: Starting execution for path:', req.nextUrl.pathname)
  
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Allow POST methods for API routes and form submissions
  if (req.method === 'POST') {
    // List of paths that should allow POST
    const allowPostPaths = [
      '/auth',
      '/access',
      '/onboarding',
      '/api',
      '/auth/callback'
    ]
    
    if (allowPostPaths.some(path => req.nextUrl.pathname.startsWith(path))) {
      return res
    }
  }

  // Public routes that don't need any checks
  if (
    req.nextUrl.pathname === '/' || // Allow homepage
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/public') ||
    req.nextUrl.pathname === '/favicon.ico' ||
    req.nextUrl.pathname.startsWith('/auth/callback') ||
    req.nextUrl.pathname.startsWith('/api')  // Allow API routes to handle their own auth
  ) {
    return res
  }

  // Only apply auth checks to GET requests
  if (req.method !== 'GET') {
    return res
  }

  console.log('📝 Middleware: Checking session...')
  
  try {
    // Try to get session from Supabase
    const {
      data: { session },
      error
    } = await supabase.auth.getSession()

    // If no Supabase session, check for session cookie
    const sessionCookie = req.cookies.get('session')
    const fallbackSession = sessionCookie ? JSON.parse(sessionCookie.value) : null
    
    const activeSession = session || fallbackSession
    const isAuthenticated = !!activeSession && !!activeSession.user?.id

    if (error) {
      console.error('❌ Session error:', error)
    }

    // Get current path for routing decisions
    const currentPath = req.nextUrl.pathname

    // If on auth page
    if (currentPath.startsWith('/auth')) {
      if (isAuthenticated) {
        console.log('↪️ Authenticated user on auth page, redirecting to access check')
        return NextResponse.redirect(createRedirectUrl('/access', req))
      }
      return res
    }

    // If not authenticated, only allow auth page and home page
    if (!isAuthenticated) {
      console.log('⚠️ Unauthenticated user, redirecting to auth')
      return NextResponse.redirect(createRedirectUrl('/auth', req))
    }

    // Safety check for user ID
    if (!activeSession?.user?.id) {
      console.log('⚠️ No user ID in session, redirecting to auth')
      return NextResponse.redirect(createRedirectUrl('/auth', req))
    }

    // From here on, user is authenticated
    console.log('👤 Fetching user data for access checks...')
    
    // Check access record
    const { data: accessRecord, error: accessError } = await supabase
      .from('access_records')
      .select('*')
      .eq('user_id', activeSession.user.id)
      .single()

    if (accessError && accessError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Access record check failed:', accessError)
    }

    const hasAccess = !!accessRecord

    // If on access page
    if (currentPath.startsWith('/access')) {
      if (hasAccess) {
        console.log('↪️ User has access, redirecting to onboarding check')
        return NextResponse.redirect(createRedirectUrl('/onboarding', req))
      }
      return res
    }

    // If no access, only allow access page
    if (!hasAccess && !currentPath.startsWith('/auth')) {
      console.log('⚠️ No access record, redirecting to access page')
      return NextResponse.redirect(createRedirectUrl('/access', req))
    }

    // From here on, user is authenticated and has access
    console.log('👥 Checking onboarding status...')
    
    // Check onboarding status with error handling
    const [profileResult, workspacesResult, channelsResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('*')
        .eq('id', activeSession.user.id)
        .single(),
      supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', activeSession.user.id),
      supabase
        .from('channels')
        .select('id')
        .eq('created_by', activeSession.user.id)
    ])

    const profile = profileResult.data
    const workspaces = workspacesResult.data
    const channels = channelsResult.data

    const isOnboarded = profile?.username && 
                       workspaces?.length > 0 && 
                       channels?.length > 0 &&
                       (profile?.onboarding_completed !== false) // Allow undefined/null

    // If on onboarding page
    if (currentPath.startsWith('/onboarding')) {
      if (isOnboarded) {
        console.log('↪️ Already onboarded, redirecting to platform')
        return NextResponse.redirect(createRedirectUrl('/platform', req))
      }
      return res
    }

    // If not onboarded, only allow onboarding page
    if (!isOnboarded && 
        !currentPath.startsWith('/auth') && 
        !currentPath.startsWith('/access')) {
      console.log('⚠️ Not onboarded, redirecting to onboarding')
      return NextResponse.redirect(createRedirectUrl('/onboarding', req))
    }

    // If trying to access platform without meeting all requirements
    if (currentPath.startsWith('/platform')) {
      if (!isAuthenticated || !hasAccess || !isOnboarded) {
        console.log('⚠️ Incomplete requirements for platform access')
        if (!isAuthenticated) return NextResponse.redirect(createRedirectUrl('/auth', req))
        if (!hasAccess) return NextResponse.redirect(createRedirectUrl('/access', req))
        if (!isOnboarded) return NextResponse.redirect(createRedirectUrl('/onboarding', req))
      }
    }

    // If we get here, all checks have passed
    console.log('✅ All checks passed, proceeding with request')
    return res

  } catch (error) {
    // If anything fails, log it and redirect to auth
    console.error('❌ Middleware error:', error)
    return NextResponse.redirect(createRedirectUrl('/auth', req))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 