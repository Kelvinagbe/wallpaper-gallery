/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['your-supabase-domain.supabase.co'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
    minimumCacheTTL: 60,
  },
  // Enable SWC minification
  swcMinify: true,
  // Enable React strict mode
  reactStrictMode: true,
  // Optimize production builds
  compress: true,
}

module.exports = nextConfig