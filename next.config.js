/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'poyqjfev1c1zq76d.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com', // Wildcard for all Vercel Blob domains
      },
      {
        protocol: 'https',
        hostname: 'avatar.iran.liara.run', // Your avatar service
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
    minimumCacheTTL: 60,
  },
  swcMinify: true,
  reactStrictMode: true,
  compress: true,
}

module.exports = nextConfig