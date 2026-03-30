import { createClient } from '@/lib/supabase/server';
import HotPageClient from './HotPageClient';

export const metadata = { title: 'Hot Right Now' };

const transformWallpaper = (wp: any) => ({
  id:          wp.id,
  url:         wp.image_url,
  thumbnail:   wp.thumbnail_url || wp.image_url,
  title:       wp.title,
  description: wp.description || '',
  tags:        wp.tags || [],
  downloads:   wp.downloads || 0,
  likes:       wp.likes || 0,
  views:       wp.views || 0,
  userId:      wp.user_id,
  category:    wp.category || 'Other',
  type:        wp.type || 'mobile',
  hot_score:   wp.hot_score,
});

export default async function HotPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('wallpapers_hot_cache')
    .select('*')
    .order('hot_score', { ascending: false })
    .limit(10);

  const wallpapers = (data ?? []).map(transformWallpaper);
  return <HotPageClient wallpapers={wallpapers} />;
}
