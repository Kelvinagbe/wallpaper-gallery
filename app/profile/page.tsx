import { createClient } from '@/lib/supabase/server';
import { getUserCounts, fetchUserWallpapers } from '@/lib/stores/wallpaperStore';
import { redirect } from 'next/navigation';
import ProfileClient from './ProfileClient';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const [stats, postsData] = await Promise.all([
    getUserCounts(user.id),
    fetchUserWallpapers(user.id, 0, 40),
  ]);

  return (
    <ProfileClient
      initialStats={stats}
      initialWallpapers={postsData.wallpapers}
    />
  );
}
