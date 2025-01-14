/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  images: {
    domains: [
      'rlaxacnkrfohotpyvnam.supabase.co',
      'media.tenor.com',
      'localhost',
      'www.gravatar.com',
      'your-default-ai-avatar.com',
      'avatars.githubusercontent.com'
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
  },
  webpack: (config) => {
    // Enable WebAssembly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    }

    // Add WASM file handling
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async'
    })

    return config
  },
  // Add WASM to allowed file types
  webpack5: true,
}

module.exports = nextConfig 