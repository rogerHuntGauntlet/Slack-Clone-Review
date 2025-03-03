import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Refresh session if expired - required for Server Components
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Supabase session error:', error);
      // Return a response that won't trigger a 406
      return NextResponse.next({
        request: {
          headers: request.headers,
        },
      });
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // Return a basic response on error
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
} 