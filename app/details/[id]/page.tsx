import { fetchWallpaperById } from '@/lib/stores/wallpaperStore';
import { notFound } from 'next/navigation';
import WallpaperDetail from './WallpaperDetails';
import { BANNER_ADS } from '@/lib/adsData';

export const revalidate = 60;

export default async function Page({ params }: { params: { id: string } }) {
  const wallpaper = await fetchWallpaperById(params.id);
  if (!wallpaper) notFound();

  const ad = BANNER_ADS.length
    ? BANNER_ADS[Math.floor(Math.random() * BANNER_ADS.length)]
    : undefined;

  return <WallpaperDetail initialWallpaper={wallpaper} ad={ad} />;
}
