'use client'

import React, { useRef, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Leaf, Network, Zap, Users } from 'lucide-react';
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { checkUserAccess } from '@/utils/checkAccess'
import { AuthModal } from '@/components/AuthModal'
import { motion, useScroll, useTransform } from 'framer-motion'

interface GradientButtonProps {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}

const GradientButton = ({ children, onClick, className = "" }: GradientButtonProps) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`relative group px-8 py-4 text-lg font-medium text-white overflow-hidden rounded-full 
    bg-gradient-to-r from-teal-400 via-blue-500 to-purple-600 
    hover:from-teal-500 hover:via-blue-600 hover:to-purple-700
    shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}
  >
    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="relative flex items-center justify-center">
      {children}
    </div>
  </motion.button>
)

interface FloatingCardProps {
  children: ReactNode;
  delay?: number;
}

const FloatingCard = ({ children, delay = 0 }: FloatingCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ 
      duration: 0.8,
      delay,
      type: "spring",
      stiffness: 100 
    }}
    className="relative"
  >
    {children}
  </motion.div>
)

const Blob = ({ className = "" }) => (
  <motion.div
    animate={{
      scale: [1, 1.2, 0.9, 1.1, 1],
      x: [-20, 20, -10, 15, -20],
      y: [-20, 10, -15, 20, -20],
      rotate: [0, 90, 180, 270, 360]
    }}
    transition={{
      duration: 20,
      repeat: Infinity,
      repeatType: "reverse",
      ease: "easeInOut",
    }}
    className={`absolute rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl ${className}`}
  />
)

export default function HomePage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })
  
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "100%"])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session) {
      setIsLoggedIn(false)
      setLoading(false)
      return
    }
    setIsLoggedIn(true)
    const hasAccess = await checkUserAccess(session.user.id)
    setHasAccess(hasAccess)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 via-blue-900 to-purple-900 text-white flex items-center justify-center">
        <div className="text-center space-y-6">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360] 
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative w-24 h-24 mx-auto"
          >
            <div className="absolute inset-0 rounded-full border-4 border-teal-500/30"></div>
            <div className="absolute inset-0 rounded-full border-t-4 border-purple-500"></div>
          </motion.div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-purple-600 bg-clip-text text-transparent">
            Loading...
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative min-h-screen bg-gradient-to-br from-teal-900 via-blue-900 to-purple-900">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Blobs */}
        <Blob className="w-[800px] h-[800px] bg-teal-300/30 left-0 top-0" />
        <Blob className="w-[600px] h-[600px] bg-blue-300/30 right-0 top-1/4" />
        <Blob className="w-[700px] h-[700px] bg-purple-300/30 left-1/4 top-1/2" />
        <Blob className="w-[900px] h-[900px] bg-teal-400/30 right-1/4 bottom-0" />
        <Blob className="w-[750px] h-[750px] bg-blue-400/30 left-1/3 bottom-1/4" />
        <Blob className="w-[850px] h-[850px] bg-purple-400/30 right-1/3 top-1/3" />
        <Blob className="w-[600px] h-[600px] bg-teal-300/30 left-2/3 bottom-1/3" />
        <Blob className="w-[800px] h-[800px] bg-blue-300/30 right-2/3 top-2/3" />
        <Blob className="w-[700px] h-[700px] bg-purple-300/30 left-1/2 top-1/4 transform -translate-x-1/2" />
        <Blob className="w-[900px] h-[900px] bg-teal-400/30 right-1/2 bottom-1/4 transform translate-x-1/2" />
        
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              className="inline-flex items-center px-8 py-4 mb-16 text-base bg-white/10 text-teal-300 rounded-full border border-teal-500/20 backdrop-blur-sm"
            >
              <Sparkles className="w-5 h-5 mr-3" />
              Join the Community of Builders
            </motion.div>
            
            <motion.div 
              className="text-center mb-12 max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-8">
                Build{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-blue-400 to-purple-400">
                  Some Company
                </span>
              </h1>
              
              <p className="text-xl sm:text-2xl text-teal-100/80">
                Fairly redistribute risk across the innovation dynamic.
                Join a community that believes in shared success and collective growth.
              </p>
            </motion.div>

            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-8 mt-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              {!isLoggedIn ? (
                <GradientButton onClick={() => router.push('/auth')}>
                  Join the Community
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </GradientButton>
              ) : hasAccess ? (
                <GradientButton onClick={() => router.push('/platform')}>
                  Enter Platform
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </GradientButton>
              ) : (
                <GradientButton onClick={() => router.push('/access')}>
                  Get Access
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </GradientButton>
              )}
              
              <motion.div 
                className="flex flex-col items-center"
                whileHover={{ scale: 1.05 }}
              >
                <div className="flex items-center gap-3 text-2xl text-teal-100">
                  <span className="line-through text-teal-300/50">$2,000</span>
                  <span className="font-bold text-teal-300">$1,000</span>
                </div>
                <span className="text-sm text-teal-200/70 mt-1">Lifetime Access</span>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          style={{ opacity }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/50"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 border-2 border-current rounded-full flex justify-center"
          >
            <div className="w-1 h-2 bg-current rounded-full mt-2" />
          </motion.div>
        </motion.div>
      </div>

      {/* Vision Section */}
      <div className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-teal-900/20" />
        <div className="relative px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <FloatingCard>
            <div className="text-center mb-20">
              <h2 className="text-5xl font-bold text-white sm:text-6xl">
                Demonstrate the Possibility of the Inconceivable
              </h2>
              <p className="mt-4 text-2xl text-teal-100/80">
                Where visionaries become builders, and the unimaginable becomes reality.
              </p>
            </div>

            <div className="grid gap-12 md:grid-cols-3">
              <FloatingCard delay={0.2}>
                <div className="relative group p-8 rounded-3xl bg-white/5 backdrop-blur-lg border border-teal-500/20 hover:bg-white/10 transition-colors duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                  <Leaf className="w-12 h-12 mb-6 text-teal-400" />
                  <h3 className="text-2xl font-semibold text-white mb-4">Organic Growth</h3>
                  <p className="text-teal-100/80">Build naturally with a community that supports and elevates your vision.</p>
                </div>
              </FloatingCard>

              <FloatingCard delay={0.4}>
                <div className="relative group p-8 rounded-3xl bg-white/5 backdrop-blur-lg border border-blue-500/20 hover:bg-white/10 transition-colors duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                  <Network className="w-12 h-12 mb-6 text-blue-400" />
                  <h3 className="text-2xl font-semibold text-white mb-4">Connected Minds</h3>
                  <p className="text-teal-100/80">Join forces with other visionaries to amplify your impact.</p>
                </div>
              </FloatingCard>

              <FloatingCard delay={0.6}>
                <div className="relative group p-8 rounded-3xl bg-white/5 backdrop-blur-lg border border-purple-500/20 hover:bg-white/10 transition-colors duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                  <Zap className="w-12 h-12 mb-6 text-purple-400" />
                  <h3 className="text-2xl font-semibold text-white mb-4">Infinite Potential</h3>
                  <p className="text-teal-100/80">Transform ideas into reality with cutting-edge tools and support.</p>
                </div>
              </FloatingCard>
            </div>
          </FloatingCard>
        </div>
      </div>

      {/* Creative Playground Section */}
      <div className="relative py-32 overflow-hidden">
        <Blob className="w-[600px] h-[600px] bg-purple-400/20 right-0 top-0" />
        <Blob className="w-[500px] h-[500px] bg-teal-400/20 left-20 bottom-20" />
        
        <div className="relative px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <FloatingCard>
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-white sm:text-6xl mb-4">
                Creative Playground
              </h2>
              <p className="text-2xl text-teal-100/80">
                Where imagination meets possibility
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Interactive Card 1 */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="relative group rounded-3xl bg-gradient-to-br from-teal-500/10 to-purple-500/10 p-1"
              >
                <div className="relative h-full p-8 rounded-[23px] bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 via-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <h3 className="text-3xl font-bold text-white mb-4">Dream It</h3>
                    <p className="text-teal-100/80 text-lg mb-6">
                      Start with a wild idea. The crazier, the better. 
                      This is your space to dream without limits.
                    </p>
                    <div className="flex items-center justify-center h-48">
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                          rotate: [0, 180, 360],
                        }}
                        transition={{
                          duration: 10,
                          repeat: Infinity,
                          repeatType: "reverse",
                        }}
                        className="relative w-32 h-32"
                      >
                        <div className="absolute inset-0 rounded-full border-4 border-teal-500/30 animate-pulse" />
                        <div className="absolute inset-0 rounded-full border-t-4 border-purple-500 animate-spin" />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Interactive Card 2 */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="relative group rounded-3xl bg-gradient-to-br from-blue-500/10 to-teal-500/10 p-1"
              >
                <div className="relative h-full p-8 rounded-[23px] bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <h3 className="text-3xl font-bold text-white mb-4">Build It</h3>
                    <p className="text-teal-100/80 text-lg mb-6">
                      Transform your vision into reality with our powerful tools
                      and supportive community.
                    </p>
                    <div className="flex items-center justify-center h-48">
                      <motion.div
                        animate={{
                          rotateY: [0, 360],
                        }}
                        transition={{
                          duration: 5,
                          repeat: Infinity,
                          repeatType: "loop",
                        }}
                        className="relative w-32 h-32 flex items-center justify-center"
                      >
                        <div className="absolute w-full h-full border-8 border-blue-500/30 rounded-lg transform rotate-45" />
                        <div className="absolute w-full h-full border-8 border-purple-500/30 rounded-lg transform -rotate-45" />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </FloatingCard>
        </div>
      </div>

      {/* Power Tools Section */}
      <div className="relative py-32 overflow-hidden">
        <Blob className="w-[700px] h-[700px] bg-blue-400/20 left-0 top-0" />
        <Blob className="w-[600px] h-[600px] bg-purple-400/20 right-20 bottom-20" />
        
        <div className="relative px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <FloatingCard>
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-white sm:text-6xl mb-4">
                Power Tools
              </h2>
              <p className="text-2xl text-teal-100/80">
                Everything you need to build something amazing and redefine what's possible.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: "🎨",
                  title: "Design Lab",
                  description: "Powerful design tools for any creative vision"
                },
                {
                  icon: "🚀",
                  title: "Launch Pad",
                  description: "Deploy your projects with a single click"
                },
                {
                  icon: "🔮",
                  title: "AI Studio",
                  description: "Harness the power of artificial intelligence"
                },
                {
                  icon: "🌈",
                  title: "Dream Engine",
                  description: "Turn your wildest ideas into reality"
                }
              ].map((tool, index) => (
                <FloatingCard key={index} delay={index * 0.1}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="relative group p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="text-4xl mb-4">{tool.icon}</div>
                    <h3 className="text-xl font-semibold text-white mb-2">{tool.title}</h3>
                    <p className="text-teal-100/80">{tool.description}</p>
                  </motion.div>
                </FloatingCard>
              ))}
            </div>
          </FloatingCard>
        </div>
      </div>

      {/* Dream Factory Section */}
      <div className="relative py-32 overflow-hidden">
        <Blob className="w-[800px] h-[800px] bg-teal-400/20 right-0 top-0" />
        <Blob className="w-[700px] h-[700px] bg-blue-400/20 left-20 bottom-20" />
        
        <div className="relative px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <FloatingCard>
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-white sm:text-6xl mb-4">
                Dream Factory
              </h2>
              <p className="text-2xl text-teal-100/80">
                Where dreams become digital reality
              </p>
            </div>

            <div className="relative">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 p-8 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-blue-500/10 to-purple-500/10" />
                <div className="relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    {[
                      { number: "10x", label: "Faster Development" },
                      { number: "∞", label: "Possibilities" },
                      { number: "1", label: "Community" }
                    ].map((stat, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.2 }}
                        className="p-6"
                      >
                        <div className="text-5xl font-bold bg-gradient-to-r from-teal-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                          {stat.number}
                        </div>
                        <div className="text-teal-100/80 text-lg">
                          {stat.label}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </FloatingCard>
        </div>
      </div>

      {/* Community Vibes Section */}
      <div className="relative py-32 overflow-hidden">
        <Blob className="w-[900px] h-[900px] bg-purple-400/20 left-0 top-0" />
        <Blob className="w-[800px] h-[800px] bg-teal-400/20 right-20 bottom-20" />
        
        <div className="relative px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <FloatingCard>
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-white sm:text-6xl mb-4">
                Community Vibes
              </h2>
              <p className="text-2xl text-teal-100/80">
                Join a tribe of creative souls who dare to dream and build the inconceivable.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  emoji: "👩‍💻",
                  title: "The Dreamers",
                  description: "Visionaries who dare to imagine the impossible"
                },
                {
                  emoji: "🚀",
                  title: "The Builders",
                  description: "Crafters who bring ideas to life"
                },
                {
                  emoji: "🌟",
                  title: "The Innovators",
                  description: "Pioneers pushing the boundaries of what's possible"
                }
              ].map((type, index) => (
                <FloatingCard key={index} delay={index * 0.2}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="relative group p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="text-6xl mb-6">{type.emoji}</div>
                    <h3 className="text-2xl font-semibold text-white mb-4">{type.title}</h3>
                    <p className="text-teal-100/80 text-lg">{type.description}</p>
                  </motion.div>
                </FloatingCard>
              ))}
            </div>
          </FloatingCard>
        </div>
      </div>

      {/* Community Section */}
      <div className="relative py-32 overflow-hidden">
        <div className="relative px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <FloatingCard>
            <div className="text-center">
              <h2 className="text-5xl font-bold text-white mb-24 sm:text-6xl">
                Join the Movement
              </h2>
              
              <GradientButton 
                onClick={() => router.push('/auth')}
                className="mx-auto"
              >
                Start Building Today
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </GradientButton>
            </div>
          </FloatingCard>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative py-24 border-t border-white/10 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <FloatingCard delay={0.1}>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-teal-300">Legal</h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/legal/terms" className="text-teal-100/70 hover:text-teal-300 transition-colors">
                      Terms & Conditions
                    </Link>
                  </li>
                  <li>
                    <Link href="/legal/privacy" className="text-teal-100/70 hover:text-teal-300 transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/legal/data-policy" className="text-teal-100/70 hover:text-teal-300 transition-colors">
                      Data Policy
                    </Link>
                  </li>
                </ul>
              </div>
            </FloatingCard>

            <FloatingCard delay={0.2}>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-blue-300">Policies</h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/legal/ai-policy" className="text-teal-100/70 hover:text-blue-300 transition-colors">
                      AI Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/legal/no-refund-policy" className="text-teal-100/70 hover:text-blue-300 transition-colors">
                      No Refund Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/legal/accessibility" className="text-teal-100/70 hover:text-blue-300 transition-colors">
                      Accessibility
                    </Link>
                  </li>
                </ul>
              </div>
            </FloatingCard>

            <FloatingCard delay={0.3}>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-purple-300">Security</h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/legal/security" className="text-teal-100/70 hover:text-purple-300 transition-colors">
                      Security Measures
                    </Link>
                  </li>
                  <li>
                    <Link href="/legal/compliance" className="text-teal-100/70 hover:text-purple-300 transition-colors">
                      Compliance
                    </Link>
                  </li>
                  <li>
                    <Link href="/legal/cookie-policy" className="text-teal-100/70 hover:text-purple-300 transition-colors">
                      Cookie Policy
                    </Link>
                  </li>
                </ul>
              </div>
            </FloatingCard>

            <FloatingCard delay={0.4}>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold bg-gradient-to-r from-teal-300 via-blue-300 to-purple-300 bg-clip-text text-transparent">Support</h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/support/contact" className="text-teal-100/70 hover:text-white transition-colors">
                      Contact Us
                    </Link>
                  </li>
                  <li>
                    <Link href="/support/enterprise" className="text-teal-100/70 hover:text-white transition-colors">
                      Enterprise Sales
                    </Link>
                  </li>
                  <li>
                    <Link href="/support/status" className="text-teal-100/70 hover:text-white transition-colors">
                      System Status
                    </Link>
                  </li>
                </ul>
              </div>
            </FloatingCard>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-blue-500/10 to-purple-500/10 rounded-xl" />
            <div className="relative p-6 text-center text-sm text-teal-100/60 rounded-xl backdrop-blur-sm border border-white/5">
              <p className="mb-4 max-w-3xl mx-auto">
                OHF Partners reserves the right to require users to upgrade to an Enterprise License based on internal usage metrics, 
                compliance requirements, and other factors determined at our sole discretion. Enterprise licensing criteria are subject to change without notice.
              </p>
              <p>
                © {new Date().getFullYear()} OHF Partners. Building the future together.
              </p>
            </div>
          </div>
        </div>
      </footer>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={checkAuth}
      />
    </div>
  )
}