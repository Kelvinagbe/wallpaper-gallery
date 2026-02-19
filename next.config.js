/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com', // covers all Vercel Blob domains
      },
      {
        protocol: 'https',
        hostname: 'avatar.iran.liara.run',
      },
    ],

    // ✅ Added 1920 for full-screen wallpaper viewers on desktop
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],

    // ✅ Cleaned up — your app doesn't use tiny icon sizes (16/32/48)
    imageSizes: [64, 128, 256, 384],

    // ✅ AVIF first — 40–50% smaller than WebP, Chrome/Firefox support it
    // WebP is the fallback for Safari
    formats: ['image/avif', 'image/webp'],

    // ✅ 30 days instead of 60 seconds — wallpapers never change after upload
    // This means the CDN serves them from cache for 30 days without revalidating
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  // swcMinify is now the default in Next.js 13+ — safe to remove
  reactStrictMode: true,
  compress: true,

  // ✅ Removes X-Powered-By: Next.js header — small security + marginal perf gain
  poweredByHeader: false,

  // ✅ Enables HTTP Keep-Alive on fetch() calls made from the server
  // Reuses connections to Supabase instead of opening a new one every request
  httpAgentOptions: {
    keepAlive: true,
  },

  // ✅ Aggressive package tree-shaking — only import what you use from lucide-react
  // Without this, the full icon library is bundled even if you use 5 icons
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig
