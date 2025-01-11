'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { motion } from 'framer-motion'
import { User, Briefcase, MessageSquare, Loader2, ArrowRight } from 'lucide-react'
import { updateUserProfile, createOnboardingWorkspace, createOnboardingChannel } from '@/lib/supabase/onboarding'

// Create a separate component that uses useSearchParams
function OnboardingContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status')
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  // ... rest of your component logic ...
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Your existing JSX */}
    </div>
  )
}

// Main page component
export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-t-2 border-b-2 border-white rounded-full animate-spin" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-white">Loading...</h2>
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
} 