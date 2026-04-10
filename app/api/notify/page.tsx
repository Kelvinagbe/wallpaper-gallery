// app/api/notify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Get Firebase access token using service account credentials
async function getFirebaseAccessToken(): Promise<string> {
  const email = process.env.FIREBASE_CLIENT_EMAIL!
  const rawKey = process.env.FIREBASE_PRIVATE_KEY!
  const privateKey = rawKey.replace(/\\n/g, '\n')

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: email,
    sub: email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  }

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')

  const signingInput = `${encode(header)}.${encode(payload)}`

  // Import private key and sign
  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const binaryKey = Buffer.from(keyData, 'base64')
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(signingInput)
  )

  const jwt = `${signingInput}.${Buffer.from(signature).toString('base64url')}`

  // Exchange JWT for access token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const data = await res.json()
  if (!data.access_token) throw new Error('Failed to get Firebase access token')
  return data.access_token
}

// Send FCM data-only message to a single token
async function sendToToken(
  accessToken: string,
  token: string,
  data: Record<string, string>
): Promise<{ success: boolean; token: string; error?: string }> {
  const projectId = process.env.FIREBASE_PROJECT_ID!
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          // DATA-ONLY — no "notification" key so onMessageReceived always fires
          data,
          android: {
            priority: 'high',
          },
        },
      }),
    }
  )

  if (res.ok) return { success: true, token }
  const err = await res.json()
  const errorCode = err?.error?.details?.[0]?.errorCode ?? err?.error?.message ?? 'unknown'
  return { success: false, token, error: errorCode }
}

export async function POST(req: NextRequest) {
  try {
    // Simple admin key check — set NOTIFY_SECRET in Vercel env vars
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.NOTIFY_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { title, body: msgBody, image_url, images, channel, total } = body

    if (!title || !msgBody) {
      return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
    }

    // Fetch all FCM tokens from Supabase
    const { data: rows, error: dbError } = await supabase
      .from('fcm_tokens')
      .select('token')

    if (dbError) throw new Error(dbError.message)
    if (!rows || rows.length === 0) {
      return NextResponse.json({ message: 'No tokens found', sent: 0 })
    }

    const tokens = rows.map((r: { token: string }) => r.token)

    // Build data payload — all values must be strings for FCM data messages
    const data: Record<string, string> = {
      title,
      body: msgBody,
      channel: channel ?? 'walls_trending',
    }
    if (image_url) data.image_url = image_url
    if (images) data.images = images
    if (total) data.total = String(total)

    const accessToken = await getFirebaseAccessToken()

    // Send to all tokens in parallel (batch of 500 max recommended)
    const results = await Promise.all(
      tokens.map((token: string) => sendToToken(accessToken, token, data))
    )

    const succeeded = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success)

    // Remove invalid/unregistered tokens from Supabase
    const invalidTokens = failed
      .filter((r) => r.error?.includes('UNREGISTERED') || r.error?.includes('INVALID_ARGUMENT'))
      .map((r) => r.token)

    if (invalidTokens.length > 0) {
      await supabase.from('fcm_tokens').delete().in('token', invalidTokens)
    }

    return NextResponse.json({
      sent: succeeded,
      failed: failed.length,
      total: tokens.length,
      removedInvalid: invalidTokens.length,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Notify error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
