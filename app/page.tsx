import { createClient } from '@/lib/supabase/server'
import WallpaperGallery from './WallpaperGallery'

export default async function Page() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('wallpapers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <>
      {/* Hidden SEO content — Google reads this, users don't see it */}
      <div style={{ display: 'none' }}>
        {(data ?? []).map(w => (
          <a key={w.id} href={`/details/${w.id}`}>
            <h2>{w.title}</h2>
            <p>{w.description}</p>
          </a>
        ))}
      </div>

      {/* Your working gallery — untouched */}
      <WallpaperGallery />
    </>
  )
}