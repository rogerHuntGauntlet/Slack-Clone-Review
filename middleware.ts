import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Skip middleware for static assets and special routes
  if (req.nextUrl.pathname.startsWith('/_next') || 
      req.nextUrl.pathname.startsWith('/public') ||
      req.nextUrl.pathname.startsWith('/horde') ||
      req.nextUrl.pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const res = NextResponse.next()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession()

  // Only redirect to auth if trying to access protected routes
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
  const isPublicRoute = req.nextUrl.pathname === '/' || 
                       req.nextUrl.pathname.startsWith('/api') ||
                       req.nextUrl.pathname.startsWith('/access')

  if (!session && !isAuthPage && !isPublicRoute) {
    const redirectUrl = new URL('/auth', req.url)
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

// Specify which routes should be protected
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|horde).*)',
  ],
} 