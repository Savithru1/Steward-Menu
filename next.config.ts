import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // ── Images ──────────────────────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],   // serve smaller images
    minimumCacheTTL: 86400,                  // cache images for 1 day
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.com' },
      { protocol: 'http',  hostname: 'localhost' },
    ],
  },

  devIndicators: false,

  // ── Compression ─────────────────────────────────────────────────────────────
  compress: true,

  // ── HTTP caching headers for static assets ──────────────────────────────────
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
    ];
  },

  // ── Bundle size optimisation ─────────────────────────────────────────────────
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query', 'zustand'],
  },
};

export default nextConfig;
