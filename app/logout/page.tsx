'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'

export default function LogoutPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Clear all storage first
        sessionStorage.clear()
        Object.keys(localStorage)
          .filter(key => key.startsWith('sb-'))
          .forEach(key => localStorage.removeItem(key))
        
        // Clear Supabase session last
        const { error } = await supabase.auth.signOut({ scope: 'global' })
        if (error) throw error
        
        // Wait a moment to show the animation
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Redirect to auth with intentional logout flag
        window.location.href = '/auth'
      } catch (error) {
        console.error('Error during logout:', error)
        window.location.href = '/auth'
      }
    }

    handleLogout()
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <motion.div 
        className="text-center max-w-md px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative mb-10">
          <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 border-t-2 border-b-2 border-white rounded-full animate-spin" />
          </div>
        </div>
        
        <motion.h1 
          className="text-4xl font-bold text-white mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Logging out...
        </motion.h1>
        
        <motion.div
          className="flex flex-col gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-gray-300 text-lg">Thanks for using OHF</p>
          <p className="text-gray-400">Clearing your session data</p>
        </motion.div>
      </motion.div>
    </div>
  )
} 