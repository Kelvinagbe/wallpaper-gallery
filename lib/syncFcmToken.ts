import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function syncFcmToken() {
  try {
    if (typeof window === 'undefined') return
    if (!window.WallsApp?.getFcmToken) return

    const token = window.WallsApp.getFcmToken()
    if (!token?.trim()) return

    // Get the currently logged-in user (nullable — guests are fine)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('fcm_tokens')
      .upsert(
        {
          token,
          user_id: user?.id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' }   // token is still the unique key
      )

    if (error) console.error('FCM token sync failed:', error.message)
    else console.log('FCM token synced ✅', user ? `(user: ${user.id})` : '(guest)')
  } catch (err) {
    console.error('syncFcmToken error:', err)
  }
}