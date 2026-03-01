// app/page.tsx
// ✅ SERVER COMPONENT — no 'use client'
// Fetches wallpapers on server BEFORE sending HTML to browser
// Users see content instantly instead of waiting for JS to load

import { fetchWallpapers } from '@/lib/stores/wallpaperStore';
import WallpaperGallery from './WallpaperGallery';

// Next.js will revalidate (re-fetch) this page every 60 seconds
export const revalidate = 60;

export default async function Page() {
  let initialWallpapers = [];
  let initialHasMore = false;

  try {
    const data = await fetchWallpapers(0, 30, 'all');
    initialWallpapers = data.wallpapers;
    initialHasMore = data.hasMore;
  } catch (e) {
    console.error('Server fetch failed:', e);
  }

  return (
    <WallpaperGallery
      initialWallpapers={initialWallpapers}
      initialHasMore={initialHasMore}
    />
  );
}
