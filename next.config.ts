import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Turbopack config (Next.js 16 default)
  turbopack: {
    root: __dirname,
  },
  // Server-side externals for packages that only work in browser
  serverExternalPackages: ['phaser', 'pg', 'pg-pool'],
}

export default nextConfig
