import { fetchWallpaperById } from '@/lib/stores/wallpaperStore';
import { notFound } from 'next/navigation';
import WallpaperDetail from './WallpaperDetails';
import { createClient } from '@/lib/supabase/server';
import type { Ad } from '@/app/types';

export const revalidate = 60;

export default async function Page({ params }: { params: { id: string } }) {
  const wallpaper = await fetchWallpaperById(params.id);
  if (!wallpaper) notFound();

  // Fetch a random active banner ad to show on the details page
  const supabase = await createClient();
  const { data: ads } = await supabase
    .from('ads')
    .select('*')
    .eq('adType', 'banner')
    .eq('active', true);

  const ad: Ad | undefined = ads?.length
    ? ads[Math.floor(Math.random() * ads.length)]
    : undefined;

  return <WallpaperDetail initialWallpaper={wallpaper} ad={ad} />;
}
