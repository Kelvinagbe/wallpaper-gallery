// lib/syncFcmToken.ts
// Call this once when your app loads, after the native bridge is ready.
// It saves the FCM token to Supabase so the server can send notifications.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function syncFcmToken() {
  try {
    // WallsApp is injected by the Android native bridge
    if (typeof window === 'undefined') return
    if (!window.WallsApp?.getFcmToken) return

    const token = window.WallsApp.getFcmToken()
    if (!token || token.trim() === '') return

    const { error } = await supabase
      .from('fcm_tokens')
      .upsert({ token }, { onConflict: 'token' })

    if (error) console.error('FCM token sync failed:', error.message)
    else console.log('FCM token synced ✅')
  } catch (err) {
    console.error('syncFcmToken error:', err)
  }
}
