import { createClient } from '@/utils/supabase/server'
import WallpaperGallery from './WallpaperGallery'
import type { Wallpaper } from './types'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const supabase = createClient()

  const { data } = await supabase
    .from('wallpapers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  const initialWallpapers: Wallpaper[] = data ?? []

  return <WallpaperGallery initialWallpapers={initialWallpapers} />
}