import React from 'react';
import Link from 'next/link';
import { ArrowRight, MessageSquare, Shield, Zap, LucideIcon } from 'lucide-react';

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => (
  <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20 transform hover:scale-105 transition-all duration-300">
    <div className="mb-4 inline-block p-3 bg-blue-500/20 rounded-lg">
      <Icon className="w-6 h-6 text-blue-500" />
    </div>
    <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
    <p className="text-gray-300">{description}</p>
  </div>
);

export default function Home() {
  const features = [
    {
      icon: MessageSquare,
      title: "Smart Conversations",
      description: "Experience AI-powered chat that understands context and delivers meaningful responses."
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Get instant responses with our optimized infrastructure and advanced caching system."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Your conversations are protected with state-of-the-art encryption and security measures."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
        </div>

        {/* Main Content */}
        <div className="relative px-4 py-16 mx-auto max-w-7xl sm:px-6 lg:px-8 lg:py-24">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 mb-8 text-sm text-blue-400 bg-blue-900/30 rounded-full">
              <span className="px-2 py-1 mr-2 text-xs bg-blue-500 text-white rounded-full">New</span>
              Introducing ChatGenius 2.0
            </div>
            
            <h1 className="mb-8 text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Welcome to the Future of
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                Intelligent Chat
              </span>
            </h1>
            
            <p className="max-w-2xl mx-auto mb-12 text-xl text-gray-300">
              Experience the next generation of collaborative communication powered by cutting-edge AI technology.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth" className="group flex items-center px-8 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-300">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="px-8 py-3 text-lg font-medium text-blue-400 border-2 border-blue-400/30 rounded-lg hover:bg-blue-400/10 transition-all duration-300">
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative px-4 py-16 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </div>
  );
}
