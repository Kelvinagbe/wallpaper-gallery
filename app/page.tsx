import { fetchWallpapers } from '@/lib/stores/wallpaperStore';
import WallpaperGallery from './WallpaperGallery';

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