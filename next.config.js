/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  images: {
    domains: [
      'rlaxacnkrfohotpyvnam.supabase.co',
      'media.tenor.com',
      'localhost',
      'www.gravatar.com',
      'your-default-ai-avatar.com'
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    esmExternals: 'loose'
  }
}

module.exports = nextConfig 