import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If we have a session and a workspace invite, join the workspace
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (session && workspaceId && !req.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL(`/workspace/${workspaceId}`, req.url))
  }

  // Refresh session if exists
  if (session) {
    return res
  }

  // Redirect to auth if no session and trying to access protected routes
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/workspace') ||
    req.nextUrl.pathname.startsWith('/chat')

  if (isProtectedRoute) {
    const authUrl = new URL('/auth', req.url)
    authUrl.searchParams.set('next', req.nextUrl.pathname)
    return NextResponse.redirect(authUrl)
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