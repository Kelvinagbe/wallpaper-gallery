import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Walls – Transform Your Spaces',
    short_name: 'Walls',
    description: 'Download stunning 4K wallpapers for your phone and desktop',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#0a0a0a',
    categories: ['photography', 'lifestyle', 'entertainment'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        // @ts-ignore
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/mobile.png',
        sizes: '390x844',
        type: 'image/png',
        // @ts-ignore
        form_factor: 'narrow',
        label: 'Walls wallpaper gallery',
      },
    ],
  }
}