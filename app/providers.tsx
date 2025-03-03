'use client'

import { getSupabaseClient } from '@/lib/supabase'

export function Providers({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseClient()

  return (
    <>
      {children}
    </>
  )
}
