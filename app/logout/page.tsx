'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { motion } from 'framer-motion'

export default function LogoutPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

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
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.a
          href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          target="_blank"
          className="block mb-6 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          🎨 Help us pick our logo and win cash prizes! 🏆
        </motion.a>
        
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-t-2 border-b-2 border-white rounded-full animate-spin" />
          </div>
        </div>
        
        <motion.h1 
          className="text-3xl font-bold text-white mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Logging out...
        </motion.h1>
        
        <motion.div
          className="flex flex-col gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-gray-400">Thanks for using ChatGenius</p>
          <p className="text-gray-500 text-sm">Clearing your session data</p>
        </motion.div>
      </motion.div>
    </div>
  )
} 