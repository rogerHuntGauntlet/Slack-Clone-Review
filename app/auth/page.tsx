'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, getRedirectUrl } from '@/lib/auth-config'
import { createUserProfile, joinWorkspace } from '@/lib/supabase'
import { FaGithub, FaGoogle } from 'react-icons/fa'
import { Eye, EyeOff } from 'lucide-react'
import { FaWallet } from 'react-icons/fa'
import { motion } from 'framer-motion'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'


const DEBUG_EMAIL = 'regorhunt02052@gmail.com'

const debugLog = (message: string, data?: any) => {
  if (typeof window === 'undefined') return; // Don't run during SSR
  const currentEmail = sessionStorage.getItem('userEmail')
  if (currentEmail === DEBUG_EMAIL) {
    if (data) {
      console.log(message, data)
    } else {
      console.log(message)
    }
  }
}

const PASSWORD_MIN_LENGTH = 8
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

function getRandomWorkspaceBlurb() {
  const blurbs = [
    "A vibrant community of innovators collaborating to build something amazing.",
    "Join this dynamic workspace where creativity meets productivity.",
    "A thriving hub of professionals sharing ideas and driving success.",
    "Connect with passionate team members in this engaging workspace.",
    "Experience seamless collaboration in this well-organized workspace."
  ]
  return blurbs[Math.floor(Math.random() * blurbs.length)]
}

interface AuthContentProps {
  workspaceId: string | null;
}

const slideKeyframes = `@keyframes slide-back-forth {
  0% {
    transform: translateX(0%);
  }
  45% {
    transform: translateX(100%);
  }
  50% {
    transform: translateX(100%) scaleX(-1);
  }
  95% {
    transform: translateX(0%) scaleX(-1);
  }
  100% {
    transform: translateX(0%);
  }
}`;

function AuthContent({ workspaceId }: AuthContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const wasIntentionalLogout = searchParams.get('intentional_logout') === 'true'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [workspaceName, setWorkspaceName] = useState<string | null>(null)
  const [workspaceBlurb] = useState(getRandomWorkspaceBlurb())
  const [shouldRefresh, setShouldRefresh] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({})

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = slideKeyframes;
    document.head.appendChild(styleEl);
    
    return () => {
      styleEl.remove();
    };
  }, []);

  useEffect(() => {
    if (shouldRefresh) {
      const timer = setTimeout(() => {
        window.location.reload()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [shouldRefresh])

  useEffect(() => {
    debugLog('🔐 [Auth] AuthContent rendered with workspaceId:', workspaceId);
    
    const handleOAuthCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (session?.user) {
        debugLog('OAuth callback detected with session:', session.user.id)
        setMessage('Completing sign in...')
        setLoading(true)
        
        try {
          // First check access_records
          const { data: accessRecord, error: accessError } = await supabase
            .from('access_records')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('is_active', true)
            .single()

          debugLog('Access check result:', { accessRecord, accessError })

          // If no access record, redirect to access page
          if (!accessRecord || accessError) {
            debugLog('No access record found - redirecting to access')
            setMessage('Redirecting to access page...')
            await router.push('/access?redirectedfromauth=supabase')
            return
          }

          // Then check for existing profile
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          debugLog('Profile check result:', { profile, profileError })

          // If no profile exists or there's an error, redirect to onboarding
          if (!profile || profileError) {
            debugLog('No profile found - redirecting to onboarding')
            setMessage('Redirecting to onboarding...')
            await router.push('/onboarding')
            return
          }

          // If we get here, user has both access and profile, proceed to platform
          debugLog('Existing profile found - redirecting to platform')
          await router.push('/platform')
        } catch (error: any) {
          debugLog('Error in OAuth callback:', error)
          setError(error.message)
          setLoading(false)
        }
      }
    }

    if (workspaceId) {
      fetchWorkspaceDetails()
    }

    // Check for OAuth callback
    handleOAuthCallback()
  }, [workspaceId, router])

  const fetchWorkspaceDetails = async () => {
    if (!workspaceId) return

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('name')
        .eq('id', workspaceId)
        .single()

      if (error) throw error
      setWorkspaceName(data.name)
    } catch (error) {
      debugLog('Error fetching workspace details:', error)
      setError('Failed to fetch workspace details')
    }
  }

  const validateForm = () => {
    const errors: { email?: string; password?: string; confirmPassword?: string } = {}

    if (!email) {
      errors.email = 'Email is required'
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
      errors.email = 'Invalid email address'
    }

    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < PASSWORD_MIN_LENGTH) {
      errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
    } else if (!PASSWORD_REGEX.test(password)) {
      errors.password = 'Password must contain uppercase, lowercase, number, and special character'
    }

    if (isSignUp && password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleOAuthSignIn = async (provider: 'github' | 'google' | 'discord' | 'gitlab') => {
    try {
      setLoading(true)
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getRedirectUrl(),
          data: {
            is_new_signup: true,
            signup_timestamp: new Date().toISOString(),
            needs_access_check: true
          }
        },
      })
      if (error) throw error
      setShouldRefresh(true)  // Trigger auto-refresh for OAuth as well
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        throw new Error(`${error.message}\n\nTip: Try signing in with GitHub, Google, Discord, or GitLab for a smoother experience!`)
      }

      // Rest of the sign in logic...
      const { data: { session } } = await supabase.auth.getSession()
      debugLog('Current session:', session)

      setMessage('Sign in successful. Setting up your profile...')
      sessionStorage.setItem('userEmail', email)
      await sessionStorage.setItem('cookie', JSON.stringify(session))
      setShouldRefresh(true)  // Trigger auto-refresh

    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getRedirectUrl(),
          data: {
            is_new_signup: true
          }
        },
      })
      
      if (error) {
        // If there's an error with email/password signup, suggest OAuth
        throw new Error(`${error.message}\n\nTip: Try signing up with GitHub, Google, Discord, or GitLab for a faster setup!`)
      }

      setMessage('Account created! You will receive an email to verify your account. After verification, you will be guided through the onboarding process.')
      sessionStorage.setItem('userEmail', email)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    
    if (isSignUp) {
      await handleSignUp(e)
    } else {
      await handleSignIn(e)
    }
  }

  const handlePasswordReset = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Please enter your email address to reset your password')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`
      })

      if (error) throw error
      setMessage('Password reset instructions have been sent to your email')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsSignUp(!isSignUp)
    setError(null)
    setMessage(null)
    setValidationErrors({})
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-6xl w-full mx-4 flex flex-col lg:flex-row gap-8 py-8">
        {/* Left side - Branding */}
        <motion.div
          className="flex-1 flex flex-col justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col items-center lg:items-start">
            <div className="relative group mb-8">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-300"></div>
              <a
                href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                target="_blank"
                className="relative w-20 h-20 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-all duration-300"
              >
                <span className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">?</span>
              
              </a>
              
            </div>
            <span className="text-gray-400 text-sm group-hover:text-indigo-400 transition-colors mb-6">
            Help us choose a logo and win prizes!
          </span>
            <div className="text-center lg:text-left space-y-6">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Welcome to OHF Partners
              </h1>
              <p className="text-xl text-gray-400">
                Build Some Company.  Redistribute risk across the innovation dynamic.
              </p>
              <div className="overflow-hidden w-full relative">
                <div className="animate-slide-back-forth transform-gpu">
                  <DotLottieReact
                    src="https://lottie.host/70cd37f4-0a33-47c3-a88b-e4aaa045881c/xmf3M7GvYx.lottie"
                    loop
                    autoplay
                    className="w-full max-w-md h-auto"
                  />
                </div>
              </div>
            </div>
          </div>

          {workspaceName && (
            <motion.div
              className="p-6 bg-white/5 rounded-xl border border-white/10 max-w-md backdrop-blur-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold text-white mb-3">
                Joining workspace: {workspaceName}
              </h2>
              <p className="text-gray-300 text-base italic">
                "{workspaceBlurb}"
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Right side - Auth form */}
        <motion.div
          className="w-full lg:w-[400px] bg-black/40 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {error && (
            <motion.div
              className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-red-400 text-sm whitespace-pre-line">{error}</p>
            </motion.div>
          )}

          {message && (
            <motion.div
              className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-xl"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-green-400 text-sm">{message}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 mb-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`mt-1 block w-full rounded-xl bg-white/5 border ${validationErrors.email ? 'border-red-500' : 'border-white/10'
                  } text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-300 h-12 px-4`}
                placeholder="you@example.com"
                autoComplete="username"
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`mt-1 block w-full rounded-xl bg-white/5 border ${validationErrors.password ? 'border-red-500' : 'border-white/10'
                    } text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-300 h-12 px-4 pr-10`}
                  placeholder="••••••••"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.password}</p>
              )}
              {!isSignUp && (
                <button
                  onClick={handlePasswordReset}
                  type="button"
                  className="mt-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot your password?
                </button>
              )}
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={`mt-1 block w-full rounded-xl bg-white/5 border ${validationErrors.confirmPassword ? 'border-red-500' : 'border-white/10'
                      } text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-300 h-12 px-4 pr-10`}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.confirmPassword}</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Log in')}
              </button>
              <p className="text-center text-sm text-gray-400">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  onClick={toggleMode}
                  type="button"
                  disabled={loading}
                  className="text-indigo-400 hover:text-indigo-300 font-medium focus:outline-none focus:underline transition-colors"
                >
                  {isSignUp ? 'Log in' : 'Sign up'}
                </button>
              </p>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 text-gray-400 bg-gray-900">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleOAuthSignIn('github')}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24292F]"
            >
              <FaGithub className="h-5 w-5" />
              GitHub
            </button>
            
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4285f4]"
            >
              <FaGoogle className="h-5 w-5 text-[#4285f4]" />
              Google
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignIn('discord')}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-[#5865F2] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4752C4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5865F2]"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Discord
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignIn('gitlab')}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-[#FC6D26] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#E24329] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FC6D26]"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.65 14.39L12 22.13L1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78l2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0a.42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0a.42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/>
              </svg>
              GitLab
            </button>

            <button
              type="button"
              onClick={() => router.push('/connect-wallet')}
              className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4285f4]"
            >
              <FaWallet className="h-5 w-5 text-[#E6007A]" />
              Connect Wallet
            </button>
          </div>
        </motion.div>
      </div>

      <div className="mt-6 p-4 bg-gray-800 text-white rounded-lg shadow-lg">
        <h2 className="text-lg font-semibold">Engage Our Suite of Products!</h2>
        <p className="mt-2 text-sm">
          Starting with <strong>OHFdesk</strong> to manage teams, projects, and sales using the most advanced AI tools. Build an entire team of AI agents to generate business for you and handle your daily grind.
        </p>
      </div>
    </div>
  )
}

function AuthParams() {
  const searchParams = useSearchParams()
  const workspaceId = searchParams.get('workspaceId')
  return <AuthContent workspaceId={workspaceId} />
}

export default function Auth() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>}>
      <AuthParams />
    </Suspense>
  )
}
