'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

export default function Access() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = getSupabaseClient()

  const handlePayment = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        router.replace('/auth')
        return
      }

      // Make sure user exists in your database first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (userError || !userData) {
        // Create user if doesn't exist
        const { error: createError } = await supabase
          .from('users')
          .insert([
            {
              id: session.user.id,
              email: session.user.email,
              created_at: new Date().toISOString()
            }
          ])
        
        if (createError) throw createError
      }

      // Call your API route to create Stripe session
      const response = await fetch('/api/create-stripe-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          email: session.user.email
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create payment session')
      }

      const { sessionUrl } = await response.json()
      window.location.href = sessionUrl // Redirect to Stripe
      
    } catch (err) {
      console.error('Payment error:', err)
      setError('Failed to initiate payment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      {error && <div className="text-red-500">{error}</div>}
      <button
        onClick={handlePayment}
        disabled={isLoading}
        className="btn-primary"
      >
        {isLoading ? 'Processing...' : 'Subscribe Now'}
      </button>
    </div>
  )
} 