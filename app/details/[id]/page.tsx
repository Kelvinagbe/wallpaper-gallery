import { fetchWallpaperById } from '@/lib/stores/wallpaperStore';
import { notFound } from 'next/navigation';
import WallpaperDetail from './WallpaperDetails';

export const revalidate = 60;

export default async function Page({ params }: { params: { id: string } }) {
  const wallpaper = await fetchWallpaperById(params.id);
  if (!wallpaper) notFound();
  return <WallpaperDetail initialWallpaper={wallpaper} />;
}
