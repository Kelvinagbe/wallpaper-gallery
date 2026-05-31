import { createClient } from '@/lib/supabase/server'  // ← fix this line
import WallpaperGallery from './WallpaperGallery'
import type { Wallpaper } from './types'

export default async function Page() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('wallpapers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  return <WallpaperGallery initialWallpapers={data ?? []} />
}