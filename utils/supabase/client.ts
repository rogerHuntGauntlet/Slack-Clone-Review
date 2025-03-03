import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import type { CookieOptions } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a single supabase client for interacting with your database
export const createClient = () => {
  try {
    const isServer = typeof window === 'undefined'
    
    if (isServer) {
      // Server-side client
      return createSupabaseClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        }
      )
    }

    // Client-side client
    return createBrowserClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            const cookie = document.cookie
              .split('; ')
              .find(row => row.startsWith(`${name}=`))
            return cookie ? cookie.split('=')[1] : undefined
          },
          set(name: string, value: string, options: CookieOptions) {
            document.cookie = `${name}=${value}; path=/; max-age=${options.maxAge ?? 0}`
          },
          remove(name: string, options: CookieOptions) {
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
          }
        },
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        },
        global: {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      }
    )
  } catch (error) {
    console.error('Error creating Supabase client:', error)
    throw error
  }
}

// Export a singleton instance for use in components
let supabaseInstance: ReturnType<typeof createBrowserClient | typeof createSupabaseClient> | null = null

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient()
  }
  return supabaseInstance
}

export default createClient 