'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/auth-config'
import { motion } from 'framer-motion'

export default function ConfirmEmailAddress() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      setLoading(false)
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-md w-full mx-4 p-8 bg-black/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10">
          <h1 className="text-2xl font-bold text-white mb-4">Email Not Verified</h1>
          <p className="text-gray-300 mb-4">
            Please check your email and click the verification link to continue.
          </p>
          <button
            onClick={() => router.push('/auth')}
            className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <motion.div 
        className="max-w-md w-full mx-4 p-8 bg-black/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-white mb-4">Email Verified!</h1>
        <p className="text-gray-300 mb-6">
          Your email has been successfully verified. You can now proceed to set up your account.
        </p>
        <button
          onClick={() => router.push('/access')}
          className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Continue to Setup
        </button>
      </motion.div>
    </div>
  )
} 